import dbConnect from "@/lib/db";
import ServiceProvider from "@/models/ServiceProvider";
import ServiceSeeker from "@/models/ServiceSeeker";
import Booking from "@/models/Booking";
import { authMiddleware } from "@/lib/auth";

// --- HELPER 1: Convert "HH:MM" to Minutes ---
function getMinutes(timeStr, explicitCrossesMidnight = false) {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(":").map(Number);
  let totalMinutes = h * 60 + m;
  if (explicitCrossesMidnight) totalMinutes += 1440;
  return totalMinutes;
}

// --- HELPER 2: Availability Containment Check ---
function isTimeContained(providerSlot, reqSlot) {
  const pStart = getMinutes(providerSlot.startTime);
  const pEnd = getMinutes(providerSlot.endTime, providerSlot.crossesMidnight);
  const rStart = getMinutes(reqSlot.startTime);

  // Auto-detect midnight crossing for the request
  let rEndRaw = getMinutes(reqSlot.endTime);
  const rCrosses = reqSlot.crossesMidnight || rEndRaw < rStart;
  const rEnd = getMinutes(reqSlot.endTime, rCrosses);

  return pStart <= rStart && pEnd >= rEnd;
}

// --- HELPER 3: Strict Date Range Check ---
function isDateRangeValid(schedule, reqStartDate, reqEndDate, reqDaysOfWeek) {
  const provStart = new Date(schedule.startDate);
  const provEnd = new Date(schedule.endDate);
  const rStart = new Date(reqStartDate);
  const rEnd = new Date(reqEndDate);

  rStart.setUTCHours(0, 0, 0, 0);
  rEnd.setUTCHours(0, 0, 0, 0);
  provStart.setUTCHours(0, 0, 0, 0);
  provEnd.setUTCHours(0, 0, 0, 0);

  if (rStart < provStart || rEnd > provEnd) return false;

  if (reqDaysOfWeek && reqDaysOfWeek.length > 0) {
    if (schedule.type !== "recurring") return false;
    const allDaysCovered = reqDaysOfWeek.every((day) =>
      schedule.daysOfWeek.includes(day)
    );
    if (!allDaysCovered) return false;
  } else {
    if (schedule.type === "recurring") {
      const reqDayIndex = rStart.getUTCDay();
      if (!schedule.daysOfWeek.includes(reqDayIndex)) return false;
    }
  }
  return true;
}

// --- HELPER 4: Overlap Check for Recurring Days ---
function doDaysOverlap(reqDays, existingDays) {
  if (!reqDays || reqDays.length === 0) return true;
  if (!existingDays || existingDays.length === 0) return true;
  return reqDays.some((day) => existingDays.includes(day));
}

