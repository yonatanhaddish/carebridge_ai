import dbConnect from "@/lib/db";
import Booking from "@/models/Booking";
import ServiceProvider from "@/models/ServiceProvider";
import { authMiddleware } from "@/lib/auth";

async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { userId } = req.user;

  try {
    await dbConnect();

    // 1. Identify Provider
    const provider = await ServiceProvider.findOne({ user_id: userId });
    if (!provider) {
      return res.status(404).json({ error: "Provider profile not found." });
    }

    // 2. Aggregation Pipeline
    const schedule = await Booking.aggregate([
      {
        $match: {
          service_provider_id: provider.service_provider_id,
          status: "Confirmed", // <--- Only confirmed jobs
        },
      },
      {
        $lookup: {
          from: "serviceseekers",
          localField: "service_seeker_id",
          foreignField: "service_seeker_id",
          as: "seeker_details",
        },
      },
      {
        $unwind: {
          path: "$seeker_details",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        // Sort: Soonest jobs first (Ascending)
        $sort: { start_date: 1 },
      },
      {
        $project: {
          booking_id: 1,
          status: 1,
          service_level: 1,
          hourly_rate: 1,
          start_date: 1,
          end_date: 1,
          slots: 1,
          location: 1, // Full address
          notes: 1,
          // Unlocked Contact Info 🔓
          seeker_first_name: "$seeker_details.first_name",
          seeker_last_name: "$seeker_details.last_name",
          seeker_phone: "$seeker_details.phone_number",
          seeker_photo: "$seeker_details.profile_photo",
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      count: schedule.length,
      bookings: schedule,
    });
  } catch (error) {
    console.error("Get Schedule Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

export default authMiddleware(handler);
