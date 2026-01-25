import dbConnect from "@/lib/db";
import ServiceSeeker from "@/models/ServiceSeeker";
import { authMiddleware } from "@/lib/auth";

async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { userId, email } = req.user;

  try {
    await dbConnect();

    // Check if profile already exists for this user
    const existingProfile = await ServiceSeeker.findOne({ user_id: userId });
    if (existingProfile) {
      return res.status(409).json({ error: "Profile already exists" });
    }

    const {
      first_name,
      last_name,
      phone_number,
      home_address,
      postal_code,
      location,
    } = req.body;

    console.log(req.body);
    console.log("existingProfile", existingProfile);

    if (!first_name || !last_name || !phone_number || !location) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // --- CREATE PROFILE ---
    const newProfile = await ServiceSeeker.create({
      user_id: userId,
      first_name,
      last_name,
      email: email,
      phone_number,
      home_address,
      postal_code,
      location,
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
