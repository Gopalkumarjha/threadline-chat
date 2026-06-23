import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../utils/asyncHandler";
import { env } from "../config/env";

// Must be registered LAST, after all routes — Express identifies error
// middleware by its 4-argument signature.
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({
      message: err.message,
      details: err.details,
    });
  }

  // Unexpected error: log full detail server-side, but never leak internals
  // (stack traces, SQL, file paths) to the client.
  console.error("Unhandled error:", err);
  res.status(500).json({
    message: "Internal server error",
    ...(env.nodeEnv === "development" && err instanceof Error
      ? { details: err.message }
      : {}),
  });
}

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.path}` });
}
