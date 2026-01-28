import dbConnect from "@/lib/db";
import Booking from "@/models/Booking";
import ServiceProvider from "@/models/ServiceProvider";
import { authMiddleware } from "@/lib/auth";

async function handler(req, res) {
  // 1. Method Check
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  // 2. Get ID from Body
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

    // 4. Find the Booking
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
        error: `Cannot accept a booking that is ${booking.status}.`,
      });
    }

    // 6. FINAL SAFETY CHECK 🛡️
    // Ensure no other "Confirmed" booking overlaps with this one.
    // (Prevents rare race conditions if you accepted another job 1 second ago)
    const conflict = await Booking.findOne({
      service_provider_id: provider.service_provider_id,
      status: "Confirmed", // Only check Confirmed (Pending is us)
      _id: { $ne: booking._id }, // Don't match self

      // Date Overlap
      start_date: { $lte: booking.end_date },
      end_date: { $gte: booking.start_date },

      // Time Overlap (Check all slots)
      $or: booking.slots.map((slot) => ({
        "slots.startTime": { $lt: slot.endTime },
        "slots.endTime": { $gt: slot.startTime },
      })),
    });

    if (conflict) {
      return res.status(409).json({
        error: "Conflict Detected",
        message: "You already have a confirmed booking at this time.",
      });
    }

    // 7. Perform Acceptance
    booking.status = "Confirmed";
    // Optional: Add an audit note
    booking.notes = `(Confirmed by ${provider.first_name} ${provider.last_name}.)`;

    await booking.save();

    // console.log(`Booking ${booking_id} CONFIRMED by provider.`);

    return res.status(200).json({
      success: true,
      message: "Booking confirmed! The client has been notified.",
      booking_id: booking.booking_id,
      new_status: "Confirmed",
    });
  } catch (error) {
    console.error("Accept API Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

export default authMiddleware(handler);