async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method Not Allowed" });

  const { userId } = req.user;
  const { service_level, max_distance_km, schedules, location_query } =
    req.body;

  try {
    await dbConnect();
    const seeker = await ServiceSeeker.findOne({ user_id: userId });
    if (!seeker || !seeker.location)
      return res.status(404).json({ error: "Seeker profile incomplete." });

    const primaryReq = schedules[0];
    if (!primaryReq)
      return res.status(400).json({ error: "No schedule specified." });

    const reqStartDate = new Date(primaryReq.startDate);
    const reqEndDate = new Date(primaryReq.endDate);
    const reqDaysOfWeek = primaryReq.daysOfWeek || [];

    // --- CALCULATE CONSTRAINT DAYS ---
    // If specific date (March 12), this becomes [4] (Thursday)
    let constraintDays = [...reqDaysOfWeek];
    if (constraintDays.length === 0) {
      let dCurr = new Date(reqStartDate);
      dCurr.setUTCHours(0, 0, 0, 0);
      const dEnd = new Date(reqEndDate);
      dEnd.setUTCHours(0, 0, 0, 0);

      while (dCurr <= dEnd) {
        constraintDays.push(dCurr.getUTCDay());
        dCurr.setUTCDate(dCurr.getUTCDate() + 1);
      }
    }

    const reqSlots = primaryReq.slots.map((slot) => {
      const start = getMinutes(slot.startTime);
      const end = getMinutes(slot.endTime);
      return { ...slot, crossesMidnight: end < start };
    });

    if (reqSlots.length === 0)
      return res.status(400).json({ error: "No time slots provided." });

    // --- CHECK 1: USER CONFLICTS ---
    const userConflicts = await Booking.find({
      service_seeker_id: seeker.service_seeker_id,
      status: { $in: ["Confirmed", "Pending"] },
      start_date: { $lte: reqEndDate },
      end_date: { $gte: reqStartDate },
      $or: reqSlots.map((rSlot) => ({
        "slots.startTime": { $lt: rSlot.endTime },
        "slots.endTime": { $gt: rSlot.startTime },
      })),
    });

    // ✅ FIXED: Use constraintDays (e.g. [4]) instead of reqDaysOfWeek (e.g. [])
    // This ensures Thursday [4] doesn't clash with Wed/Sat [3,6]
    const actualUserConflict = userConflicts.find((b) =>
      doDaysOverlap(constraintDays, b.days_of_week)
    );

    if (actualUserConflict) {
      return res.status(409).json({
        error: "Double Booking Detected",
        message:
          "You already have a booking overlapping with one of these times.",
        conflicting_booking_id: actualUserConflict.booking_id,
      });
    }

    const requestedLevel = service_level || "Level 1";
    const distanceMeters = (max_distance_km || 30) * 1000;

    // --- FIND CANDIDATES ---
    const candidates = await ServiceProvider.find({
      service_level: requestedLevel,
      location: {
        $near: {
          $geometry: seeker.location,
          $maxDistance: distanceMeters,
        },
      },
    }).limit(10);

    if (candidates.length === 0)
      return res.status(404).json({ error: "No providers found nearby." });

    // --- VETTING LOOP ---
    let bestProvider = null;
    let correctRate = 25;

    for (const provider of candidates) {
      // Check Availability
      const workingSchedule = provider.availability_calendar?.schedules?.find(
        (schedule) => {
          if (
            !isDateRangeValid(schedule, reqStartDate, reqEndDate, reqDaysOfWeek)
          )
            return false;

          const allSlotsCovered = reqSlots.every((reqSlot) => {
            return schedule.slots.some((provSlot) =>
              isTimeContained(provSlot, reqSlot)
            );
          });
          return allSlotsCovered;
        }
      );

      if (!workingSchedule) continue;

      // Check Provider Conflict
      const potentialConflicts = await Booking.find({
        service_provider_id: provider.service_provider_id,
        status: { $in: ["Confirmed", "Pending", "Completed"] },
        start_date: { $lte: reqEndDate },
        end_date: { $gte: reqStartDate },
        $or: reqSlots.map((rSlot) => ({
          "slots.startTime": { $lt: rSlot.endTime },
          "slots.endTime": { $gt: rSlot.startTime },
        })),
      });

      // ✅ FIXED: Use constraintDays here as well
      const hasRealConflict = potentialConflicts.some((b) =>
        doDaysOverlap(constraintDays, b.days_of_week)
      );

      if (hasRealConflict) continue;

      // Winner Found
      bestProvider = provider;
      if (provider.hourly_rates) {
        correctRate =
          typeof provider.hourly_rates.get === "function"
            ? provider.hourly_rates.get(requestedLevel)
            : provider.hourly_rates[requestedLevel];
      }
      break;
    }

    if (!bestProvider)
      return res
        .status(404)
        .json({
          error: "Providers found, but none available for all requested times.",
        });

    // --- CREATE BOOKING ---
    const newBooking = {
      service_seeker_id: seeker.service_seeker_id,
      service_provider_id: bestProvider.service_provider_id,
      service_level: requestedLevel,
      status: "Pending",
      hourly_rate: correctRate || 25,
      booking_type: primaryReq.type,
      start_date: reqStartDate,
      end_date: reqEndDate,
      days_of_week: reqDaysOfWeek, // Keep original (empty if specific date)
      slots: reqSlots,
      location: {
        address: location_query || seeker.home_address,
        postal_code: seeker.location.postal_code,
        type: "Point",
        coordinates: seeker.location.coordinates,
      },
      notes: `${
        seeker.email
      } AI booked multi-slot at ${new Date().toLocaleString()}`,
    };

    const savedBooking = await Booking.create(newBooking);

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
