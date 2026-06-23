import type { Request } from "express";

// Minimal shape we attach to req.user after verifying the access token.
// Deliberately not the full Prisma User — keeps the token payload small and
// avoids accidentally trusting stale data (role/status) baked into an old JWT.
export interface AuthTokenPayload {
  sub: string; // user id
  username: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthTokenPayload;
}

export interface ApiError {
  message: string;
  details?: unknown;
}
