// pages/api/auth/logout.js
import { logoutUser } from "../../../lib/auth";

export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Clear cookie
  logoutUser(res);

  res.status(200).json({ message: "Logged out successfully" });
}
