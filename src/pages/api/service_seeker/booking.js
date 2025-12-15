import dbConnect from "../../../lib/mongoose";
import Booking from "../../../models/Booking";
import ServiceSeeker from "../../../models/ServiceSeeker";
import { verifyToken } from "../../../lib/jwt";
import cookie from "cookie";
import axios from "axios";

// --- Helpers ---
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
  return res.data.concreteRequests;
}

// --- API Handler ---
export default async function handler(req, res) {
  await dbConnect();

  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const user = getUserFromRequest(req);
  if (!user) return res.status(401).json({ error: "Not authenticated" });

  const { command } = req.body;
  if (!command) return res.status(400).json({ error: "Command required" });

  const seeker = await ServiceSeeker.findOne({ user_id: user.user_id }).lean();
  if (!seeker)
    return res.status(404).json({ error: "Service seeker not found" });

  try {
    // --- Parse natural language command via AI ---
    const aiParsed = await parseAI(command);

    if (!Array.isArray(aiParsed) || aiParsed.length === 0) {
      return res
        .status(400)
        .json({ error: "AI returned empty or invalid data" });
    }

    console.log("aiParsed", aiParsed);
    console.log("");

    // --- Prepare Booking entries ---
    // const bookingsToCreate = aiParsed.map((entry) => ({
    //   service_seeker_id: seeker.service_seeker_id,
    //   service_provider_id: null, // Can be assigned later when matched
    //   service_level: entry.service_level,
    //   price: 0, // Can calculate later based on service_level & provider
    //   start_datetime: entry.time_slots?.[0]?.start
    //     ? new Date(`${entry.date}T${entry.time_slots[0].start}:00`)
    //     : null,
    //   end_datetime: entry.time_slots?.[0]?.end
    //     ? new Date(`${entry.date}T${entry.time_slots[0].end}:00`)
    //     : null,
    //   recurring_booking: entry.recurring.length
    //     ? [
    //         {
    //           start_date: new Date(entry.date),
    //           end_date: new Date(entry.date),
    //           recurring: entry.recurring.map((r) => ({
    //             day: r.day,
    //             time_slots: r.time_slots,
    //           })),
    //         },
    //       ]
    //     : [],
    //   status: "Pending",
    //   request_created_at: new Date(),
    //   notes: "",
    //   location_address: seeker.home_address,
    //   location_postal_code: seeker.postal_code,
    //   location_latitude: seeker.location_latitude,
    //   location_longitude: seeker.location_longitude,
    // }));

    // --- Save bookings ---
    // const createdBookings = await Booking.insertMany(bookingsToCreate);

    // return res.status(201).json({ success: true, bookings: createdBookings });
    return res.status(201).json({ success: true });
  } catch (err) {
    console.error("Booking creation error:", err);
    return res.status(500).json({
      error: "Booking creation failed",
      details: err.message,
    });
  }
}
