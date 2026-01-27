import dbConnect from "@/lib/db";
import ServiceProvider from "@/models/ServiceProvider";
import ServiceSeeker from "@/models/ServiceSeeker";
import Booking from "@/models/Booking";
import { authMiddleware } from "@/lib/auth";

// --- HELPER 1: Convert "HH:MM" to Minutes (Bulletproof) ---
function getMinutes(timeStr, explicitCrossesMidnight = false) {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(":").map(Number);
  let totalMinutes = h * 60 + m;

  // Use the explicit flag from DB if available
  if (explicitCrossesMidnight) totalMinutes += 1440;

  return totalMinutes;
}

// --- HELPER 2: Availability Containment Check ---
// Does the Provider's shift (P) fully enclose the Request (R)?
function isTimeContained(providerSlot, reqSlot) {
  const pStart = getMinutes(providerSlot.startTime);
  const pEnd = getMinutes(providerSlot.endTime, providerSlot.crossesMidnight);

  const rStart = getMinutes(reqSlot.startTime);

  // Auto-detect midnight crossing for the request if not explicitly set
  let rEndRaw = getMinutes(reqSlot.endTime);
  const rCrosses = reqSlot.crossesMidnight || rEndRaw < rStart;
  const rEnd = getMinutes(reqSlot.endTime, rCrosses);

  // Logic: Provider starts before (or at) request, AND ends after (or at) request
  return pStart <= rStart && pEnd >= rEnd;
}

// --- HELPER 3: Strict Date Range Check (The Fix 🛡️) ---
// Ensures the User's requested range fits COMPLETELY inside the Provider's rule
function isDateRangeValid(schedule, reqStartDate, reqEndDate) {
  // 1. Recurring Rule Check
  // Even for recurring, the specific dates requested must fall within the "Validity Window" of the rule
  // e.g. "I work Mondays (from Jan 1 to Mar 1)"
  if (schedule.type === "recurring") {
    // Check if the Day of Week matches the START date
    const reqDayIndex = reqStartDate.getUTCDay();
    if (!schedule.daysOfWeek.includes(reqDayIndex)) return false;
  }

  // 2. Strict Range Containment (For both Recurring and Specific Date)
  const provStart = new Date(schedule.startDate);
  const provEnd = new Date(schedule.endDate);

  // Normalize to remove time (00:00:00) to compare dates strictly
  const rStart = new Date(reqStartDate);
  const rEnd = new Date(reqEndDate);
  rStart.setUTCHours(0, 0, 0, 0);
  rEnd.setUTCHours(0, 0, 0, 0);
  provStart.setUTCHours(0, 0, 0, 0);
  provEnd.setUTCHours(0, 0, 0, 0);

  // Logic: User Start >= Provider Start AND User End <= Provider End
  return rStart >= provStart && rEnd <= provEnd;
}

