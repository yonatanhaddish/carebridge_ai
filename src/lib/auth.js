// src/lib/auth.js
import jwt from "jsonwebtoken";
import { serialize } from "cookie";

export function authMiddleware(handler) {
  return async (req, res) => {
    // 1. Get token from cookies
    // Next.js automatically parses cookies into req.cookies
    const token = req.cookies.token;

    if (!token) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      // 2. Verify Token
      // We use process.env.JWT_SECRET directly here to be explicit
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // 3. Attach user info to the request object
      // CRITICAL: This determines what "req.user" looks like in your API routes
      req.user = {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role, // Optional: Good to have if you need role-based access
      };

      // 4. Call the actual API handler
      return handler(req, res);
    } catch (err) {
      console.error("JWT verification failed:", err.message);
      return res.status(401).json({ error: "Invalid or expired token" });
    }
  };
}

export function logoutUser(res) {
  const cookie = serialize("token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: -1,
    path: "/",
  });

  res.setHeader("Set-Cookie", cookie);
}
