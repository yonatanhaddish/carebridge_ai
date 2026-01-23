// pages/api/auth/login.js
import dbConnect from "@/lib/db";
import User from "@/models/User";
import ServiceProvider from "@/models/ServiceProvider";
import ServiceSeeker from "@/models/ServiceSeeker";
import { signToken } from "@/lib/jwt"; // <--- Using your helper
import { serialize } from "cookie";
import bcrypt from "bcryptjs";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    // 1. Connect to Database
    await dbConnect();

    const { email, password } = req.body;

    // 2. Validate Input
    if (!email || !password) {
      return res.status(400).json({ error: "Missing email or password" });
    }

    // 3. Find User & Get Password
    // .select("+password") is needed because password is usually hidden by default in Mongoose schemas
    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Check if Service Provider has completed onboarding
    let hasOnboarded = false;
    if (user.role === "service_provider") {
      const profile = await ServiceProvider.findOne({ user_id: user.user_id });
      hasOnboarded = !!profile;
    } else if (user.role === "service_seeker") {
      const profile = await ServiceSeeker.findOne({ user_id: user.user_id });
      hasOnboarded = !!profile;
    }

    // 4. Verify Password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // 5. Generate Token (Using your lib/jwt.js helper)
    const token = signToken({
      userId: user.user_id,
      email: user.email,
      role: user.role,
    });

    // 6. Set HttpOnly Cookie
    const cookie = serialize("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: "/",
    });

    res.setHeader("Set-Cookie", cookie);

    // 7. Return Success
    return res.status(200).json({
      message: "Login successful",
      user: {
        id: user.user_id,
        email: user.email,
        role: user.role,
      },
      hasOnboarded: hasOnboarded,
    });
  } catch (error) {
    console.error("Login Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