async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method Not Allowed" });

  const { userId } = req.user;
  const { service_level, max_distance_km, schedules, location_query } =
    req.body;

  try {
    await dbConnect();

    // 1. Get Seeker
    const seeker = await ServiceSeeker.findOne({ user_id: userId });
    if (!seeker || !seeker.location)
      return res.status(404).json({ error: "Seeker profile incomplete." });

    // 2. Parse User Request
    const primaryReq = schedules[0];
    if (!primaryReq)
      return res.status(400).json({ error: "No schedule specified." });

    // Normalize Request Dates (Start AND End)
    const reqStartDate = new Date(primaryReq.startDate);
    const reqEndDate = new Date(primaryReq.endDate); // <--- Critical for Range Check

    const reqSlot = primaryReq.slots[0] || {
      startTime: "09:00",
      endTime: "17:00",
    };

    // Auto-fix midnight flag
    const reqStartMin = getMinutes(reqSlot.startTime);
    const reqEndMinRaw = getMinutes(reqSlot.endTime);
    if (reqEndMinRaw < reqStartMin) reqSlot.crossesMidnight = true;

    // Check if YOU (the user) already have a booking at this time
    const existingSelfBooking = await Booking.findOne({
      service_seeker_id: seeker.service_seeker_id,
      status: { $in: ["Confirmed", "Pending"] }, // Ignore Cancelled/Rejected

      // Date Overlap
      start_date: { $lte: reqEndDate },
      end_date: { $gte: reqStartDate },

      // Time Slot Overlap
      $or: [
        {
          "slots.startTime": { $lt: reqSlot.endTime },
          "slots.endTime": { $gt: reqSlot.startTime },
        },
      ],
    });

    if (existingSelfBooking) {
      return res.status(409).json({
        error: "Double Booking Detected",
        message: "You already have a booking for this time slot.",
        conflicting_booking_id: existingSelfBooking.booking_id,
      });
    }

    const requestedLevel = service_level || "Level 1";
    const distanceMeters = (max_distance_km || 20) * 1000;

    // 3. Find Candidates (Location & Level)
    const candidates = await ServiceProvider.find({
      service_level: requestedLevel,
      location: {
        $near: {
          $geometry: seeker.location,
          $maxDistance: distanceMeters,
        },
      },
    }).limit(10);

    if (candidates.length === 0) {
      return res
        .status(404)
        .json({ error: "No providers found nearby with that skill level." });
    }

    // 4. Vetting Loop
    let bestProvider = null;
    let correctRate = 25;

    for (const provider of candidates) {
      // --- CHECK A: IS PROVIDER WORKING? (Availability) ---
      const workingSchedule = provider.availability_calendar?.schedules?.find(
        (schedule) => {
          // 1. Check Strict Date Range (Now passes End Date too)
          if (!isDateRangeValid(schedule, reqStartDate, reqEndDate))
            return false;

          // 2. Check Time Match
          return schedule.slots.some((pSlot) =>
            isTimeContained(pSlot, reqSlot)
          );
        }
      );

      if (!workingSchedule) {
        continue;
      }

      // --- CHECK B: IS PROVIDER BOOKED? (Conflict) ---
      const conflictCount = await Booking.countDocuments({
        service_provider_id: provider.service_provider_id,
        status: { $in: ["Confirmed", "Pending", "Completed"] },

        // Date Overlap
        start_date: { $lte: reqEndDate },
        end_date: { $gte: reqStartDate },

        // Time Slot Overlap
        $or: [
          {
            "slots.startTime": { $lt: reqSlot.endTime },
            "slots.endTime": { $gt: reqSlot.startTime },
          },
        ],
      });

      if (conflictCount > 0) {
        continue;
      }

      // ✅ WINNER FOUND
      bestProvider = provider;
      if (provider.hourly_rates) {
        if (typeof provider.hourly_rates.get === "function") {
          correctRate = provider.hourly_rates.get(requestedLevel);
        } else {
          correctRate = provider.hourly_rates[requestedLevel];
        }
      }
      break;
    }

    if (!bestProvider) {
      return res
        .status(404)
        .json({ error: "Providers found nearby, but none are available." });
    }

    // 5. Create Booking Object
    const newBooking = {
      service_seeker_id: seeker.service_seeker_id,
      service_provider_id: bestProvider.service_provider_id,
      service_level: requestedLevel,
      status: "Pending",
      hourly_rate: correctRate || 25,
      booking_type: primaryReq.type,
      start_date: reqStartDate,
      end_date: reqEndDate,
      days_of_week: primaryReq.daysOfWeek || [],
      slots: [reqSlot],
      location: {
        address: location_query || seeker.home_address,
        postal_code: seeker.location.postal_code,
        type: "Point",
        coordinates: seeker.location.coordinates,
      },
      notes: "Auto-booked via AI",
    };

    // Note: Uncomment to enable saving
    const savedBooking = await Booking.create(newBooking);
    console.log("New Booking Details:", savedBooking);
    return res.status(201).json({
      success: true,
      message: "Match found!",
      provider: `${bestProvider.first_name} ${bestProvider.last_name}`,
      booking_details: savedBooking,
    });
  } catch (error) {
    console.error("Auto-Book Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

export default authMiddleware(handler);
