import dbConnect from "../../lib/mongoose";
import User from "../../models/User";
import bcrypt from "bcryptjs";
import { signToken } from "../../lib/jwt";

export default async function handler(req, res) {
  await dbConnect();

  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const { email, password, role } = req.body;

  if (!email || !password)
    return res.status(400).json({ error: "email, and password required" });

  const existing = await User.findOne({ email });
  if (existing)
    return res.status(400).json({ error: "Email already registered" });

  // Hash the password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create user
  const user = await User.create({
    email,
    password: hashedPassword,
    role: role,
  });

  // Sign JWT
  const token = signToken({ id: user._id, email: user.email, role: user.role });

  // Send HTTP-only cookie
  res.setHeader(
    "Set-Cookie",
    `token=${token}; HttpOnly; Path=/; Max-Age=604800` // 7 days
  );

  res.status(201).json({
    message: "User created successfully",
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    token,
  });
}
