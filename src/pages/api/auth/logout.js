// pages/api/auth/logout.js
import { logoutUser } from "@/lib/auth"; // <--- Using your helper!

export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // 1. Clear the cookie using your centralized helper
  logoutUser(res);

  // 2. Return success
  return res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
}
