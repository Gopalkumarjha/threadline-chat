import { prisma } from "../config/prisma";
import { HttpError } from "../utils/asyncHandler";

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

export async function listUsers(search: string | undefined, excludeUserId: string) {
  return prisma.user.findMany({
    where: {
      id: { not: excludeUserId },
      ...(search
        ? {
            OR: [
              { username: { contains: search } },
              { name: { contains: search } },
            ],
          }
        : {}),
    },
    select: PUBLIC_USER_SELECT,
    take: 20,
    orderBy: { username: "asc" },
  });
}

export async function getUserById(id: string) {
  const user = await prisma.user.findUnique({ where: { id }, select: PUBLIC_USER_SELECT });
  if (!user) throw new HttpError(404, "User not found");
  return user;
}

export async function updateUserProfile(
  id: string,
  data: { name?: string; bio?: string; statusMessage?: string; avatar?: string }
) {
  return prisma.user.update({
    where: { id },
    data,
    select: PUBLIC_USER_SELECT,
  });
}
