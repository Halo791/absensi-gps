import "dotenv/config";
import { AppError } from "./errors.js";

export const isProduction = process.env.NODE_ENV === "production";
export const isDemoMode = (process.env.DEMO_MODE || "true").toLowerCase() === "true";

export const allowedOrigins = process.env.ALLOWED_ORIGIN
  ? process.env.ALLOWED_ORIGIN.split(",").map((item) => item.trim()).filter(Boolean)
  : null;

function resolveJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (secret) {
    return secret;
  }

  if (isDemoMode && !isProduction) {
    return "attendance-demo-secret";
  }

  throw new AppError("JWT_SECRET wajib diatur untuk environment ini.", 500);
}

export const jwtSecret = resolveJwtSecret();
