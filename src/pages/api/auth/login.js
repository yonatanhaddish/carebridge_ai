import dbConnect from "../../../lib/mongoose";
import User from "../../../models/User";
import bcrypt from "bcryptjs";
import { signToken } from "../../../lib/jwt";

export default async function handler(req, res) {
  await dbConnect();

  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const { email, password } = req.body;

  console.log("1111111", { email, password });

  if (!email || !password)
    return res.status(400).json({ error: "email, and password required" });

  const user = await User.findOne({ email });
  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ error: "Invalid credentials" });

  // Sign JWT
  const token = signToken({ id: user._id, email: user.email });

  // Send HTTP-only cookie
  res.setHeader(
    "Set-Cookie",
    `token=${token}; HttpOnly; Path=/; Max-Age=604800`
  );

  res.status(201).json({
    message: "User login successfully",
    success: true,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    token,
  });
}
