import dbConnect from "@/lib/db";
import Availability from "@/models/Availability";
import ServiceProvider from "@/models/ServiceProvider";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  // 1. Method Check
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  // 2. Auth Check (Security)
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  let userId;
  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    userId = decoded.userId;
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }

  // 3. Get Data (The AI Output)
  // We expect: { schedules: [ ... ] }
  const { schedules, mode = "append" } = req.body;

  if (!schedules || !Array.isArray(schedules)) {
    return res
      .status(400)
      .json({ error: "Invalid schedule data. Expected an array." });
  }

  try {
    await dbConnect();

    // 4. (Optional) Check if they have a Profile first
    // It's good practice to ensure they are a real Service Provider before letting them set hours
    const profile = await ServiceProvider.findOne({ user_id: userId });
    if (!profile) {
      return res.status(404).json({
        error:
          "Service Provider profile not found. Please complete onboarding first.",
      });
    }

    // 5. Handle "Replace" Mode
    // If the user said "Clear my schedule and set...", we wipe the old data first.
    if (mode === "replace") {
      await Availability.deleteMany({ user_id: userId });
    }

    // 6. Transform JSON to Database Format
    // The AI gives strings ("2026-12-01"), MongoDB needs Date Objects.
    const newRules = schedules.map((rule) => ({
      user_id: userId, // <--- Link to the User
      type: rule.type, // "specific_date" or "recurring"
      startDate: new Date(rule.startDate),
      endDate: new Date(rule.endDate),
      daysOfWeek: rule.daysOfWeek || [],
      slots: rule.slots, // e.g. [{startTime: "09:00", endTime: "17:00"}]
      timezone: "America/Toronto",
    }));

    // 7. Save to 'Availability' Collection
    if (newRules.length > 0) {
      await Availability.insertMany(newRules);
    }

    // 8. Success
    return res.status(200).json({
      message: "Availability updated successfully",
      count: newRules.length,
    });
  } catch (error) {
    console.error("Update Availability Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
