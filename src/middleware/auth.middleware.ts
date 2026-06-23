import type { NextFunction, Response } from "express";
import { verifyAccessToken } from "../utils/jwt";
import { HttpError } from "../utils/asyncHandler";
import type { AuthenticatedRequest } from "../types";

export function requireAuth(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return next(new HttpError(401, "Missing or malformed Authorization header"));
  }

  const token = header.slice("Bearer ".length);

  try {
    req.user = verifyAccessToken(token);
    next();
  } catch {
    next(new HttpError(401, "Invalid or expired access token"));
  }
}
