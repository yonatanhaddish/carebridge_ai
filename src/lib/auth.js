import { verifyToken } from "./jwt";

export function authMiddleware(handler) {
  return async (req, res) => {
    const token = req.cookies?.token;

    if (!token) return res.status(401).json({ error: "Not authenticated" });

    const decoded = verifyToken(token);
    if (!decoded) return res.status(401).json({ error: "Invalid token" });

    req.user = decoded; // attach logged-in user
    return handler(req, res);
  };
}
