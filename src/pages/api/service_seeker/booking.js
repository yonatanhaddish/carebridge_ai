import dbConnect from "../../../lib/mongoose";
import Booking from "../../../models/Booking";
import { matchProviders } from "../../../lib/matchingEngineServiceSeeker";
import cookie from "cookie";
import { verifyToken } from "../../../lib/jwt";

// --- Get logged-in user ---
function getUserFromRequest(req) {
  const cookies = req.headers.cookie ? cookie.parse(req.headers.cookie) : {};
  const token = cookies.token;
  if (!token) return null;
  return verifyToken(token);
}

export default async function handler(req, res) {
  await dbConnect();
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const user = getUserFromRequest(req);
  if (!user) return res.status(401).json({ error: "Not authenticated" });

  const { request } = req.body;
  if (!request)
    return res.status(400).json({ error: "Request object is required" });

  request.start_date = new Date(request.start_date);
  request.end_date = new Date(request.end_date);

  try {
    const { matched, conflictDetails } = await matchProviders(request);

    if (matched.length === 0) {
      return res.status(200).json({
        success: false,
        message: "No available providers found",
        conflicts: conflictDetails,
      });
    }

    if (request.request_type === "list") {
      return res.status(200).json({
        success: true,
        message: `${matched.length} providers available`,
        providers: matched.map((p) => ({
          user_id: p.user_id,
          name: p.name,
          service_level: p.service_level,
        })),
        conflicts: conflictDetails,
      });
    }

    // Auto-assign first provider
    const provider = matched[0];
    const bookingData = {
      service_seeker_id: user.user_id,
      service_provider_id: provider.user_id,
      service_level: request.service_level,
      price: request.price || 0,
      start_datetime: request.start_date,
      end_datetime: request.end_date,
      recurring_booking: request.recurring
        ? {
            start_date: request.start_date,
            end_date: request.end_date,
            recurring: request.recurring,
          }
        : undefined,
      status: "Pending",
      location_address: request.location.address || "",
      location_postal_code: request.location.postal_code || "",
      location_latitude: request.location.latitude || null,
      location_longitude: request.location.longitude || null,
      notes: request.notes || "",
    };

    const booking = await Booking.create(bookingData);

    res.status(200).json({
      success: true,
      message: "Booking created successfully",
      booking,
      provider: { user_id: provider.user_id, name: provider.name },
      conflicts: conflictDetails,
    });
  } catch (err) {
    console.error("Booking Error:", err);
    res
      .status(500)
      .json({ error: "Failed to create booking", details: err.message });
  }
}
