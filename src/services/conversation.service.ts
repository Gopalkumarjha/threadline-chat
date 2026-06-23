import { prisma } from "../config/prisma";
import { HttpError } from "../utils/asyncHandler";
import type { CreateConversationInput } from "../validators/message.validators";

const MEMBER_INCLUDE = {
  members: {
    include: {
      user: {
        select: {
          id: true,
          name: true,
          username: true,
          avatar: true,
          isOnline: true,
          lastSeenAt: true,
        },
      },
    },
  },
} as const;

export async function createConversation(creatorId: string, input: CreateConversationInput) {
  const memberIds = Array.from(new Set([creatorId, ...input.memberIds]));

  if (input.type === "DIRECT") {
    if (memberIds.length !== 2) {
      throw new HttpError(400, "A direct conversation must have exactly 2 members");
    }

    // Reuse an existing direct conversation between these two users instead
    // of creating a duplicate every time someone opens a DM.
    const existing = await prisma.conversation.findFirst({
      where: {
        type: "DIRECT",
        AND: memberIds.map((id) => ({ members: { some: { userId: id } } })),
      },
      include: MEMBER_INCLUDE,
    });
    if (existing) return existing;
  }

  if (input.type === "GROUP" && memberIds.length < 2) {
    throw new HttpError(400, "A group conversation needs at least 2 members");
  }

  return prisma.conversation.create({
    data: {
      type: input.type,
      name: input.type === "GROUP" ? input.name : undefined,
      description: input.type === "GROUP" ? input.description : undefined,
      members: {
        create: memberIds.map((userId) => ({
          userId,
          role: userId === creatorId && input.type === "GROUP" ? "ADMIN" : "MEMBER",
        })),
      },
    },
    include: MEMBER_INCLUDE,
  });
}

export async function listConversationsForUser(userId: string) {
  return prisma.conversation.findMany({
    where: { members: { some: { userId } } },
    include: {
      ...MEMBER_INCLUDE,
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getConversationById(conversationId: string, userId: string) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: MEMBER_INCLUDE,
  });

  if (!conversation) throw new HttpError(404, "Conversation not found");

  const isMember = conversation.members.some((m) => m.userId === userId);
  if (!isMember) throw new HttpError(403, "You are not a member of this conversation");

  return conversation;
}

export async function assertMembership(conversationId: string, userId: string) {
  const membership = await prisma.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
  });
  if (!membership) throw new HttpError(403, "You are not a member of this conversation");
  return membership;
}
