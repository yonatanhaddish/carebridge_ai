// src/lib/auth.js
import jwt from "jsonwebtoken";
import { serialize } from "cookie";

/**
 * Middleware to protect API routes.
 * Usage: export default authMiddleware(handler);
 */
export function authMiddleware(handler) {
  return async (req, res) => {
    // 1. Get token from cookies
    const token = req.cookies.token;

    if (!token) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      // 2. Verify Token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // 3. Attach user info to the request object
      req.user = {
        userId: decoded.userId,
        email: decoded.email,
      };

      // 4. Call the actual API handler
      return handler(req, res);
    } catch (err) {
      console.error("JWT verification failed:", err.message);
      return res.status(401).json({ error: "Invalid or expired token" });
    }
  };
}

/**
 * Helper to clear the cookie
 */
export function logoutUser(res) {
  const cookie = serialize("token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: -1, // Expire immediately
    path: "/",
  });

  res.setHeader("Set-Cookie", cookie);
}
