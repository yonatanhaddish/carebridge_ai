import dbConnect from "@/lib/db";
import Availability from "@/models/Availability"; // Your existing model
import ServiceProvider from "@/models/ServiceProvider";
import jwt from "jsonwebtoken";
import cookie from "cookie";

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method Not Allowed" });

  // --- Auth Check (Cookie) ---
  let userId;
  try {
    const cookies = cookie.parse(req.headers.cookie || "");
    const token = cookies.token;
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    userId = decoded.userId; // This is a String (as per your User model)
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }

  const { schedules, mode = "append" } = req.body;

  try {
    await dbConnect();

    // 1. Verify Profile Exists
    const profile = await ServiceProvider.findOne({ user_id: userId });
    if (!profile) {
      return res.status(404).json({ error: "Profile not found." });
    }

    // 2. Handle Replace Mode
    if (mode === "replace") {
      await Availability.deleteMany({ user_id: userId });
    }

    // 3. Transform & Save
    const newRules = schedules.map((rule) => ({
      user_id: userId, // Matches String type in your Schema
      type: rule.type,
      startDate: new Date(rule.startDate),
      endDate: new Date(rule.endDate),

      // AI now gives [1, 3], which matches your Schema [Number]
      daysOfWeek: rule.daysOfWeek || [],

      // Matches your TimeSlotSchema exactly
      slots: rule.slots.map((s) => ({
        startTime: s.startTime,
        endTime: s.endTime,
      })),

      timezone: "America/Toronto",
    }));

    if (newRules.length > 0) {
      await Availability.insertMany(newRules);
    }

    return res.status(200).json({ success: true, count: newRules.length });
  } catch (error) {
    console.error("Save Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
