// pages/api/auth/signup.js
import dbConnect from "@/lib/db";
import User from "@/models/User";
import { signToken } from "@/lib/jwt";
import { serialize } from "cookie";
import bcrypt from "bcryptjs";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    // 1. Connect to Database
    await dbConnect();

    const { email, password, role } = req.body;

    // 2. Validate Input
    if (!email || !password || !role) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // 3. Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ error: "User already exists" });
    }

    // 4. Hash Password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 5. Create User
    const newUser = await User.create({
      email,
      password: hashedPassword,
      role, // "service_provider" or "client"
    });

    // 6. Generate Token (Using your lib/jwt.js helper)
    const token = signToken({
      userId: newUser.user_id,
      email: newUser.email,
      role: newUser.role,
    });

    // 7. Set HttpOnly Cookie
    const cookie = serialize("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // HTTPS only in prod
      sameSite: "strict",
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: "/", // Valid for the whole site
    });

    res.setHeader("Set-Cookie", cookie);

    // 8. Return Success (No token in body, it's in the cookie!)
    return res.status(201).json({
      message: "User created successfully",
      user: {
        id: newUser.user_id,
        email: newUser.email,
        role: newUser.role,
      },
    });
  } catch (error) {
    console.error("Signup Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
