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
  try {
    return verifyToken(token);
  } catch {
    return null;
  }
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

// --- Parse YYYY-MM-DD into local Date at midnight ---
function parseISOToLocal(dateInput) {
  if (!dateInput) throw new Error("Invalid date input");

  // If it's already a Date object, just return a new Date at local midnight
  if (dateInput instanceof Date) {
    return new Date(
      dateInput.getFullYear(),
      dateInput.getMonth(),
      dateInput.getDate()
    );
  }

  // If it's a string in YYYY-MM-DD format
  if (typeof dateInput === "string") {
    const [year, month, day] = dateInput.split("-").map(Number);
    return new Date(year, month - 1, day); // local midnight
  }

  throw new Error("parseISOToLocal received invalid type: " + typeof dateInput);
}

function normalizeDate(dateStr) {
  const d = parseISOToLocal(dateStr);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// --- Date range overlap check ---
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

// --- Generate recurring schedule based on date range ---
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
  const start = parseISOToLocal(entry.start_date);
  const end = parseISOToLocal(entry.end_date);
  const recurringMap = {};

  if (!Array.isArray(entry.recurring)) return [];

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dayName = daysOfWeek[d.getDay()];
    const matchingRec = entry.recurring.find((r) => r.day === dayName);
    if (!matchingRec) continue;

    if (!recurringMap[dayName]) {
      recurringMap[dayName] = {
        day: dayName,
        time_slots: JSON.parse(JSON.stringify(matchingRec.time_slots)),
      };
    }
  }

  return Object.values(recurringMap);
}

// --- Normalize schedule entries ---
function normalizeScheduleEntries(parsedEntries) {
  return parsedEntries.map((entry) => ({
    start_date: normalizeDate(entry.start_date),
    end_date: normalizeDate(entry.end_date),
    recurring: generateRecurringFromRange(entry),
  }));
}

// --- Check if a day exists in a date range ---
function checkDayInDateRange(day, startDate, endDate) {
  const daysOfWeekMap = {
    Sunday: 0,
    Monday: 1,
    Tuesday: 2,
    Wednesday: 3,
    Thursday: 4,
    Friday: 5,
    Saturday: 6,
  };
  const targetDay = daysOfWeekMap[day];
  if (targetDay === undefined) return false;

  const current = parseISOToLocal(startDate);
  const end = parseISOToLocal(endDate);

  while (current <= end) {
    if (current.getDay() === targetDay) return true;
    current.setDate(current.getDate() + 1);
  }
  return false;
}

// --- Conflict detection ---
function detectConflicts(newEntries, existingEntries) {
  const conflicts = [];

  newEntries.forEach((newEntry) => {
    const newStart = parseISOToLocal(newEntry.start_date);
    const newEnd = parseISOToLocal(newEntry.end_date);

    existingEntries.forEach((existing) => {
      const existStart = parseISOToLocal(existing.start_date);
      const existEnd = parseISOToLocal(existing.end_date);

      if (datesOverlap(newStart, newEnd, existStart, existEnd)) {
        const overlapStart = new Date(Math.max(newStart, existStart));
        const overlapEnd = new Date(Math.min(newEnd, existEnd));

        let timeConflictFound = false;

        if (
          Array.isArray(newEntry.recurring) &&
          Array.isArray(existing.recurring)
        ) {
          for (const newRec of newEntry.recurring) {
            for (const existRec of existing.recurring) {
              if (newRec.day === existRec.day) {
                if (checkDayInDateRange(newRec.day, overlapStart, overlapEnd)) {
                  for (const newSlot of newRec.time_slots) {
                    for (const existSlot of existRec.time_slots) {
                      if (timeOverlaps(newSlot, existSlot)) {
                        timeConflictFound = true;
                        conflicts.push({
                          type: "time_conflict",
                          message: `Time conflict on ${newRec.day}`,
                          details: `Requested ${newSlot.start}-${
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
                    }
                  }
                }
              }
            }
          }
        }

        if (!timeConflictFound) {
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

// ==================== HANDLER ====================
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

  let parsed;
  try {
    parsed = await parseAI(command);
  } catch (err) {
    console.error("AI Parsing Error:", { err });
    return res.status(500).json({ error: "AI failed to parse command" });
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    return res
      .status(400)
      .json({ error: "Parsed AI schedule is empty or invalid" });
  }

  try {
    const normalizedEntries = normalizeScheduleEntries(parsed);

    const provider = await ServiceProvider.findOne({ user_id: user.user_id });
    if (!provider) {
      return res.status(404).json({ error: "ServiceProvider not found" });
    }

    const conflicts = detectConflicts(
      normalizedEntries,
      provider.availability_calendar
    );

    if (conflicts.length > 0) {
      return res.status(200).json({
        success: false,
        message: "Schedule conflicts detected",
        conflicts,
        notification: {
          type: "error",
          title: "Schedule Conflict",
          message: `Found ${conflicts.length} conflict(s)`,
        },
        added: [],
        totalAvailabilityEntries: provider.availability_calendar.length,
      });
    }

    const updatedProvider = await ServiceProvider.findOneAndUpdate(
      { user_id: user.user_id },
      { $push: { availability_calendar: { $each: normalizedEntries } } },
      { new: true, runValidators: true }
    );

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
    console.error("Database Update Error:", { err });
    return res.status(500).json({ error: "Failed to update availability" });
  }
}
