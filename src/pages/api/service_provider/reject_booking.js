import dbConnect from "@/lib/db";
import Booking from "@/models/Booking";
import ServiceProvider from "@/models/ServiceProvider";
import { authMiddleware } from "@/lib/auth";

async function handler(req, res) {
  // 1. Method Check
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  // 2. Get ID from Body (Changed from URL)
  const { booking_id } = req.body;
  const { userId } = req.user;

  if (!booking_id) {
    return res.status(400).json({ error: "Booking ID is required." });
  }

  try {
    await dbConnect();

    // 3. Identify the Provider
    const provider = await ServiceProvider.findOne({ user_id: userId });
    if (!provider) {
      return res.status(404).json({ error: "Provider profile not found." });
    }

    // 4. Find the Booking (Security Check included)
    const booking = await Booking.findOne({
      booking_id: booking_id,
      service_provider_id: provider.service_provider_id,
    });

    if (!booking) {
      return res
        .status(404)
        .json({ error: "Booking not found or unauthorized." });
    }

    // 5. Validate State
    if (booking.status !== "Pending") {
      return res.status(400).json({
        error: `Cannot reject a booking that is ${booking.status}.`,
      });
    }

    // 6. Perform Rejection
    booking.status = "Rejected";
    booking.notes = `Rejected by ${provider.first_name} ${provider.last_name}`;
    await booking.save();

    return res.status(200).json({
      success: true,
      message: "Booking rejected.",
      booking_id: booking.booking_id,
    });
  } catch (error) {
    console.error("Reject API Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

export default authMiddleware(handler);
