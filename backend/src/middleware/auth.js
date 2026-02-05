import jwt from "jsonwebtoken";

const TOKEN_SECRET = process.env.JWT_SECRET || "dev-secret-change";

export function authMiddleware(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.replace("Bearer ", "");
  if (!token) {
    return res.status(401).json({ error: "Missing token" });
  }

  try {
    const payload = jwt.verify(token, TOKEN_SECRET);
    req.user = payload;
    return next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

export function signToken(user) {
  return jwt.sign(user, TOKEN_SECRET, { expiresIn: "2h" });
}
