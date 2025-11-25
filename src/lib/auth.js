// src/lib/auth.js
import jwt from "jsonwebtoken";

/**
 * Middleware to protect API routes.
 * Wrap any handler with this to enforce authentication.
 */
export function authMiddleware(handler) {
  return async (req, res) => {
    const token = req.cookies?.token;

    if (!token) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = {
        user_id: decoded.user_id,
        email: decoded.email,
        role: decoded.role,
      };
      return handler(req, res);
    } catch (err) {
      console.error("JWT verification failed:", err.message);
      return res.status(401).json({ error: "Invalid token" });
    }
  };
}

/**
 * Get logged-in user from request (optional auth, non-protected route)
 */
export function getLoggedInUser(req) {
  const token = req.cookies?.token;
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return {
      user_id: decoded.user_id,
      email: decoded.email,
      role: decoded.role,
    };
  } catch {
    return null;
  }
}

/**
 * Clear JWT cookie (logout)
 */
export function logoutUser(res) {
  res.setHeader(
    "Set-Cookie",
    `token=; HttpOnly; Path=/; Max-Age=0; Secure; SameSite=Strict`
  );
}
