import dbConnect from "../../../lib/mongoose";
import bcrypt from "bcryptjs";
import { signToken } from "../../../lib/jwt";

import ServiceProvider from "../../../models/ServiceProvider";

export default async function handler(req, res) {
  await dbConnect();

  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const {
    first_name,
    last_name,
    email,
    password,
    phone_number,
    home_address,
    postal_code,
    location_latitude,
    location_longitude,
    service_levels_offered,
    service_prices,
    availability_calendar,
  } = req.body;

  // Validate required fields
  if (!email || !password || !first_name || !last_name)
    return res.status(400).json({ error: "Missing required fields" });

  // Check if email already exists
  const existing = await ServiceProvider.findOne({ email });
  if (existing)
    return res.status(400).json({ error: "Email already registered" });

  try {
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create ServiceProvider
    const serviceProvider = new ServiceProvider({
      first_name,
      last_name,
      email,
      password: hashedPassword,
      phone_number,
      home_address,
      postal_code,
      location_latitude,
      location_longitude,
      service_levels_offered,
      service_prices,
      availability_calendar,
    });

    await serviceProvider.save();

    // Sign JWT
    const token = signToken({
      user_id: serviceProvider.service_provider_id,
      email: serviceProvider.email,
      role: "Service Provider",
    });

    // Send HTTP-only cookie
    res.setHeader(
      "Set-Cookie",
      `token=${token}; HttpOnly; Path=/; Max-Age=604800` // 7 days
    );

    res.status(201).json({
      message: "Service Provider registered successfully",
      success: true,
      serviceProvider: {
        service_provider_id: serviceProvider.service_provider_id,
        email: serviceProvider.email,
        first_name: serviceProvider.first_name,
        last_name: serviceProvider.last_name,
        role: "Service Provider",
      },
      token,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
}
