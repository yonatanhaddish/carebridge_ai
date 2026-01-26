import dbConnect from "@/lib/db";
import ServiceProvider from "@/models/ServiceProvider";
import { authMiddleware } from "@/lib/auth";

async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  // Auth Middleware gives us the User ID
  const { userId, email } = req.user;

  try {
    await dbConnect();

    // 1. Conflict Check: Does this user already have a profile?
    const existingProfile = await ServiceProvider.findOne({ user_id: userId });
    if (existingProfile) {
      return res.status(409).json({ error: "Profile already exists" });
    }

    // 2. Destructure inputs from the NEW Frontend
    const {
      first_name,
      last_name,
      phone_number,
      location, // This is now the { type: "Point", coordinates: [...] } object
      service_level, // Single String "Level 1"
      hourly_rates,
    } = req.body;
    console.log("Create Profile Input:", req.body);

    console.log("hourly_rates:", hourly_rates);
    // 3. Validation
    if (
      !first_name ||
      !location ||
      !service_level ||
      !last_name ||
      !phone_number
    ) {
      return res
        .status(400)
        .json({ error: "Missing required fields (Name, Location, or Level)" });
    }

    // 4. Create the Profile (Matching New Model)
    const newProfile = await ServiceProvider.create({
      user_id: userId,
      first_name,
      last_name,
      email: email, // Enforced from Token
      phone_number,

      // GeoJSON Location
      location: location,

      // Business Logic
      service_level: service_level,
      hourly_rates: hourly_rates,

      // Initialize empty calendar structure
      availability_calendar: { schedules: [] },
      blocked_dates: [],
    });

    return res.status(201).json({
      message: "Profile created successfully",
      profile: newProfile,
    });
  } catch (error) {
    console.error("Create Profile Error:", error);
    // Duplicate Key Error (e.g. Email already taken by another provider)
    if (error.code === 11000) {
      return res
        .status(409)
        .json({ error: "Email or User ID already associated with a profile." });
    }
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

export default authMiddleware(handler);
