import dbConnect from "../../../lib/mongoose";
import ServiceSeeker from "../../../models/ServiceSeeker";
import cookie from "cookie";
import { verifyToken } from "../../../lib/jwt";

// Get logged-in user from JWT
function getUserFromRequest(req) {
  const cookies = req.headers.cookie ? cookie.parse(req.headers.cookie) : {};
  const token = cookies.token;
  if (!token) return null;
  return verifyToken(token);
}

export default async function handler(req, res) {
  await dbConnect();

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const user = getUserFromRequest(req);
  if (!user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const provider = await ServiceSeeker.findOne({ user_id: user.user_id });

    if (!provider) {
      return res.status(404).json({ error: "ServiceSeeker not found" });
    }

    res.status(200).json({
      success: true,
      service_provider: provider || [],
    });
  } catch (err) {
    console.error("Fetch LoggedIn User Error:", err);
    res
      .status(500)
      .json({ error: "Failed to fetch loggedIn user", details: err.message });
  }
}
