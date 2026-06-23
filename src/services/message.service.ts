import { prisma } from "../config/prisma";
import { HttpError } from "../utils/asyncHandler";
import { assertMembership } from "./conversation.service";
import type { SendMessageInput } from "../validators/message.validators";

const SENDER_SELECT = {
  id: true,
  name: true,
  username: true,
  avatar: true,
} as const;

export async function sendMessage(senderId: string, input: SendMessageInput) {
  await assertMembership(input.conversationId, senderId);

  const message = await prisma.message.create({
    data: {
      conversationId: input.conversationId,
      senderId,
      content: input.content,
      replyToId: input.replyToId,
    },
    include: {
      sender: { select: SENDER_SELECT },
      replyTo: { select: { id: true, content: true, senderId: true } },
    },
  });

  // Bumping updatedAt keeps the conversation list sorted by most-recent
  // activity without a separate "lastMessageAt" column to keep in sync.
  await prisma.conversation.update({
    where: { id: input.conversationId },
    data: { updatedAt: new Date() },
  });

  return message;
}

// Cursor-based pagination (createdAt + id tiebreak) rather than offset —
// offset pagination drifts when new messages arrive while scrolling up,
// which is exactly what happens in a live chat.
export async function listMessages(
  conversationId: string,
  userId: string,
  cursor: string | undefined,
  limit = 50
) {
  await assertMembership(conversationId, userId);

  const messages = await prisma.message.findMany({
    where: { conversationId },
    include: {
      sender: { select: SENDER_SELECT },
      replyTo: { select: { id: true, content: true, senderId: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
  });

  return messages.reverse(); // oldest-first for rendering top-to-bottom
}

export async function editMessage(messageId: string, userId: string, content: string) {
  const message = await prisma.message.findUnique({ where: { id: messageId } });
  if (!message || message.isDeleted) throw new HttpError(404, "Message not found");
  if (message.senderId !== userId) throw new HttpError(403, "You can only edit your own messages");

  return prisma.message.update({
    where: { id: messageId },
    data: { content, isEdited: true },
    include: { sender: { select: SENDER_SELECT } },
  });
}

// Soft delete: content is cleared and isDeleted flips true, but the row
// stays so other clients can render "message deleted" in place rather than
// the thread shifting around them.
export async function deleteMessage(messageId: string, userId: string) {
  const message = await prisma.message.findUnique({ where: { id: messageId } });
  if (!message || message.isDeleted) throw new HttpError(404, "Message not found");
  if (message.senderId !== userId) throw new HttpError(403, "You can only delete your own messages");

  return prisma.message.update({
    where: { id: messageId },
    data: { content: "", isDeleted: true },
  });
}

export async function markRead(conversationId: string, userId: string) {
  await assertMembership(conversationId, userId);
  return prisma.conversationMember.update({
    where: { conversationId_userId: { conversationId, userId } },
    data: { lastReadAt: new Date() },
  });
}
