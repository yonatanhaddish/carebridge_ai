import dbConnect from "../../../../lib/mongoose";
import Booking from "../../../../models/Booking";
import ServiceSeeker from "../../../../models/ServiceSeeker";
import cookie from "cookie";
import { verifyToken } from "../../../../lib/jwt";

// Get logged-in user from JWT
function getUserFromRequest(req) {
  const cookies = req.headers.cookie ? cookie.parse(req.headers.cookie) : {};
  const token = cookies.token;
  if (!token) return null;
  return verifyToken(token);
}

export default async function handler(req, res) {
  await dbConnect();

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const user = getUserFromRequest(req);
  if (!user) return res.status(401).json({ error: "Not authenticated" });

  try {
    // Get the service seeker linked to this user
    const seeker = await ServiceSeeker.findOne({ user_id: user.user_id });
    if (!seeker)
      return res.status(404).json({ error: "ServiceSeeker not found" });

    // Fetch all bookings for this service seeker that are pending or confirmed
    const bookings = await Booking.find({
      service_seeker_id: seeker.service_seeker_id,
      status: { $in: ["Pending", "Confirmed"] },
    })
      .sort({ request_created_at: -1 }) // newest first
      .lean();

    res.status(200).json({ success: true, bookings });
  } catch (err) {
    console.error("Fetch Bookings Error:", err);
    res
      .status(500)
      .json({ error: "Failed to fetch bookings", details: err.message });
  }
}
