import "dotenv/config";
import { AppError } from "./errors.js";

export const isProduction =
  process.env.NODE_ENV === "production" || process.env.CONTEXT === "production" || process.env.NETLIFY === "true";

export const allowedOrigins = process.env.ALLOWED_ORIGIN
  ? process.env.ALLOWED_ORIGIN.split(",").map((item) => item.trim()).filter(Boolean)
  : null;

function resolveJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (secret) {
    return secret;
  }

  throw new AppError("JWT_SECRET wajib diatur untuk environment ini.", 500);
}

export const jwtSecret = resolveJwtSecret();
export const qrSecret = process.env.QR_SECRET || jwtSecret;
