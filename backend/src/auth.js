import jwt from "jsonwebtoken";
import { jwtSecret } from "./config.js";

export function signToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      role: user.role,
      nik: user.nik,
      name: user.name
    },
    jwtSecret,
    { expiresIn: "8h" }
  );
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Token tidak ditemukan." });
  }

  try {
    const payload = jwt.verify(header.replace("Bearer ", ""), jwtSecret);
    req.auth = payload;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Sesi tidak valid." });
  }
}

export function requireRole(role) {
  return (req, res, next) => {
    if (req.auth?.role !== role) {
      return res.status(403).json({ message: "Akses ditolak." });
    }
    next();
  };
}
