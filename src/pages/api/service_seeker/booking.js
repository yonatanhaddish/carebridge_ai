import dbConnect from "../../../lib/mongoose";
import Booking from "../../../models/Booking";
import ServiceSeeker from "../../../models/ServiceSeeker";
import ServiceProvider from "../../../models/ServiceProvider";
import { verifyToken } from "../../../lib/jwt";
import cookie from "cookie";
import axios from "axios";
import { parseISO, addDays, isAfter, format } from "date-fns";

// --- Helpers ---
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

// Returns true if `slot` fully covers `bookingSlot`
function fullyCovers(slot, bookingSlot) {
  return (
    toMinutes(slot.start) <= toMinutes(bookingSlot.start) &&
    toMinutes(slot.end) >= toMinutes(bookingSlot.end)
  );
}

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// --- AI Parsing ---
async function parseAI(command) {
  const res = await axios.post(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/ai/parseServiceSeekerCommand`,
    { command }
  );
  return res.data.parsed;
}

// --- Normalize AI Output ---
function normalizeScheduleEntries(parsedEntries) {
  return parsedEntries.map((entry) => {
    const normalizedEntry = {
      start_date: new Date(entry.start_date).toISOString(),
      end_date: new Date(entry.end_date).toISOString(),
      service_level: entry.service_level,
      recurring: [],
      time_slots: [],
      notes: entry.notes || "",
    };

    if (Array.isArray(entry.recurring) && entry.recurring.length > 0) {
      normalizedEntry.recurring = entry.recurring.map((daySchedule) => ({
        day: daySchedule.day,
        time_slots: Array.isArray(daySchedule.time_slots)
          ? daySchedule.time_slots.map((slot) => ({
              start: slot.start,
              end: slot.end,
            }))
          : [],
      }));
    }

    if (Array.isArray(entry.time_slots) && entry.time_slots.length > 0) {
      normalizedEntry.time_slots = entry.time_slots.map((slot) => ({
        start: slot.start,
        end: slot.end,
      }));
    }

    return normalizedEntry;
  });
}

// --- Expand recurring/single bookings into concrete dates ---
const WEEKDAY_MAP = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};
export function expandAvailability(availabilityArray) {
  const concrete = [];

  availabilityArray.forEach((entry) => {
    const startDate =
      entry.start_date instanceof Date
        ? entry.start_date
        : parseISO(entry.start_date);
    const endDate =
      entry.end_date instanceof Date
        ? entry.end_date
        : parseISO(entry.end_date);

    // --- Single-day availability ---
    if (entry.time_slots && entry.time_slots.length > 0) {
      for (
        let current = startDate;
        !isAfter(current, endDate);
        current = addDays(current, 1)
      ) {
        concrete.push({
          date: format(current, "yyyy-MM-dd"),
          time_slots: entry.time_slots.map((ts) => ({ ...ts })),
        });
      }
    }

    // --- Recurring availability ---
    if (entry.recurring && entry.recurring.length > 0) {
      entry.recurring.forEach((rec) => {
        if (!rec.day || !rec.time_slots || rec.time_slots.length === 0) return;

        // Only proceed if the day exists at least once in the range
        if (checkDayInDateRange(rec.day, startDate, endDate)) {
          for (
            let current = startDate;
            !isAfter(current, endDate);
            current = addDays(current, 1)
          ) {
            if (WEEKDAY_MAP[rec.day] === current.getDay()) {
              concrete.push({
                date: format(current, "yyyy-MM-dd"),
                time_slots: rec.time_slots.map((ts) => ({ ...ts })),
              });
            }
          }
        }
      });
    }
  });

  return concrete;
}

// --- Helper to check if a specific day falls within a date range ---
function checkDayInDateRange(day, startDate, endDate) {
  const daysOfWeek = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const dayIndex = daysOfWeek.indexOf(day);

  if (dayIndex === -1) return false;

  // Check if this day exists at least once in the date range
  const current = new Date(startDate);
  const end = new Date(endDate);

  while (current <= end) {
    if (current.getDay() === dayIndex) {
      return true;
    }
    current.setDate(current.getDate() + 1);
  }

  return false;
}

// --- Check provider availability ---
function isProviderAvailableForBooking(
  bookingEntry,
  providerConcreteAvailability
) {
  const bookingConcrete = expandAvailability([bookingEntry]);

  for (const dayBooking of bookingConcrete) {
    const matchingDate = providerConcreteAvailability.find(
      (avail) => avail.date === dayBooking.date
    );
    if (!matchingDate) return false;

    // Each time slot must be fully covered
    const allSlotsCovered = dayBooking.time_slots.every((bs) =>
      matchingDate.time_slots.some((ps) => fullyCovers(ps, bs))
    );
    if (!allSlotsCovered) return false;
  }

  return true;
}

// --- Create time string for datetime ---
function createDateTime(date, time) {
  const dateStr = format(date, "yyyy-MM-dd");
  const [hours, minutes] = time.split(":").map(Number);
  const dateTime = new Date(dateStr);
  dateTime.setHours(hours, minutes, 0, 0);
  return dateTime;
}

// --- API Handler ---
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

  let parsed;
  try {
    parsed = await parseAI(command);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return res
        .status(400)
        .json({ error: "AI returned invalid booking data" });
    }
  } catch (err) {
    console.error("AI Error:", err);
    return res
      .status(500)
      .json({ error: "AI parsing failed", details: err.message });
  }

  try {
    const normalizedEntries = normalizeScheduleEntries(parsed);
    const bookings = [];

    for (const entry of normalizedEntries) {
      const providers = await ServiceProvider.find({
        service_levels_offered: entry.service_level,
      }).lean();

      // Filter by distance <= 20km
      const providersNear = providers.filter(
        (p) =>
          haversineDistance(
            seeker.location_latitude,
            seeker.location_longitude,
            p.location_latitude,
            p.location_longitude
          ) <= 20
      );

      // Filter by availability
      const availableProviders = providersNear.filter((p) => {
        const concreteAvailability = expandAvailability(
          p.availability_calendar
        );
        return isProviderAvailableForBooking(entry, concreteAvailability);
      });

      // Sort by closest distance
      availableProviders.sort(
        (a, b) =>
          haversineDistance(
            seeker.location_latitude,
            seeker.location_longitude,
            a.location_latitude,
            a.location_longitude
          ) -
          haversineDistance(
            seeker.location_latitude,
            seeker.location_longitude,
            b.location_latitude,
            b.location_longitude
          )
      );

      const selectedProvider = availableProviders[0];

      if (!selectedProvider) {
        console.log(`No provider available for ${entry.service_level}`);
        continue; // Skip this entry if no provider available
      }

      // Get actual price from provider
      const servicePrices = selectedProvider.service_prices || {};
      const price = servicePrices[entry.service_level] ?? 100; // Fallback to 100 if no price set

      const startDate = parseISO(entry.start_date);
      const endDate = parseISO(entry.end_date);

      // Build booking data
      const bookingData = {
        service_seeker_id: seeker.service_seeker_id,
        service_provider_id: selectedProvider.service_provider_id,
        service_level: entry.service_level,
        price,
        status: "Pending",
        request_created_at: new Date(),
        notes: entry.notes || "",
        location_address: seeker.home_address,
        location_postal_code: seeker.postal_code,
        location_latitude: seeker.location_latitude,
        location_longitude: seeker.location_longitude,
        confirmation_deadline: addDays(new Date(), 3),
        confirmed_at: null,
        cancelled_at: null,
      };

      // Handle recurring vs one-time booking
      if (entry.recurring && entry.recurring.length > 0) {
        // This is a recurring booking
        bookingData.recurring_booking = {
          start_date: startDate,
          end_date: endDate,
          recurring: entry.recurring,
        };
      } else if (entry.time_slots && entry.time_slots.length > 0) {
        // This is a one-time booking
        const firstSlot = entry.time_slots[0];
        bookingData.start_datetime = createDateTime(startDate, firstSlot.start);
        bookingData.end_datetime = createDateTime(startDate, firstSlot.end);
      } else {
        // If no specific time slots, use the date range
        bookingData.start_datetime = startDate;
        bookingData.end_datetime = endDate;
      }

      console.log(
        "Creating booking with data:",
        JSON.stringify(bookingData, null, 2)
      );

      try {
        const booking = await Booking.create(bookingData);
        bookings.push(booking);
        console.log("Booking created successfully:", booking.booking_id);
      } catch (dbError) {
        console.error("Database error creating booking:", dbError);
        // Continue with other entries even if one fails
      }
    }

    if (bookings.length === 0) {
      return res.status(404).json({
        error: "No bookings created",
        details:
          "No available providers found for any of the requested bookings",
      });
    }

    return res.status(201).json({
      success: true,
      bookings: bookings.map((b) => ({
        booking_id: b.booking_id,
        service_level: b.service_level,
        price: b.price,
        status: b.status,
        recurring_booking: b.recurring_booking,
        start_datetime: b.start_datetime,
        end_datetime: b.end_datetime,
        confirmation_deadline: b.confirmation_deadline,
      })),
      total_created: bookings.length,
    });
  } catch (err) {
    console.error("Booking Creation Error:", err);
    return res
      .status(500)
      .json({ error: "Booking creation failed", details: err.message });
  }
}
