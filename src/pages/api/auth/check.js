// pages/api/auth/check.js
import { authMiddleware } from "../../../lib/auth";

const handler = (req, res) => {
  // User is authenticated if we reach here
  res.status(200).json({
    loggedIn: true,
    user: req.user, // attached by authMiddleware
  });
};

export default authMiddleware(handler);
