import dbConnect from "@/lib/db";
import ServiceProvider from "@/models/ServiceProvider"; // We update this model now
import jwt from "jsonwebtoken";
import cookie from "cookie";

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method Not Allowed" });

  // 1. Auth Check
  let userId;
  try {
    const cookies = cookie.parse(req.headers.cookie || "");
    const token = cookies.token;
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    userId = decoded.userId;
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }

  const { schedules, mode = "append" } = req.body;

  try {
    await dbConnect();

    // 2. Prepare the data objects
    // We map them to match the structure expected inside 'availability_calendar.schedules'
    const newRules = schedules.map((rule) => ({
      type: rule.type, // "specific_date" or "recurring"
      startDate: new Date(rule.startDate),
      endDate: new Date(rule.endDate),
      daysOfWeek: rule.daysOfWeek || [], // [1, 3] etc.

      // Map slots to match your sub-schema
      slots: rule.slots.map((s) => ({
        startTime: s.startTime,
        endTime: s.endTime,
      })),

      timezone: "America/Toronto",
    }));

    // 3. Update the ServiceProvider Document
    let updateOperation = {};

    if (mode === "replace") {
      // REPLACE: Overwrite the entire array
      updateOperation = {
        $set: { "availability_calendar.schedules": newRules },
      };
    } else {
      // APPEND: Add to the existing array
      updateOperation = {
        $push: { "availability_calendar.schedules": { $each: newRules } },
      };
    }

    // Execute the Update
    const result = await ServiceProvider.findOneAndUpdate(
      { user_id: userId }, // Find the profile by user_id
      updateOperation,
      { new: true } // Return the updated document
    );

    if (!result) {
      return res.status(404).json({ error: "Profile not found" });
    }

    return res.status(200).json({
      success: true,
      count: newRules.length,
      updatedCalendar: result.availability_calendar,
    });
  } catch (error) {
    console.error("Save Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
