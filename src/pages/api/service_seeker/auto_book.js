import dbConnect from "@/lib/db";
import ServiceProvider from "@/models/ServiceProvider";
import ServiceSeeker from "@/models/ServiceSeeker";
import Booking from "@/models/Booking"; // Ensure you have this model imported
import { authMiddleware } from "@/lib/auth";

async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { userId } = req.user;
  // We receive the AI Parsed data
  const { service_level, max_distance_km, schedules, location_query } =
    req.body;

  try {
    await dbConnect();

    // 1. Get Seeker's Details
    const seeker = await ServiceSeeker.findOne({ user_id: userId });
    if (!seeker || !seeker.location) {
      return res
        .status(404)
        .json({ error: "Please complete your profile location first." });
    }

    // 2. Find the BEST Provider (Closest + Correct Level)
    const distanceMeters = (max_distance_km || 20) * 1000;

    // NOTE: In a real app, you would also check 'availability_calendar' here.
    // For MVP, we assume if they exist, they are bookable.
    const bestProvider = await ServiceProvider.findOne({
      service_level: service_level || "Level 1",
      location: {
        $near: {
          $geometry: seeker.location,
          $maxDistance: distanceMeters,
        },
      },
    });

    if (!bestProvider) {
      return res
        .status(404)
        .json({ error: "No providers found nearby to auto-book." });
    }

    // 3. Create the Booking Record
    // We default to the FIRST schedule rule found in the AI data
    const primarySchedule = schedules && schedules[0] ? schedules[0] : null;

    if (!primarySchedule) {
      return res
        .status(400)
        .json({ error: "Cannot auto-book without a specific date/time." });
    }

    const newBooking = await Booking.create({
      service_seeker_id: seeker.service_seeker_id, // assuming your schema uses custom IDs
      service_provider_id: bestProvider.service_provider_id,
      service_level: bestProvider.service_level,
      status: "Pending", // Auto-bookings start as Pending usually

      hourly_rate: bestProvider.hourly_rate,
      total_estimated_hours: 4, // Placeholder: You'd calculate this from start/end time
      total_estimated_cost: bestProvider.hourly_rate * 4,

      booking_type: primarySchedule.type,
      start_date: primarySchedule.startDate,
      end_date: primarySchedule.endDate,
      days_of_week: primarySchedule.daysOfWeek || [],
      slots: primarySchedule.slots,

      location: {
        address: location_query || seeker.home_address,
        coordinates: seeker.location.coordinates,
      },

      notes: "Auto-booked via AI Assistant",
    });

    return res.status(201).json({
      success: true,
      message: "Booking request sent successfully!",
      booking: newBooking,
      provider_name: `${bestProvider.first_name} ${bestProvider.last_name}`,
    });
  } catch (error) {
    console.error("Auto-Book Error:", error);
    return res.status(500).json({ error: "Failed to create auto-booking." });
  }
}

export default authMiddleware(handler);
