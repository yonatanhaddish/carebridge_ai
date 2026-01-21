import dbConnect from "@/lib/db";
import ServiceProvider from "@/models/ServiceProvider";
import jwt from "jsonwebtoken";
import cookie from "cookie";
import { addDays, getDay } from "date-fns";

// --- HELPER 1: Convert "HH:MM" to Minutes (Handles Midnight!) ---
function getMinutes(timeStr, crossesMidnight = false) {
  const [h, m] = timeStr.split(":").map(Number);
  let totalMinutes = h * 60 + m;

  // If it crosses midnight (e.g., 2am becomes 26:00), add 24 hours (1440 mins)
  if (crossesMidnight) {
    totalMinutes += 1440;
  }
  return totalMinutes;
}

// --- HELPER 2: Check if Two Time Ranges Clash ---
function doTimesClash(slotA, slotB) {
  const startA = getMinutes(slotA.startTime);
  const endA = getMinutes(slotA.endTime, slotA.crossesMidnight);

  const startB = getMinutes(slotB.startTime);
  const endB = getMinutes(slotB.endTime, slotB.crossesMidnight);

  // Standard Overlap Logic: (StartA < EndB) && (StartB < EndA)
  return startA < endB && startB < endA;
}

// --- HELPER 3: Check if Days Overlap (THE FIX 🛠️) ---
// This now correctly handles multi-day "Specific Date" ranges
// --- HELPER 3: Check if Days Overlap (Fixed for Timezones 🌎) ---
function doDaysOverlap(ruleA, ruleB) {
  // Internal helper to get all day numbers (0-6) for a rule
  const getDaysFromRule = (rule) => {
    // A. Recurring: User explicit preference (e.g., "Mondays" = [1])
    if (rule.type === "recurring") {
      return rule.daysOfWeek;
    }

    // B. Specific Date: Calculate based on the date string
    // CRITICAL FIX: Use UTC methods to avoid timezone shifts (Saturday vs Sunday)
    let days = new Set();

    // Create new Date objects to avoid mutating the originals
    let current = new Date(rule.startDate);
    const end = new Date(rule.endDate);

    // Loop through dates
    while (current <= end) {
      // 🛑 FIX: Use getUTCDay() instead of getDay()
      // This ensures 2032-12-12 is ALWAYS 0 (Sunday), even in Toronto.
      days.add(current.getUTCDay());

      // Move to next day (UTC safe increment)
      current.setUTCDate(current.getUTCDate() + 1);
    }
    return Array.from(days);
  };

  const daysListA = getDaysFromRule(ruleA);
  const daysListB = getDaysFromRule(ruleB);

  // Check intersection
  return daysListA.some((day) => daysListB.includes(day));
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

  const { schedules, mode = "append" } = req.body;

  try {
    await dbConnect();

    // 2. Fetch User & Current Availability
    const userProfile = await ServiceProvider.findOne({ user_id: userId });
    if (!userProfile)
      return res.status(404).json({ error: "Profile not found" });

    // 3. Normalize New Rules (Ensure Dates are Objects)
    const newRules = schedules.map((rule) => ({
      ...rule,
      startDate: new Date(rule.startDate),
      endDate: new Date(rule.endDate),
    }));

    // 4. CONFLICT CHECKING (Only if Appending)
    if (mode === "append") {
      const existingRules = userProfile.availability_calendar?.schedules || [];

      for (const newRule of newRules) {
        for (const oldRule of existingRules) {
          // FUNNEL 1: DATE RANGE CHECK
          // Do the date ranges touch at all?
          const rangeOverlaps =
            newRule.startDate <= oldRule.endDate &&
            oldRule.startDate <= newRule.endDate;

          if (!rangeOverlaps) continue; // Safe! Check next rule.

          // FUNNEL 2: DAY OF WEEK CHECK (Now Robust!)
          // Do they happen on the same weekdays?
          if (!doDaysOverlap(newRule, oldRule)) continue; // Safe! Different days.

          // FUNNEL 3: TIME SLOT CHECK
          // Do the specific hours clash?
          for (const newSlot of newRule.slots) {
            for (const oldSlot of oldRule.slots) {
              if (doTimesClash(newSlot, oldSlot)) {
                // --- CONFLICT DETECTED! ---
                return res.status(409).json({
                  error: "Conflict Detected",
                  message: `You are already available on ${oldRule.startDate.toDateString()} between ${
                    oldSlot.startTime
                  } and ${oldSlot.endTime}.`,
                  conflictRule: oldRule,
                });
              }
            }
          }
        }
      }
    }

    // 5. Database Update
    let updateOperation = {};

    if (mode === "replace") {
      updateOperation = {
        $set: { "availability_calendar.schedules": newRules },
      };
    } else {
      updateOperation = {
        $push: { "availability_calendar.schedules": { $each: newRules } },
      };
    }

    const result = await ServiceProvider.findOneAndUpdate(
      { user_id: userId },
      updateOperation,
      { new: true }
    );

    return res.status(200).json({
      success: true,
      count: newRules.length,
      updatedCalendar: result.availability_calendar,
    });
  } catch (error) {
    console.error("Save Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
