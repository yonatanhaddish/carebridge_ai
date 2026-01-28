import dbConnect from "@/lib/db";
import Booking from "@/models/Booking";
import ServiceSeeker from "@/models/ServiceSeeker";
// We must import ServiceProvider so Mongoose knows about the collection for $lookup
import ServiceProvider from "@/models/ServiceProvider";
import { authMiddleware } from "@/lib/auth";

async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { userId } = req.user;
  //   console.log("Get My Bookings Request by User:", userId);

  try {
    await dbConnect();

    // 1. Identify the Seeker
    // We need to translate the UserID (from Token) to the ServiceSeekerID (Business Logic)
    const seeker = await ServiceSeeker.findOne({ user_id: userId });

    if (!seeker) {
      return res.status(404).json({ error: "Seeker profile not found." });
    }

    // 2. The Aggregation Pipeline
    const bookings = await Booking.aggregate([
      {
        // Filter: Get only this seeker's bookings
        $match: {
          service_seeker_id: seeker.service_seeker_id,
        },
      },
      {
        // Join: Fetch Provider Details using the UUIDs
        $lookup: {
          from: "serviceproviders", // Collection name (lowercase plural)
          localField: "service_provider_id", // Field in Booking
          foreignField: "service_provider_id", // Field in Provider
          as: "provider_details", // Temporary result field
        },
      },
      {
        // Flatten: Convert array [Object] to just Object
        $unwind: {
          path: "$provider_details",
          preserveNullAndEmptyArrays: true, // Keep booking even if provider was deleted
        },
      },
      {
        // Sort: Newest requests at the top
        $sort: { request_created_at: -1 },
      },
      {
        // Select & Format: Pick exactly what the Frontend needs
        $project: {
          booking_id: 1,
          status: 1,
          service_level: 1,
          hourly_rate: 1,
          total_estimated_cost: 1, // From your schema

          // Dates & Times
          start_date: 1,
          end_date: 1,
          slots: 1, // The array of times { startTime, endTime }

          // Location (Your schema uses location.address)
          address: "$location.address",

          // Provider Identity
          provider_first_name: "$provider_details.first_name",
          provider_last_name: "$provider_details.last_name",
          provider_photo: "$provider_details.profile_photo", // Schema has it, safe to ask

          // 🔒 PRIVACY LOGIC: Phone Number
          // logic: IF status is (Confirmed OR Awaiting Review OR Completed) -> Show Phone
          //        ELSE -> Return NULL
          provider_phone: {
            $cond: {
              if: {
                $in: [
                  "$status",
                  ["Confirmed", "Awaiting_Client_Review", "Completed"],
                ],
              },
              then: "$provider_details.phone_number",
              else: null,
            },
          },

          // 🔒 PRIVACY LOGIC: Email (Optional, same rule)
          provider_email: {
            $cond: {
              if: {
                $in: [
                  "$status",
                  ["Confirmed", "Awaiting_Client_Review", "Completed"],
                ],
              },
              then: "$provider_details.email",
              else: null,
            },
          },
        },
      },
    ]);

    // console.log(
    //   "Retrieved Bookings for Seeker:",
    //   seeker.service_seeker_id,
    //   bookings
    // );

    return res.status(200).json({
      success: true,
      count: bookings.length,
      bookings: bookings,
    });
  } catch (error) {
    console.error("Get Seeker Bookings Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

export default authMiddleware(handler);
