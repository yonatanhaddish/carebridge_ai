// pages/api/service_provider/booking_calendar.js
import dbConnect from "../../../lib/mongoose";
import ServiceProvider from "../../../models/ServiceProvider";
import cookie from "cookie";
import { verifyToken } from "../../../lib/jwt";

// Helpers
function getUserFromRequest(req) {
  const cookies = req.headers.cookie ? cookie.parse(req.headers.cookie) : {};
  const token = cookies.token;
  if (!token) return null;
  return verifyToken(token);
}

function dateKey(d) {
  return new Date(d).toISOString().slice(0, 10); // YYYY-MM-DD
}

function toMinutes(time) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function overlaps(a, b) {
  const aStart = toMinutes(a.start);
  const aEnd = toMinutes(a.end);
  const bStart = toMinutes(b.start);
  const bEnd = toMinutes(b.end);
  return aStart < bEnd && bStart < aEnd;
}

// Main handler
export default async function handler(req, res) {
  await dbConnect();

  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const user = getUserFromRequest(req);
  if (!user) return res.status(401).json({ error: "Not authenticated" });

  const { action, bookingData } = req.body;
  if (!bookingData || !Array.isArray(bookingData))
    return res.status(400).json({ error: "bookingData array required" });

  try {
    const serviceProvider = await ServiceProvider.findOne({
      user_id: user.user_id,
    });
    if (!serviceProvider)
      return res.status(404).json({ error: "Service provider not found" });

    let addedDates = 0;
    let addedSlots = 0;
    const conflicts = [];

    bookingData.forEach((incoming) => {
      incoming.recurring.forEach((rec) => {
        const date = incoming.start_date;
        const existing = serviceProvider.availability.find(
          (a) => dateKey(a.date) === date
        );

        // No existing date → push all slots
        if (!existing) {
          serviceProvider.availability.push({
            date: new Date(date),
            time_slots: rec.time_slots,
          });
          addedDates++;
          addedSlots += rec.time_slots.length;
          return;
        }

        // Check each time slot for conflicts
        rec.time_slots.forEach((slot) => {
          const conflictWith = existing.time_slots.find((s) =>
            overlaps(s, slot)
          );

          if (conflictWith) {
            conflicts.push({
              date,
              requestedTime: `${slot.start} - ${slot.end}`,
              existingTime: `${conflictWith.start} - ${conflictWith.end}`,
              message: "Time slot conflict",
            });
          } else {
            existing.time_slots.push(slot);
            addedSlots++;
          }
        });
      });
    });

    await serviceProvider.save();

    res.status(200).json({
      success: true,
      added: { dates: addedDates, slots: addedSlots },
      conflicts,
      availability: serviceProvider.availability,
      message: conflicts.length
        ? "Some slots could not be added due to conflicts"
        : "All slots added successfully",
    });
  } catch (err) {
    console.error("Booking Calendar Error:", err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
}
