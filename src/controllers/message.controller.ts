import type { Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import * as messageService from "../services/message.service";
import type { AuthenticatedRequest } from "../types";
import { getIO } from "../sockets/io";

// HTTP send exists for completeness (and as a fallback if the socket is
// down), but the primary send path in the running app is the `message_send`
// socket event in sockets/chat.socket.ts, since that's what gets sub-500ms
// delivery to other members without a page poll.
export const sendMessage = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const message = await messageService.sendMessage(req.user!.sub, req.body);
  getIO()?.to(`conversation:${message.conversationId}`).emit("message_receive", { message });
  res.status(201).json({ message });
});

export const listMessages = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const cursor = typeof req.query.cursor === "string" ? req.query.cursor : undefined;
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
  const messages = await messageService.listMessages(
    req.params.chatId,
    req.user!.sub,
    cursor,
    limit
  );
  res.json({ messages });
});

export const editMessage = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const message = await messageService.editMessage(req.params.id, req.user!.sub, req.body.content);
  getIO()?.to(`conversation:${message.conversationId}`).emit("message_edited", { message });
  res.json({ message });
});

export const deleteMessage = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const message = await messageService.deleteMessage(req.params.id, req.user!.sub);
  getIO()?.to(`conversation:${message.conversationId}`).emit("message_deleted", {
    messageId: message.id,
    conversationId: message.conversationId,
  });
  res.json({ message });
});
