import dbConnect from "@/lib/db";
import ServiceProvider from "@/models/ServiceProvider";
import { authMiddleware } from "@/lib/auth";

// --- STANDARD MARKET RATES (DEFAULTS) ---
const DEFAULT_PRICES = {
  "Level 1": 25.0, // Basic Care
  "Level 2": 32.0, // Specialized Care
  "Level 3": 45.0, // Complex Medical Care
};

async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  // 2. No more manual token parsing!
  // The middleware has already verified the user by the time code reaches here.
  const { userId, email } = req.user;

  try {
    await dbConnect();

    // Check if profile already exists for this user
    const existingProfile = await ServiceProvider.findOne({ user_id: userId });
    if (existingProfile) {
      return res.status(409).json({ error: "Profile already exists" });
    }

    const {
      first_name,
      last_name,
      phone_number,
      home_address,
      postal_code,
      location_latitude,
      location_longitude,
      service_levels_offered,
      service_prices,
    } = req.body;

    if (!first_name || !home_address || !service_levels_offered) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // --- SMART PRICING LOGIC ---
    const finalPrices = {};
    const inputPrices = service_prices || {};

    service_levels_offered.forEach((level) => {
      if (inputPrices[level]) {
        finalPrices[level] = inputPrices[level];
      } else {
        finalPrices[level] = DEFAULT_PRICES[level] || 25.0;
      }
    });

    // --- CREATE PROFILE ---
    const newProfile = await ServiceProvider.create({
      user_id: userId,
      first_name,
      last_name,
      email: email,
      phone_number,
      home_address,
      postal_code,
      location_latitude,
      location_longitude,

      service_levels_offered,
      service_prices: finalPrices,

      // Initialize empty calendar
      availability_calendar: { schedules: [], exceptions: [] },
    });

    return res.status(201).json({
      message: "Profile created successfully",
      profile: newProfile,
    });
  } catch (error) {
    console.error("Create Profile Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

// 3. Wrap the handler with the middleware
export default authMiddleware(handler);
