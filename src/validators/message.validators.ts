import { z } from "zod";

export const sendMessageSchema = z.object({
  conversationId: z.string().uuid(),
  content: z.string().trim().min(1, "Message cannot be empty").max(5000),
  replyToId: z.string().uuid().optional(),
});

export const editMessageSchema = z.object({
  content: z.string().trim().min(1, "Message cannot be empty").max(5000),
});

export const createConversationSchema = z.object({
  type: z.enum(["DIRECT", "GROUP"]),
  // For DIRECT: exactly one other user id. For GROUP: one or more.
  memberIds: z.array(z.string().uuid()).min(1),
  name: z.string().trim().min(1).max(100).optional(),
  description: z.string().trim().max(500).optional(),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type EditMessageInput = z.infer<typeof editMessageSchema>;
export type CreateConversationInput = z.infer<typeof createConversationSchema>;
