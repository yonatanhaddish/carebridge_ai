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

    // 1. Identify the Provider
    const provider = await ServiceProvider.findOne({ user_id: userId });
    if (!provider) {
      return res.status(404).json({ error: "Provider profile not found." });
    }

    // 2. Aggregation Pipeline (The "Manual Populate" Fix)
    const pendingRequests = await Booking.aggregate([
      {
        // Filter: Match bookings for this provider that are "Pending"
        $match: {
          service_provider_id: provider.service_provider_id,
          status: "Pending",
        },
      },
      {
        // Join: Look up the Seeker details using UUIDs
        $lookup: {
          from: "serviceseekers", // The database collection name (usually lowercase plural)
          localField: "service_seeker_id", // The UUID in Booking
          foreignField: "service_seeker_id", // The UUID in ServiceSeeker
          as: "seeker_details", // Output array field
        },
      },
      {
        // Unwind: Convert the array [Object] to a single Object
        $unwind: {
          path: "$seeker_details",
          preserveNullAndEmptyArrays: true, // Keep booking even if seeker is deleted
        },
      },
      {
        // Sort: Newest first
        $sort: { request_created_at: -1 },
      },
      {
        // Project: Clean up the output (Select specific fields)
        $project: {
          booking_id: 1,
          status: 1,
          service_level: 1,
          start_date: 1,
          end_date: 1,
          slots: 1,
          hourly_rate: 1,
          location: 1,
          request_created_at: 1,
          notes: 1,
          // Flatten the Seeker details for the frontend
          seeker_first_name: "$seeker_details.first_name",
          seeker_last_name: "$seeker_details.last_name",
          seeker_profile_photo: "$seeker_details.profile_photo",
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      count: pendingRequests.length,
      bookings: pendingRequests,
    });
  } catch (error) {
    console.error("Get Pending Requests Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

export default authMiddleware(handler);
