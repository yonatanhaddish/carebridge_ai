import dbConnect from "../../../lib/mongoose";
import User from "../../../models/User";
import bcrypt from "bcryptjs";
import { signToken } from "../../../lib/jwt";

export default async function handler(req, res) {
  await dbConnect();

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email, password } = req.body;

  console.log("LOGIN ATTEMPT:", { email });

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  // Lookup user by email
  const user = await User.findOne({ email });
  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  // Validate password
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ error: "Invalid credentials" });

  // 🔑 Sign JWT using UUID instead of _id
  const token = signToken({
    user_id: user.user_id,
    email: user.email,
    role: user.role,
  });

  // Send HTTP-only cookie (7 days)
  res.setHeader(
    "Set-Cookie",
    `token=${token}; HttpOnly; Path=/; Max-Age=604800; Secure; SameSite=Strict`
  );

  // Response
  res.status(200).json({
    message: "User login successful",
    success: true,
    user: {
      user_id: user.user_id,
      email: user.email,
      role: user.role,
    },
    token,
  });
}
