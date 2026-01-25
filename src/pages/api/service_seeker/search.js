import dbConnect from "@/lib/db";
import ServiceProvider from "@/models/ServiceProvider";
import ServiceSeeker from "@/models/ServiceSeeker";
import { authMiddleware } from "@/lib/auth";

async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { userId } = req.user;
  // We expect CLEAN data (already verified by the user in the UI)
  const { service_level, max_distance_km } = req.body;

  try {
    await dbConnect();

    // 1. Get Seeker's Location (The center point)
    const seeker = await ServiceSeeker.findOne({ user_id: userId });

    if (!seeker || !seeker.location) {
      return res
        .status(404)
        .json({
          error: "Please complete your profile with a valid address first.",
        });
    }

    // 2. Prepare Parameters
    const distanceMeters = (max_distance_km || 20) * 1000; // Default 20km radius
    const targetLevel = service_level || "Level 1";

    // 3. The Geo-Spatial Query ($near)
    const providers = await ServiceProvider.find({
      service_level: targetLevel,
      location: {
        $near: {
          $geometry: seeker.location,
          $maxDistance: distanceMeters,
        },
      },
    })
      .select("first_name last_name bio hourly_rate service_level location") // Optimize: don't send everything
      .limit(20);

    return res.status(200).json({
      success: true,
      count: providers.length,
      results: providers,
    });
  } catch (error) {
    console.error("Search API Error:", error);
    return res.status(500).json({ error: "Database search failed" });
  }
}

export default authMiddleware(handler);
