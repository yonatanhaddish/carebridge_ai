import dbConnect from "@/lib/db";
import Booking from "@/models/Booking";
import { authMiddleware } from "@/lib/auth";
import ServiceSeeker from "@/models/ServiceSeeker";

async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method Not Allowed" });

  const { booking_id } = req.body;
  const { userId } = req.user;

  try {
    await dbConnect();
    const seeker = await ServiceSeeker.findOne({ user_id: userId });

    // Find the booking (Authorized)
    const booking = await Booking.findOne({
      booking_id: booking_id,
      service_seeker_id: seeker.service_seeker_id,
    });

    if (!booking) return res.status(404).json({ error: "Booking not found." });

    // // Allow cancelling Confirmed or Pending
    // if (!["Confirmed", "Pending"].includes(booking.status)) {
    //   return res
    //     .status(400)
    //     .json({ error: "Cannot cancel a completed or rejected booking." });
    // }

    // Update Status
    booking.status = "Cancelled";
    booking.notes = `Cancelled by ${seeker.first_name} ${seeker.last_name}`;
    await booking.save();

    return res
      .status(200)
      .json({ success: true, message: "Booking cancelled." });
  } catch (error) {
    return res.status(500).json({ error: "Server Error" });
  }
}

export default authMiddleware(handler);
