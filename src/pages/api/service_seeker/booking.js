import dbConnect from "../../../lib/mongoose";
import Booking from "../../../models/Booking";
import ServiceSeeker from "../../../models/ServiceSeeker";
import ServiceProvider from "../../../models/ServiceProvider";

import { verifyToken } from "../../../lib/jwt";
import cookie from "cookie";
import axios from "axios";

/* ================= HELPERS ================= */

function getUserFromRequest(req) {
  const cookies = req.headers.cookie ? cookie.parse(req.headers.cookie) : {};
  const token = cookies.token;
  if (!token) return null;
  return verifyToken(token);
}

// --- AI Parsing ---
async function parseAI(command) {
  const res = await axios.post(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/ai/parseServiceSeekerCommand`,
    { command }
  );
  return res.data.concreteAvailability;
}

// --- Distance checker ---
function distanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// --- Availability checker (MATCH ALL REQUESTS) ---
function checkProviderAvailability(provider, requestedDays) {
  if (!Array.isArray(provider.availability)) return false;
  if (!Array.isArray(requestedDays)) return false;

  const toMinutes = (t) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };

  const normalizeDate = (value) => {
    if (!value) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

    const d = new Date(value);
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(
      2,
      "0"
    )}-${String(d.getUTCDate()).padStart(2, "0")}`;
  };

  return requestedDays.every((req) => {
    const reqDate = normalizeDate(req.date);

    const providerDay = provider.availability.find(
      (a) => normalizeDate(a.date) === reqDate
    );

    if (!providerDay || !Array.isArray(providerDay.time_slots)) {
      return false;
    }

    return req.time_slots.every((reqSlot) => {
      const rs = toMinutes(reqSlot.start);
      const re = toMinutes(reqSlot.end);

      return providerDay.time_slots.some((provSlot) => {
        const ps = toMinutes(provSlot.start);
        const pe = toMinutes(provSlot.end);
        return rs >= ps && re <= pe;
      });
    });
  });
}

/* ================= API HANDLER ================= */

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

  const seeker = await ServiceSeeker.findOne({ user_id: user.user_id }).lean();
  if (!seeker) {
    return res.status(404).json({ error: "Service seeker not found" });
  }

  try {
    // --- Parse natural language command via AI (expanded recurrence)
    const aiParsed = await parseAI(command);

    if (!Array.isArray(aiParsed) || aiParsed.length === 0) {
      return res
        .status(400)
        .json({ error: "AI returned empty or invalid availability" });
    }

    const bookingsToCreate = [];

    // Each entry = one service request (may contain multiple recurring days)
    for (const entry of aiParsed) {
      const providers = await ServiceProvider.find({
        service_levels_offered: entry.service_level,
      }).lean();
      const eligibleProviders = providers
        .filter(Boolean) // prevents undefined
        .map((p) => ({
          provider: p,
          distance: distanceKm(
            seeker.location_latitude,
            seeker.location_longitude,
            p.location_latitude,
            p.location_longitude
          ),
        }))
        .filter((p) => p.distance <= 30)
        .filter(
          (p) => p.provider && checkProviderAvailability(p.provider, [entry])
        )
        .sort((a, b) => a.distance - b.distance);

      if (!eligibleProviders.length) continue;

      const matchedprovider = eligibleProviders[0].provider;

      console.log("matchedProvider", matchedprovider);

      bookingsToCreate.push({
        service_seeker_id: seeker.service_seeker_id,
        service_provider_id: matchedprovider.service_provider_id,
        service_level: entry.service_level,
        daily_bookings: [
          {
            date: entry.date,
            time_slots: entry.time_slots,
          },
        ],
        status: "Pending",
        request_created_at: new Date(),
        confirmation_deadline: new Date(Date.now() + 12 * 60 * 60 * 1000),
        location_address: seeker.location_address,
        location_postal_code: seeker.location_postal_code,
        location_latitude: seeker.location_latitude,
        location_longitude: seeker.location_longitude,
        notes: "",
      });
    }

    if (!bookingsToCreate.length) {
      return res.status(400).json({
        error: "No providers available for requested times",
      });
    }

    // console.log("results", results);
    // console.log("service seeker", seeker);
    console.log("booking", bookingsToCreate);

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("Booking creation error:", err);
    return res.status(500).json({
      error: "Booking creation failed",
      details: err.message,
    });
  }
}
