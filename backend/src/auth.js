import jwt from "jsonwebtoken";
import { getJwtSecret, sessionCookieName } from "./config.js";

function parseCookies(header = "") {
  return header.split(";").reduce((acc, item) => {
    const separatorIndex = item.indexOf("=");
    if (separatorIndex < 0) {
      return acc;
    }
    const key = item.slice(0, separatorIndex).trim();
    const value = item.slice(separatorIndex + 1).trim();
    if (key) {
      acc[key] = decodeURIComponent(value);
    }
    return acc;
  }, {});
}

function getTokenFromRequest(req) {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    return header.replace("Bearer ", "");
  }

  const cookies = parseCookies(req.headers.cookie || "");
  return cookies[sessionCookieName] || null;
}

export function signToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      role: user.role,
      nik: user.nik,
      name: user.name
    },
    getJwtSecret(),
    { expiresIn: "8h" }
  );
}

export function requireAuth(req, res, next) {
  const token = getTokenFromRequest(req);
  if (!token) {
    return res.status(401).json({ message: "Token tidak ditemukan." });
  }

  try {
    const payload = jwt.verify(token, getJwtSecret());
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
