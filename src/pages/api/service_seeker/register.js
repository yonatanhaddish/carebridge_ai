import dbConnect from "../../../lib/mongoose";
import ServiceSeeker from "../../../models/ServiceSeeker";
import cookie from "cookie";
import { verifyToken } from "../../../lib/jwt"; // must exist

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
  } = req.body;

  if (
    !email ||
    !first_name ||
    !last_name ||
    !phone_number ||
    !home_address ||
    !postal_code ||
    !location_latitude ||
    !location_longitude
  ) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  // -------------------------------
  // 3. CHECK IF CLIENT ALREADY EXISTS
  // -------------------------------
  const existing = await ServiceSeeker.findOne({ email });
  if (existing) {
    return res
      .status(400)
      .json({ error: "Email already registered as client" });
  }

  try {
    // -------------------------------
    // 4. CREATE SERVICE SEEKER
    // -------------------------------
    const serviceSeeker = new ServiceSeeker({
      first_name,
      last_name,
      email,
      phone_number,
      home_address,
      postal_code,
      location_latitude,
      location_longitude,
      created_by_user_id: loggedInUserId, // optional, useful to link to logged-in user
    });

    await serviceSeeker.save();

    return res.status(201).json({
      message: "Service Seeker profile created successfully",
      success: true,
      serviceSeeker: {
        client_id: serviceSeeker.client_id,
        email: serviceSeeker.email,
        first_name: serviceSeeker.first_name,
        last_name: serviceSeeker.last_name,
      },
    });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ error: "Server error", details: err.message });
  }
}
