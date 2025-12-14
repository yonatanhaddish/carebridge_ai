import dbConnect from "../../../lib/mongoose";
import ServiceProvider from "../../../models/ServiceProvider";
import axios from "axios";
import cookie from "cookie";
import { verifyToken } from "../../../lib/jwt";

/* ===================== HELPERS ===================== */

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

async function parseAI(command) {
  const res = await axios.post(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/ai/parseServiceProviderCommand`,
    { command }
  );

  // must return concreteAvailability:
  // [
  //   { date: "YYYY-MM-DD", time_slots: [{ start, end }] }
  // ]
  return res.data.concreteAvailability;
}

/* ===================== API HANDLER ===================== */

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

  try {
    /* ---------- AI PARSE ---------- */
    const aiParsed = await parseAI(command);

    if (!Array.isArray(aiParsed)) {
      return res.status(400).json({ error: "Invalid AI output" });
    }

    /* ---------- LOAD PROVIDER ---------- */
    const serviceProvider = await ServiceProvider.findOne({
      user_id: user.user_id,
    });

    if (!serviceProvider) {
      return res.status(404).json({ error: "Service provider not found" });
    }

    let addedDates = 0;
    let addedSlots = 0;

    /* ---------- MERGE LOGIC ---------- */
    aiParsed.forEach((incoming) => {
      const key = dateKey(incoming.date);

      const existing = serviceProvider.availability.find(
        (a) => dateKey(a.date) === key
      );

      // New date → insert whole day
      if (!existing) {
        serviceProvider.availability.push({
          date: new Date(incoming.date),
          time_slots: incoming.time_slots,
        });
        addedDates++;
        addedSlots += incoming.time_slots.length;
        return;
      }

      //  Existing date → validate + merge slots
      incoming.time_slots.forEach((slot) => {
        const conflict = existing.time_slots.some((s) => overlaps(s, slot));

        if (!conflict) {
          existing.time_slots.push(slot);
          addedSlots++;
        }
        // else → silently ignore OR collect conflicts (your choice)
      });
    });

    /* ---------- SAVE ---------- */
    await serviceProvider.save();

    return res.status(200).json({
      success: true,
      addedDates,
      addedSlots,
      availability: serviceProvider.availability,
    });
  } catch (err) {
    console.error("Availability error:", err);
    return res.status(500).json({
      error: "Failed to process availability",
      details: err.message,
    });
  }
}
