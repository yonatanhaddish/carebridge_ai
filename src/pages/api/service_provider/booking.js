import dbConnect from "../../../lib/mongoose";
import ServiceProvider from "../../../models/ServiceProvider";
import axios from "axios";
import cookie from "cookie";
import { verifyToken } from "../../../lib/jwt";

// --- Get logged-in user from JWT cookie ---
function getUserFromRequest(req) {
  const cookies = req.headers.cookie ? cookie.parse(req.headers.cookie) : {};
  const token = cookies.token;
  if (!token) return null;
  return verifyToken(token);
}

// --- Time helpers ---
function toMinutes(t) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function timeOverlaps(slot1, slot2) {
  return (
    Math.max(toMinutes(slot1.start), toMinutes(slot2.start)) <
    Math.min(toMinutes(slot1.end), toMinutes(slot2.end))
  );
}

function datesOverlap(start1, end1, start2, end2) {
  return !(
    new Date(end1) < new Date(start2) || new Date(start1) > new Date(end2)
  );
}

// --- AI call ---
async function parseAI(command) {
  const res = await axios.post(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/ai/parseServiceProviderCommand`,
    { command }
  );
  return res.data.parsed;
}

// --- Data Validation and Normalization ---
function normalizeScheduleEntries(parsedEntries) {
  return parsedEntries.map((entry) => {
    // Normalize dates to ensure consistent format
    const normalizedEntry = {
      start_date: new Date(entry.start_date).toISOString(),
      end_date: new Date(entry.end_date).toISOString(),
    };

    // Normalize recurring array structure
    if (Array.isArray(entry.recurring)) {
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

    return normalizedEntry;
  });
}

// --- Improved Conflict Detection ---
function detectConflicts(newEntries, existingEntries) {
  const conflicts = [];

  newEntries.forEach((newEntry) => {
    const newStart = new Date(newEntry.start_date);
    const newEnd = new Date(newEntry.end_date);

    existingEntries.forEach((existing) => {
      const existStart = new Date(existing.start_date);
      const existEnd = new Date(existing.end_date);

      // Check if dates overlap at all
      if (datesOverlap(newStart, newEnd, existStart, existEnd)) {
        // Calculate the actual overlapping date range
        const overlapStart = new Date(Math.max(newStart, existStart));
        const overlapEnd = new Date(Math.min(newEnd, existEnd));

        console.log("Date overlap found:", {
          newRange: `${newStart.toISOString()} to ${newEnd.toISOString()}`,
          existingRange: `${existStart.toISOString()} to ${existEnd.toISOString()}`,
          overlapRange: `${overlapStart.toISOString()} to ${overlapEnd.toISOString()}`,
        });

        // Check for recurring schedule conflicts only within the overlapping date range
        if (
          Array.isArray(newEntry.recurring) &&
          Array.isArray(existing.recurring)
        ) {
          newEntry.recurring.forEach((newRec) => {
            existing.recurring.forEach((existRec) => {
              if (newRec.day === existRec.day) {
                // Check if this specific day falls within the overlapping date range
                const dayOverlaps = checkDayInDateRange(
                  newRec.day,
                  overlapStart,
                  overlapEnd
                );

                if (dayOverlaps) {
                  // Same day and within overlapping date range, check time slots
                  newRec.time_slots.forEach((newSlot) => {
                    existRec.time_slots.forEach((existSlot) => {
                      if (timeOverlaps(newSlot, existSlot)) {
                        conflicts.push({
                          type: "time_conflict",
                          message: `Time conflict on ${newRec.day}`,
                          details: `Your requested time ${newSlot.start}-${
                            newSlot.end
                          } overlaps with existing ${existSlot.start}-${
                            existSlot.end
                          } between ${overlapStart.toLocaleDateString()} and ${overlapEnd.toLocaleDateString()}`,
                          day: newRec.day,
                          requestedTime: `${newSlot.start}-${newSlot.end}`,
                          existingTime: `${existSlot.start}-${existSlot.end}`,
                          conflictDateRange: `${overlapStart.toLocaleDateString()} - ${overlapEnd.toLocaleDateString()}`,
                        });
                      }
                    });
                  });
                }
              }
            });
          });
        }

        // If no time conflicts found but dates overlap, it's a date range conflict
        if (conflicts.length === 0) {
          conflicts.push({
            type: "date_range_conflict",
            message: "Date range conflict",
            details: `The date range ${newStart.toLocaleDateString()} to ${newEnd.toLocaleDateString()} overlaps with your existing schedule from ${existStart.toLocaleDateString()} to ${existEnd.toLocaleDateString()}`,
            requestedRange: `${newStart.toLocaleDateString()} - ${newEnd.toLocaleDateString()}`,
            existingRange: `${existStart.toLocaleDateString()} - ${existEnd.toLocaleDateString()}`,
            overlapRange: `${overlapStart.toLocaleDateString()} - ${overlapEnd.toLocaleDateString()}`,
          });
        }
      }
    });
  });

  return conflicts;
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

export default async function handler(req, res) {
  await dbConnect();

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const user = getUserFromRequest(req);
  if (!user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const { command } = req.body;
  if (!command) {
    return res.status(400).json({ error: "Command required" });
  }

  // Parse command using AI
  let parsed;
  try {
    parsed = await parseAI(command);
  } catch (err) {
    console.error("AI Parsing Error:", err);
    return res.status(500).json({
      error: "AI failed to parse command",
      details: err.message,
    });
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    return res.status(400).json({
      error: "Parsed AI schedule is empty or invalid",
    });
  }

  try {
    // Normalize the data
    const normalizedEntries = normalizeScheduleEntries(parsed);

    // Get current service provider data
    const provider = await ServiceProvider.findOne({ user_id: user.user_id });
    if (!provider) {
      return res.status(404).json({ error: "ServiceProvider not found" });
    }

    console.log("=== DEBUG INFO ===");
    console.log(
      "New entries to add:",
      JSON.stringify(normalizedEntries, null, 2)
    );
    console.log(
      "Existing entries count:",
      provider.availability_calendar.length
    );
    console.log(
      "Existing entries:",
      JSON.stringify(provider.availability_calendar, null, 2)
    );

    // Check for conflicts
    const conflicts = detectConflicts(
      normalizedEntries,
      provider.availability_calendar
    );

    console.log("Detected conflicts:", conflicts.length);
    conflicts.forEach((conflict, index) => {
      console.log(`Conflict ${index + 1}:`, conflict);
    });

    // If conflicts found, return notification without updating database
    if (conflicts.length > 0) {
      return res.status(200).json({
        success: false,
        message: "Schedule conflicts detected",
        conflicts: conflicts,
        notification: {
          type: "error",
          title: "Schedule Conflict",
          message: `Found ${conflicts.length} conflict(s) with your existing schedule`,
        },
        added: [], // No entries added due to conflicts
        totalAvailabilityEntries: provider.availability_calendar.length,
        debug: {
          newEntries: normalizedEntries,
          existingEntriesCount: provider.availability_calendar.length,
        },
      });
    }

    // No conflicts found - update the database
    const updatedProvider = await ServiceProvider.findOneAndUpdate(
      { user_id: user.user_id },
      {
        $push: {
          availability_calendar: {
            $each: normalizedEntries,
          },
        },
      },
      { new: true, runValidators: true }
    );

    // Success response
    return res.status(200).json({
      success: true,
      message: `Successfully added ${normalizedEntries.length} schedule ${
        normalizedEntries.length === 1 ? "entry" : "entries"
      } to your availability`,
      added: normalizedEntries,
      totalAvailabilityEntries: updatedProvider.availability_calendar.length,
      notification: {
        type: "success",
        title: "Schedule Updated",
        message: "Your availability has been updated successfully",
      },
    });
  } catch (err) {
    console.error("Database Update Error:", err);
    return res.status(500).json({
      error: "Failed to update availability",
      details: err.message,
    });
  }
}
