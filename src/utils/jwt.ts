import jwt from "jsonwebtoken";
import crypto from "crypto";
import { env } from "../config/env";
import type { AuthTokenPayload } from "../types";

export function signAccessToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, env.jwt.accessSecret, {
    expiresIn: env.jwt.accessExpiresIn as any,
  });
}

export function verifyAccessToken(token: string): AuthTokenPayload {
  return jwt.verify(token, env.jwt.accessSecret) as AuthTokenPayload;
}

// Refresh tokens are random opaque strings, not JWTs — we store a hash of
// them in the DB and compare on rotation. This lets us revoke a single
// session (e.g. "log out this device") without needing a blocklist for JWTs.
export function generateRefreshToken(): string {
  return crypto.randomBytes(48).toString("hex");
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function refreshTokenExpiryDate(): Date {
  const days = parseInt(env.jwt.refreshExpiresIn.replace("d", ""), 10) || 7;
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}
