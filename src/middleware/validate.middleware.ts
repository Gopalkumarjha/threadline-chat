import type { NextFunction, Request, Response } from "express";
import type { ZodSchema } from "zod";
import { HttpError } from "../utils/asyncHandler";

// Validates req.body against a Zod schema and replaces req.body with the
// parsed (and transformed, e.g. lowercased email) result, so downstream
// handlers always see clean data.
export function validateBody(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return next(
        new HttpError(400, "Validation failed", result.error.flatten().fieldErrors)
      );
    }
    req.body = result.data;
    next();
  };
}
