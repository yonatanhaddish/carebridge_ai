import { verifyToken } from "../../../lib/jwt";
import cookie from "cookie";

export default function handler(req, res) {
  try {
    const cookies = cookie.parse(req.headers.cookie || "");
    const token = cookies.token;

    if (!token) {
      return res.json({ loggedIn: false });
    }

    const user = verifyToken(token);

    return res.json({
      loggedIn: true,
      user,
    });
  } catch (err) {
    return res.json({ loggedIn: false });
  }
}
