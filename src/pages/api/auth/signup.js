import dbConnect from "../../../lib/mongoose";
import User from "../../../models/User";
import bcrypt from "bcryptjs";
import { signToken } from "../../../lib/jwt";

export default async function handler(req, res) {
  await dbConnect();

  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const { email, password, role } = req.body;

  // Validation
  if (!email || !password || !role)
    return res
      .status(400)
      .json({ error: "email, password, and role are required" });

  // Check if email exists
  const existing = await User.findOne({ email });
  if (existing)
    return res.status(400).json({ error: "Email already registered" });

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create user (UUID auto-generated)
  const user = await User.create({
    email,
    password: hashedPassword,
    role,
  });

  // Generate JWT with UUID instead of _id
  const token = signToken({
    user_id: user.user_id,
    email: user.email,
    role: user.role,
  });

  // Set cookie (7 days)
  res.setHeader(
    "Set-Cookie",
    `token=${token}; HttpOnly; Path=/; Max-Age=604800`
  );

  // Response
  res.status(201).json({
    message: "User created successfully",
    success: true,
    user: {
      user_id: user.user_id,
      email: user.email,
      role: user.role,
    },
    token,
  });
}
