import dbConnect from "../../../lib/mongoose";
import ServiceProvider from "../../../models/ServiceProvider";
import cookie from "cookie";
import { verifyToken } from "../../../lib/jwt";

// --- Get logged-in user from JWT cookie ---
function getUserFromRequest(req) {
  const cookies = req.headers.cookie ? cookie.parse(req.headers.cookie) : {};
  const token = cookies.token;
  if (!token) return null;
  return verifyToken(token);
}

// --- Helpers ---
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

// --- Normalize booking entries ---
function normalizeBookingEntries(bookingData) {
  const entries = Array.isArray(bookingData) ? bookingData : [bookingData];

  return entries.map((entry) => ({
    start_date: new Date(entry.start_date).toISOString(),
    end_date: new Date(entry.end_date).toISOString(),
    status: entry.status || "available",
    booking_type: entry.booking_type || "availability",
    recurring: Array.isArray(entry.recurring)
      ? entry.recurring.map((daySchedule) => ({
          day: daySchedule.day,
          time_slots: Array.isArray(daySchedule.time_slots)
            ? daySchedule.time_slots.map((slot) => ({
                start: slot.start,
                end: slot.end,
              }))
            : [],
        }))
      : [],
  }));
}

// --- Conflict detection ---
function detectBookingConflicts(newEntries, existingCalendar) {
  const conflicts = [];

  newEntries.forEach((newEntry) => {
    const newStart = new Date(newEntry.start_date);
    const newEnd = new Date(newEntry.end_date);

    existingCalendar.forEach((existing) => {
      const existStart = new Date(existing.start_date);
      const existEnd = new Date(existing.end_date);

      if (!(newEnd < existStart || newStart > existEnd)) {
        if (
          Array.isArray(newEntry.recurring) &&
          Array.isArray(existing.recurring)
        ) {
          newEntry.recurring.forEach((newRec) => {
            existing.recurring.forEach((existRec) => {
              if (newRec.day === existRec.day) {
                newRec.time_slots.forEach((newSlot) => {
                  existRec.time_slots.forEach((existSlot) => {
                    if (timeOverlaps(newSlot, existSlot)) {
                      conflicts.push({
                        type: "booking_conflict",
                        message: `Conflict on ${newRec.day}`,
                        requestedTime: `${newSlot.start}-${newSlot.end}`,
                        existingTime: `${existSlot.start}-${existSlot.end}`,
                        existingBookingType: existing.booking_type,
                      });
                    }
                  });
                });
              }
            });
          });
        }
      }
    });
  });

  return conflicts;
}

// --- API handler ---
export default async function handler(req, res) {
  await dbConnect();

  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const user = getUserFromRequest(req);
  if (!user) return res.status(401).json({ error: "Not authenticated" });

  const { bookingData, action = "add" } = req.body;
  if (!bookingData)
    return res.status(400).json({ error: "Booking data required" });

  try {
    const normalizedEntries = normalizeBookingEntries(bookingData);
    const provider = await ServiceProvider.findOne({ user_id: user.user_id });
    if (!provider)
      return res.status(404).json({ error: "ServiceProvider not found" });

    if (action === "add") {
      const conflicts = detectBookingConflicts(
        normalizedEntries,
        provider.availability_calendar
      );

      if (conflicts.length > 0) {
        return res.status(200).json({
          success: false,
          message: "Booking conflicts detected",
          conflicts,
          added: [],
          totalCalendarEntries: provider.availability_calendar.length,
        });
      }

      const updated = await ServiceProvider.findOneAndUpdate(
        { user_id: user.user_id },
        { $push: { availability_calendar: { $each: normalizedEntries } } },
        { new: true, runValidators: true }
      );

      return res.status(200).json({
        success: true,
        message: `Added ${normalizedEntries.length} slot(s) successfully!`,
        added: normalizedEntries,
        totalCalendarEntries: updated.availability_calendar.length,
      });
    }

    return res.status(400).json({ error: "Invalid action" });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ error: "Server error", details: err.message });
  }
}
