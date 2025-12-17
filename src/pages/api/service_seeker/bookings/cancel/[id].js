import dbConnect from "../../../../../lib/mongoose";
import Booking from "../../../../../models/Booking";
import cookie from "cookie";
import { verifyToken } from "../../../../../lib/jwt";

function getUserFromRequest(req) {
  const cookies = req.headers.cookie ? cookie.parse(req.headers.cookie) : {};
  const token = cookies.token;
  if (!token) return null;
  return verifyToken(token);
}

export default async function handler(req, res) {
  await dbConnect();

  const user = getUserFromRequest(req);
  if (!user) return res.status(401).json({ error: "Not authenticated" });

  const { id } = req.query;

  if (req.method === "POST") {
    try {
      const booking = await Booking.findOne({
        booking_id: id,
      });

      if (!booking) return res.status(404).json({ error: "Booking not found" });

      booking.status = "Cancelled";
      booking.cancelled_at = new Date();

      await booking.save();

      res
        .status(200)
        .json({ success: true, message: "Booking cancelled successfully" });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}
