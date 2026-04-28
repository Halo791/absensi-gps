import "dotenv/config";
import { AppError } from "./errors.js";

export const isProduction =
  process.env.APP_ENV === "production" || process.env.NODE_ENV === "production";

export const sessionCookieName = "ingenio-session";
export const sessionCookieMaxAgeMs = 8 * 60 * 60 * 1000;

export const allowedOrigins = process.env.ALLOWED_ORIGIN
  ? process.env.ALLOWED_ORIGIN.split(",").map((item) => item.trim()).filter(Boolean)
  : null;

export function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (secret) {
    return secret;
  }

  if (process.env.APP_ENV === "development" || process.env.NODE_ENV !== "production") {
    return "attendance-local-secret";
  }

  throw new AppError("JWT_SECRET wajib diatur untuk environment ini.", 500);
}

export function getQrSecret() {
  return process.env.QR_SECRET || getJwtSecret();
}

export function getSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: sessionCookieMaxAgeMs
  };
}
