import dbConnect from "../../../lib/mongoose";
import ServiceProvider from "../../../models/ServiceProvider";
import cookie from "cookie";
import { verifyToken } from "../../../lib/jwt"; // <-- must exist

export default async function handler(req, res) {
  await dbConnect();

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // -------------------------------
  // 1. CHECK IF USER IS LOGGED IN
  // -------------------------------
  const cookies = req.headers.cookie ? cookie.parse(req.headers.cookie) : {};
  const token = cookies.token;

  if (!token) {
    return res.status(401).json({ error: "Unauthorized. Login required." });
  }

  let userData;
  try {
    userData = verifyToken(token); // { user_id, email, role }
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  // The user who is logged in can now register as service provider
  const loggedInUserId = userData.user_id;

  // -------------------------------
  // 2. VALIDATE REQUEST BODY
  // -------------------------------
  const {
    first_name,
    last_name,
    email,
    phone_number,
    home_address,
    postal_code,
    location_latitude,
    location_longitude,
    service_levels_offered,
    service_prices,
    availability_calendar,
  } = req.body;

  if (
    !email ||
    !first_name ||
    !last_name ||
    !phone_number ||
    !home_address ||
    !postal_code ||
    !location_latitude ||
    !location_longitude ||
    !service_levels_offered ||
    !service_prices
  ) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  // -------------------------------
  // 3. CHECK IF PROVIDER ALREADY EXISTS
  // -------------------------------
  const existing = await ServiceProvider.findOne({ email });
  if (existing) {
    return res
      .status(400)
      .json({ error: "Email already registered as provider" });
  }

  try {
    // -------------------------------
    // 4. CREATE SERVICE PROVIDER (NO PASSWORD)
    // -------------------------------
    const serviceProvider = new ServiceProvider({
      first_name,
      last_name,
      email,
      phone_number,
      home_address,
      postal_code,
      location_latitude,
      location_longitude,
      service_levels_offered,
      service_prices,
      availability_calendar,
      created_by_user_id: loggedInUserId, // optional but useful
    });

    await serviceProvider.save();

    return res.status(201).json({
      message: "Service Provider profile created successfully",
      success: true,
      serviceProvider: {
        service_provider_id: serviceProvider.service_provider_id,
        email: serviceProvider.email,
        first_name: serviceProvider.first_name,
        last_name: serviceProvider.last_name,
      },
    });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ error: "Server error", details: err.message });
  }
}
