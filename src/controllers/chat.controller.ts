import type { Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import * as conversationService from "../services/conversation.service";
import type { AuthenticatedRequest } from "../types";
import { getIO } from "../sockets/io";

export const createConversation = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const conversation = await conversationService.createConversation(req.user!.sub, req.body);

  // Let every member's other open tabs/devices know a new conversation
  // exists, so it shows up in their sidebar without a manual refresh.
  const io = getIO();
  if (io) {
    for (const member of conversation.members) {
      io.to(`user:${member.userId}`).emit("group_join", { conversation });
    }
  }

  res.status(201).json({ conversation });
});

export const getConversation = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const conversation = await conversationService.getConversationById(
    req.params.id,
    req.user!.sub
  );
  res.json({ conversation });
});

export const listConversations = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const conversations = await conversationService.listConversationsForUser(req.user!.sub);
  res.json({ conversations });
});
