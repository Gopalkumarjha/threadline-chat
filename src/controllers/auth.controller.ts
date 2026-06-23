import type { Request, Response } from "express";
import { asyncHandler, HttpError } from "../utils/asyncHandler";
import { loginUser, registerUser, revokeRefreshToken, rotateRefreshToken, markUserOffline } from "../services/auth.service";
import type { AuthenticatedRequest } from "../types";

const REFRESH_COOKIE = "refreshToken";

// httpOnly so client-side JS (and therefore XSS) can't read the refresh
// token; sameSite=lax is enough since this is same-site cookie use plus a
// CORS'd API, not a cross-site form post we need to defend against here.
const refreshCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/api/auth",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { user, accessToken, refreshToken } = await registerUser(req.body);
  res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions);
  res.status(201).json({ user, accessToken });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { user, accessToken, refreshToken } = await loginUser(req.body);
  res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions);
  res.status(200).json({ user, accessToken });
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (!token) {
    throw new HttpError(401, "No refresh token provided");
  }
  const { user, accessToken, refreshToken } = await rotateRefreshToken(token);
  res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions);
  res.status(200).json({ user, accessToken });
});

export const logout = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (token) {
    await revokeRefreshToken(token);
  }
  if (req.user?.sub) {
    await markUserOffline(req.user.sub);
  }
  res.clearCookie(REFRESH_COOKIE, { path: "/api/auth" });
  res.status(200).json({ message: "Logged out" });
});

// STUB — PRD requires email-based password reset. Sending real email needs
// an SMTP/provider credential we don't have here, so this intentionally
// returns 501 rather than silently no-op'ing or faking success.
export const forgotPassword = asyncHandler(async (_req: Request, res: Response) => {
  res.status(501).json({
    message:
      "Not implemented: forgot-password requires an email provider (e.g. SES/SendGrid) to be configured.",
  });
});

export const resetPassword = asyncHandler(async (_req: Request, res: Response) => {
  res.status(501).json({
    message: "Not implemented: depends on forgot-password being implemented first.",
  });
});
