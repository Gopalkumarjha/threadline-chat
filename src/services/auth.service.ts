import bcrypt from "bcrypt";
import { prisma } from "../config/prisma";
import { HttpError } from "../utils/asyncHandler";
import {
  generateRefreshToken,
  hashToken,
  refreshTokenExpiryDate,
  signAccessToken,
  verifyAccessToken,
} from "../utils/jwt";
import type { LoginInput, RegisterInput } from "../validators/auth.validators";

const BCRYPT_ROUNDS = 12;

// Fields safe to send to the client — never include `password`.
const PUBLIC_USER_SELECT = {
  id: true,
  name: true,
  username: true,
  email: true,
  avatar: true,
  bio: true,
  statusMessage: true,
  isOnline: true,
  lastSeenAt: true,
  createdAt: true,
} as const;

export async function registerUser(input: RegisterInput) {
  const existing = await prisma.user.findFirst({
    where: { OR: [{ email: input.email }, { username: input.username }] },
    select: { email: true, username: true },
  });

  if (existing) {
    const field = existing.email === input.email ? "email" : "username";
    throw new HttpError(409, `An account with this ${field} already exists`);
  }

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      name: input.name,
      username: input.username,
      email: input.email,
      password: passwordHash,
    },
    select: PUBLIC_USER_SELECT,
  });

  return issueSession(user.id, user.username, user);
}

export async function loginUser(input: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });

  // Same error for "no such user" and "wrong password" — distinguishing them
  // would let an attacker enumerate registered emails.
  if (!user) {
    throw new HttpError(401, "Invalid email or password");
  }

  if (user.accountStatus === "BANNED") {
    throw new HttpError(403, "This account has been banned");
  }
  if (user.accountStatus === "SUSPENDED") {
    throw new HttpError(403, "This account is suspended");
  }

  const valid = await bcrypt.compare(input.password, user.password);
  if (!valid) {
    throw new HttpError(401, "Invalid email or password");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { isOnline: true, lastSeenAt: new Date() },
  });

  const { password: _password, ...publicUser } = user;
  return issueSession(user.id, user.username, publicUser);
}

async function issueSession(
  userId: string,
  username: string,
  publicUser: Record<string, unknown>
) {
  const accessToken = signAccessToken({ sub: userId, username });
  const refreshToken = generateRefreshToken();

  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: hashToken(refreshToken),
      expiresAt: refreshTokenExpiryDate(),
    },
  });

  return { user: publicUser, accessToken, refreshToken };
}

// Rotates a refresh token: the presented token is revoked and a new one is
// issued. This means a stolen-and-reused token will fail on its second use,
// which is the standard way to detect refresh-token replay.
export async function rotateRefreshToken(presentedToken: string) {
  const tokenHash = hashToken(presentedToken);

  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: { select: PUBLIC_USER_SELECT } },
  });

  if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
    throw new HttpError(401, "Invalid or expired refresh token");
  }

  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { revokedAt: new Date() },
  });

  return issueSession(stored.userId, stored.user.username, stored.user);
}

export async function revokeRefreshToken(presentedToken: string) {
  const tokenHash = hashToken(presentedToken);
  await prisma.refreshToken
    .updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    })
    .catch(() => {
      // Token already gone / never existed — logout should still succeed.
    });
}

export async function markUserOffline(userId: string) {
  await prisma.user.update({
    where: { id: userId },
    data: { isOnline: false, lastSeenAt: new Date() },
  });
}

export { verifyAccessToken };
