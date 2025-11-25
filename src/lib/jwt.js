import jwt from "jsonwebtoken";

const SECRET_KEY = process.env.JWT_SECRET;
if (!SECRET_KEY) {
  throw new Error("JWT_SECRET is not set in environment variables");
}

export function signToken(payload) {
  return jwt.sign(payload, SECRET_KEY, { expiresIn: "7d" });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, SECRET_KEY);
  } catch (err) {
    return null;
  }
}
