import dbConnect from "@/lib/db";
import ServiceProvider from "@/models/ServiceProvider";
import jwt from "jsonwebtoken";
import cookie from "cookie";

// --- HELPER 1: Time to Minutes (for math comparison) ---
function getMinutes(timeStr) {
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
}

// --- HELPER 2: Check Time Overlap ---
function doTimesClash(startA, endA, startB, endB) {
  const sA = getMinutes(startA);
  const eA = getMinutes(endA);
  const sB = getMinutes(startB);
  const eB = getMinutes(endB);
  return sA < eB && sB < eA; // The standard overlap formula
}

// --- HELPER 3: Check Date/Day Overlap (The "UTC" Logic) ---
function doRulesOverlap(newDateStr, existingRule) {
  const checkDate = new Date(newDateStr); // The date user wants to book

  // A. Check against a "Specific Date" rule
  if (existingRule.type === "specific_date") {
    // Check if the requested date falls within the existing specific range
    return (
      checkDate >= new Date(existingRule.startDate) &&
      checkDate <= new Date(existingRule.endDate)
    );
  }

  // B. Check against a "Recurring" rule (e.g., Every Monday)
  if (existingRule.type === "recurring") {
    const checkStart = new Date(existingRule.startDate);
    const checkEnd = new Date(existingRule.endDate);

    // 1. Is it within the valid date range (e.g., Jan 1 to Dec 31)?
    if (checkDate < checkStart || checkDate > checkEnd) return false;

    // 2. Is it the correct day of the week? (UTC Safe)
    const dayOfWeek = checkDate.getUTCDay();
    return existingRule.daysOfWeek.includes(dayOfWeek);
  }

  return false;
}

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method Not Allowed" });

  // 1. Auth Check
  let userId;
  try {
    const cookies = cookie.parse(req.headers.cookie || "");
    const token = cookies.token;
    if (!token) return res.status(401).json({ error: "Unauthorized" });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    userId = decoded.userId;
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }

  const { action, bookingData } = req.body;

  try {
    await dbConnect();
    const userProfile = await ServiceProvider.findOne({ user_id: userId });

    if (!userProfile)
      return res.status(404).json({ error: "Profile not found" });

    const existingRules = userProfile.availability_calendar?.schedules || [];
    const conflicts = [];
    const newRulesToSave = [];

    // 2. Process Incoming Slots (The "Adapter" Step)
    if (action === "add" && bookingData && Array.isArray(bookingData)) {
      for (const reqSlot of bookingData) {
        // Extract data from Frontend format
        const targetDate = reqSlot.start_date; // "YYYY-MM-DD"
        // Frontend sends recurring array, but logic implies single slots here.
        // We take the first time slot.
        const timeSlot = reqSlot.recurring[0].time_slots[0];
        const reqStart = timeSlot.start;
        const reqEnd = timeSlot.end;

        let hasConflict = false;

        // 3. Conflict Check against Database
        for (const oldRule of existingRules) {
          // Does the Date overlap?
          if (doRulesOverlap(targetDate, oldRule)) {
            // Does the Time overlap?
            for (const oldSlot of oldRule.slots) {
              if (
                doTimesClash(
                  reqStart,
                  reqEnd,
                  oldSlot.startTime,
                  oldSlot.endTime
                )
              ) {
                hasConflict = true;

                // Add to conflicts array for Frontend display
                conflicts.push({
                  message: `Conflict on ${targetDate}`,
                  requestedTime: `${reqStart} - ${reqEnd}`,
                  existingTime: `${oldSlot.startTime} - ${oldSlot.endTime}`,
                });
              }
            }
          }
        }

        // 4. If No Conflict, Prepare for Saving
        if (!hasConflict) {
          // Convert Frontend format -> Database Schema format
          newRulesToSave.push({
            type: "specific_date", // Frontend picker creates specific dates
            startDate: new Date(targetDate),
            endDate: new Date(targetDate), // Single day
            daysOfWeek: [],
            slots: [{ startTime: reqStart, endTime: reqEnd }],
          });
        }
      }
    }

    // 5. Response Handling
    if (conflicts.length > 0) {
      // If ANY conflicts exist, we stop and return them (Atomic safety)
      // Note: We return success: false so the frontend triggers the error notification
      return res.status(200).json({
        success: false,
        message: `${conflicts.length} conflict(s) detected.`,
        conflicts: conflicts,
      });
    }

    // 6. Save Valid Rules
    if (newRulesToSave.length > 0) {
      await ServiceProvider.findOneAndUpdate(
        { user_id: userId },
        {
          $push: {
            "availability_calendar.schedules": { $each: newRulesToSave },
          },
        }
      );
    }

    return res.status(200).json({
      success: true,
      message: "Availability updated successfully!",
      addedCount: newRulesToSave.length,
    });
  } catch (error) {
    console.error("Calendar Update Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
