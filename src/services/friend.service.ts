import { prisma } from "../config/prisma";
import { HttpError } from "../utils/asyncHandler";

export async function sendFriendRequest(senderId: string, receiverId: string) {
  if (senderId === receiverId) {
    throw new HttpError(400, "You cannot send a friend request to yourself");
  }

  const receiver = await prisma.user.findUnique({ where: { id: receiverId } });
  if (!receiver) throw new HttpError(404, "User not found");

  const alreadyFriends = await prisma.friend.findUnique({
    where: { userId_friendId: { userId: senderId, friendId: receiverId } },
  });
  if (alreadyFriends) throw new HttpError(409, "You are already friends with this user");

  const existing = await prisma.friendRequest.findFirst({
    where: {
      OR: [
        { senderId, receiverId, status: "PENDING" },
        { senderId: receiverId, receiverId: senderId, status: "PENDING" },
      ],
    },
  });
  if (existing) throw new HttpError(409, "A pending friend request already exists");

  return prisma.friendRequest.create({
    data: { senderId, receiverId },
    include: { receiver: { select: { id: true, username: true, name: true, avatar: true } } },
  });
}

export async function respondToFriendRequest(
  requestId: string,
  userId: string,
  accept: boolean
) {
  const request = await prisma.friendRequest.findUnique({ where: { id: requestId } });

  if (!request) throw new HttpError(404, "Friend request not found");
  if (request.receiverId !== userId) {
    throw new HttpError(403, "You are not authorized to respond to this request");
  }
  if (request.status !== "PENDING") {
    throw new HttpError(409, "This friend request has already been resolved");
  }

  if (!accept) {
    return prisma.friendRequest.update({
      where: { id: requestId },
      data: { status: "REJECTED" },
    });
  }

  // Accepting creates both directions of the friendship in one transaction
  // so a partial write can't leave a one-sided "friendship".
  return prisma.$transaction(async (tx) => {
    const updated = await tx.friendRequest.update({
      where: { id: requestId },
      data: { status: "ACCEPTED" },
    });

    await tx.friend.createMany({
      data: [
        { userId: request.senderId, friendId: request.receiverId },
        { userId: request.receiverId, friendId: request.senderId },
      ],
    });

    return updated;
  });
}

export async function removeFriend(userId: string, friendId: string) {
  await prisma.$transaction([
    prisma.friend.deleteMany({ where: { userId, friendId } }),
    prisma.friend.deleteMany({ where: { userId: friendId, friendId: userId } }),
  ]);
}

export async function listFriends(userId: string) {
  const friends = await prisma.friend.findMany({
    where: { userId },
    include: {
      friend: {
        select: {
          id: true,
          name: true,
          username: true,
          avatar: true,
          isOnline: true,
          lastSeenAt: true,
          statusMessage: true,
        },
      },
    },
  });
  return friends.map((f) => f.friend);
}

export async function listIncomingRequests(userId: string) {
  return prisma.friendRequest.findMany({
    where: { receiverId: userId, status: "PENDING" },
    include: { sender: { select: { id: true, username: true, name: true, avatar: true } } },
    orderBy: { createdAt: "desc" },
  });
}
