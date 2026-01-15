// pages/api/auth/me.js
import dbConnect from "@/lib/db";
import User from "@/models/User";
import ServiceProvider from "@/models/ServiceProvider";
import { authMiddleware } from "@/lib/auth"; // <--- The wrapper we made earlier

async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    // 1. Connect to DB
    await dbConnect();

    // 2. Find the user
    // req.user.userId comes from the 'authMiddleware' decoding the token
    const user = await User.findOne({ user_id: req.user.userId }).select(
      "-password"
    );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    let hasOnboarded = false;
    if (user.role === "service_provider") {
      const profile = await ServiceProvider.findOne({ user_id: user.user_id });
      hasOnboarded = !!profile;
    }

    // 3. Return the user data
    return res.status(200).json({
      isAuthenticated: true,
      user: {
        id: user.user_id,
        email: user.email,
        role: user.role,
      },
      hasOnboarded: hasOnboarded,
    });
  } catch (error) {
    console.error("Auth Me Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

// 4. Wrap the handler!
// This ensures that only users with a valid Cookie can run this code.
export default authMiddleware(handler);
