import dbConnect from "../../../lib/mongoose";
import mongoose from "mongoose";
import ServiceProvider from "../../../models/ServiceProvider";
import Booking from "../../../models/Booking";
import ServiceSeeker from "../../../models/ServiceSeeker";
import { verifyToken } from "../../../lib/jwt";
import cookie from "cookie";
import axios from "axios";

// --- HELPERS ---
function getUserFromRequest(req) {
  const cookies = req.headers.cookie ? cookie.parse(req.headers.cookie) : {};
  const token = cookies.token;
  if (!token) return null;
  return verifyToken(token);
}

function toMinutes(t) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function distanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// --- CHECK PROVIDER AVAILABILITY ---
function checkProviderAvailability(provider, entry) {
  if (!provider.service_levels_offered.includes(entry.service_level)) {
    return {
      available: false,
      reason: `Provider doesn't offer ${entry.service_level}`,
    };
  }

  if (
    !provider.availability_calendar ||
    provider.availability_calendar.length === 0
  ) {
    return {
      available: false,
      reason: "Provider has no availability schedule",
    };
  }

  const entryStart = new Date(entry.start_date);
  const entryEnd = new Date(entry.end_date);

  const overlappingBlocks = provider.availability_calendar.filter((block) => {
    const blockStart = new Date(block.start_date);
    const blockEnd = new Date(block.end_date);
    return entryStart >= blockStart && entryEnd <= blockEnd;
  });

  if (overlappingBlocks.length === 0) {
    return {
      available: false,
      reason: "No availability block covers the requested date range",
    };
  }

  for (const reqDay of entry.recurring) {
    const dayName = reqDay.day;
    const timeSlots = reqDay.time_slots || [];
    let dayAvailable = false;

    for (const block of overlappingBlocks) {
      const daySchedule = block.recurring.find((r) => r.day === dayName);
      if (daySchedule && daySchedule.time_slots) {
        const allSlotsFit = timeSlots.every((reqSlot) =>
          daySchedule.time_slots.some(
            (availSlot) =>
              toMinutes(reqSlot.start) >= toMinutes(availSlot.start) &&
              toMinutes(reqSlot.end) <= toMinutes(availSlot.end)
          )
        );
        if (allSlotsFit) {
          dayAvailable = true;
          break;
        }
      }
    }

    if (!dayAvailable) {
      return { available: false, reason: `Time slot conflict on ${dayName}` };
    }
  }

  return { available: true };
}

// --- CHECK EXISTING BOOKINGS ---
async function checkExistingBookingConflicts(provider, entry, seeker) {
  const existingBookings = await Booking.find({
    service_provider_id: provider.service_provider_id,
    status: { $in: ["Pending", "Confirmed"] },
  }).lean();

  for (const reqDay of entry.recurring) {
    const dayName = reqDay.day;
    const timeSlots = reqDay.time_slots || [];

    for (const booking of existingBookings) {
      if (!booking.recurring) continue;
      const matchedDay = booking.recurring.find((r) => r.day === dayName);
      if (matchedDay) {
        for (const slot of timeSlots) {
          for (const existingSlot of matchedDay.time_slots) {
            const overlap =
              toMinutes(slot.start) < toMinutes(existingSlot.end) &&
              toMinutes(slot.end) > toMinutes(existingSlot.start);
            if (overlap) {
              let reason = `Conflict on ${dayName} during ${slot.start}-${slot.end}`;
              if (booking.service_seeker_id === seeker.service_seeker_id) {
                reason = `Duplicate request with same provider on ${dayName}, ${slot.start}-${slot.end}`;
              }
              return { hasConflict: true, reason };
            }
          }
        }
      }
    }
  }

  return { hasConflict: false };
}

// --- HELPER: GENERATE RECURRING ARRAY FROM DATE RANGE ---
// --- Safe UTC date parser ---
function safeUTCDate(dateStr) {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0)); // noon UTC to avoid timezone issues
}

