import type { NextFunction, Request, Response } from "express";

type AsyncHandler<T extends Request = Request> = (
  req: T,
  res: Response,
  next: NextFunction
) => Promise<unknown>;

// Express doesn't catch rejected promises from async route handlers by
// default — without this, a thrown error inside `await` would hang the
// request instead of reaching errorHandler middleware.
export function asyncHandler<T extends Request = Request>(fn: AsyncHandler<T>) {
  return (req: T, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

export class HttpError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}
