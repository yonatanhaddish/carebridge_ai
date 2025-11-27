import dbConnect from "../../../lib/mongoose";
import ServiceProvider from "../../../models/ServiceProvider";
import axios from "axios";
import cookie from "cookie";
import { verifyToken } from "../../../lib/jwt";

// --- Get logged-in user from JWT cookie ---
function getUserFromRequest(req) {
  const cookies = req.headers.cookie ? cookie.parse(req.headers.cookie) : {};
  const token = cookies.token;
  if (!token) return null;
  return verifyToken(token);
}

// --- AI call ---
async function parseAI(command) {
  const res = await axios.post(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/ai/parseServiceProviderCommand`,
    {
      command,
    }
  );

  return res.data.parsed;
}

export default async function handler(req, res) {
  await dbConnect();

  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const user = getUserFromRequest(req);
  if (!user) return res.status(401).json({ error: "Not authenticated" });

  const { command } = req.body;
  if (!command) return res.status(400).json({ error: "Command required" });

  let parsed;
  try {
    parsed = await parseAI(command);
  } catch (err) {
    console.error("AI Parsing Error:", err);
    return res
      .status(500)
      .json({ error: "AI failed to parse command", details: err.message });
  }

  // Validate AI output
  if (!Array.isArray(parsed) || parsed.length === 0) {
    return res
      .status(400)
      .json({ error: "Parsed AI schedule is empty or invalid" });
  }

  try {
    // Update MongoDB: push each parsed schedule entry into availability_calendar
    // const updatedProvider = await ServiceProvider.findOneAndUpdate(
    //   { user_id: user.user_id },
    //   { $push: { availability_calendar: { $each: parsed } } },
    //   { new: true }
    // );

    // if (!updatedProvider) {
    //   return res
    //     .status(404)
    //     .json({ error: "ServiceProvider not found for this user" });
    // }

    return res.json({
      success: true,
      user: { email: user.email, user_id: user.user_id },
      parsed,
    });
  } catch (err) {
    console.error("MongoDB Update Error:", err);
    return res
      .status(500)
      .json({ error: "Failed to update availability", details: err.message });
  }
}