// --- Generate recurring array from date range (UTC-aware) ---
function generateRecurringFromRange(entry) {
  const daysOfWeek = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  const start = safeUTCDate(entry.start_date);
  const end = safeUTCDate(entry.end_date);
  const time_slots = entry.recurring?.[0]?.time_slots || [];

  const recurringArray = [];
  const current = new Date(start);
  const finalEnd = new Date(end);
  finalEnd.setUTCDate(finalEnd.getUTCDate() + 1); // make end date inclusive

  while (current < finalEnd) {
    recurringArray.push({
      day: daysOfWeek[current.getUTCDay()],
      time_slots: JSON.parse(JSON.stringify(time_slots)),
    });
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return recurringArray;
}

// --- CREATE SINGLE BOOKING WITH RECURSION ---
async function createBookingWithRecursion(provider, entry, seeker, session) {
  const bookingDoc = {
    service_provider_id: provider.service_provider_id,
    service_seeker_id: seeker.service_seeker_id,
    service_level: entry.service_level,
    price: provider.service_prices?.[entry.service_level] || 0,
    start_date: entry.start_date,
    end_date: entry.end_date,
    recurring: generateRecurringFromRange(entry),
    status: "Pending",
    location_address: entry.location.home_address,
    location_postal_code: entry.location.postal_code,
    location_latitude: entry.location.location_latitude,
    location_longitude: entry.location.location_longitude,
    request_created_at: new Date(),
    confirmation_deadline: new Date(Date.now() + 12 * 60 * 60 * 1000),
  };

  const created = await Booking.create([bookingDoc], { session });
  return created[0];
}

// --- MAIN HANDLER ---
export default async function handler(req, res) {
  await dbConnect();

  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const user = getUserFromRequest(req);
  if (!user) return res.status(401).json({ error: "Not authenticated" });

  const { command } = req.body;
  if (!command) return res.status(400).json({ error: "Command required" });

  const seeker = await ServiceSeeker.findOne({ user_id: user.user_id }).lean();
  if (!seeker)
    return res.status(404).json({ error: "Service seeker not found" });

  let parsedEntries;
  try {
    const aiRes = await axios.post(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/ai/parseServiceSeekerCommand`,
      { command, userLocation: seeker }
    );
    parsedEntries = aiRes.data.parsed || [];
  } catch (err) {
    console.error("AI Parsing Error:", err);
    return res
      .status(500)
      .json({ error: "Failed to parse command", details: err.message });
  }

  const results = { successful: [], failed: [], totalBookingsCreated: 0 };

  for (const entry of parsedEntries) {
    const providers = await ServiceProvider.find({
      service_levels_offered: entry.service_level,
    }).lean();

    const providersWithDistance = providers
      .map((p) => ({
        provider: p,
        distance: distanceKm(
          seeker.location_latitude,
          seeker.location_longitude,
          p.location_latitude,
          p.location_longitude
        ),
      }))
      .filter((p) => p.distance <= 30)
      .sort((a, b) => a.distance - b.distance);

    let booked = null;

    for (const { provider } of providersWithDistance) {
      const availability = checkProviderAvailability(provider, entry);
      if (!availability.available) continue;

      const conflictCheck = await checkExistingBookingConflicts(
        provider,
        entry,
        seeker
      );
      if (conflictCheck.hasConflict) {
        results.failed.push({ entry, reason: conflictCheck.reason });
        booked = "duplicate";
        break;
      }

      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        const booking = await createBookingWithRecursion(
          provider,
          entry,
          seeker,
          session
        );
        await session.commitTransaction();
        session.endSession();

        booked = booking;
        results.successful.push({
          provider: {
            id: provider.service_provider_id,
            name: `${provider.first_name} ${provider.last_name}`,
          },
          entry,
          bookingId: booking._id,
        });
        results.totalBookingsCreated += 1;
        break;
      } catch (err) {
        await session.abortTransaction();
        session.endSession();
        continue;
      }
    }

    if (!booked) {
      results.failed.push({
        entry,
        reason: "No provider available or conflict detected",
      });
    }
  }

  res.status(200).json({
    success: results.successful.length > 0,
    message:
      results.successful.length === parsedEntries.length
        ? `✅ All requests booked successfully`
        : `⚠️ Partial success: ${results.successful.length} of ${parsedEntries.length} requests booked`,
    results,
    summary: {
      totalRequests: parsedEntries.length,
      successful: results.successful.length,
      failed: results.failed.length,
      totalBookingsCreated: results.totalBookingsCreated,
    },
  });
}
