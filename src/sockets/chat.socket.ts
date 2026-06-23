import type { Server } from "socket.io";
import { prisma } from "../config/prisma";
import { sendMessage } from "../services/message.service";
import { assertMembership } from "../services/conversation.service";
import type { AuthenticatedSocket } from "./auth.socket";

// In-memory map of userId -> count of open sockets for that user (one
// person can have multiple tabs/devices connected at once). Presence only
// flips to "offline" when the LAST socket for a user disconnects, and
// typing timers live here too since they're per-connection, ephemeral state
// that has no business being in Postgres.
const onlineSocketCounts = new Map<string, number>();
const typingTimers = new Map<string, NodeJS.Timeout>(); // key: `${conversationId}:${userId}`

const TYPING_TIMEOUT_MS = 3000;

export function registerChatSocketHandlers(io: Server) {
  io.on("connection", async (socket: AuthenticatedSocket) => {
    const userId = socket.user!.sub;

    // Personal room used for direct notifications (friend requests, being
    // added to a new conversation) regardless of which conversation is open.
    socket.join(`user:${userId}`);

    const previousCount = onlineSocketCounts.get(userId) ?? 0;
    onlineSocketCounts.set(userId, previousCount + 1);

    if (previousCount === 0) {
      await prisma.user.update({ where: { id: userId }, data: { isOnline: true } });
      const memberships = await prisma.conversationMember.findMany({
        where: { userId },
        select: { conversationId: true },
      });
      for (const { conversationId } of memberships) {
        socket.join(`conversation:${conversationId}`);
        io.to(`conversation:${conversationId}`).emit("user_online", { userId });
      }
    } else {
      // Already online elsewhere — still join this socket to its rooms so
      // it receives events, just skip the broadcast (nothing changed).
      const memberships = await prisma.conversationMember.findMany({
        where: { userId },
        select: { conversationId: true },
      });
      for (const { conversationId } of memberships) {
        socket.join(`conversation:${conversationId}`);
      }
    }

    // --- message_send: primary real-time path for sending a message ---
    socket.on(
      "message_send",
      async (
        payload: { conversationId: string; content: string; replyToId?: string },
        ack?: (response: { error?: string }) => void
      ) => {
        try {
          const message = await sendMessage(userId, payload);
          io.to(`conversation:${payload.conversationId}`).emit("message_receive", { message });
          ack?.({});
        } catch (err) {
          ack?.({ error: err instanceof Error ? err.message : "Failed to send message" });
        }
      }
    );

    // --- typing indicator: auto-clears after TYPING_TIMEOUT_MS of silence ---
    socket.on("typing_start", async (payload: { conversationId: string }) => {
      try {
        await assertMembership(payload.conversationId, userId);
      } catch {
        return; // silently ignore typing events for conversations the user isn't in
      }

      const key = `${payload.conversationId}:${userId}`;
      socket.to(`conversation:${payload.conversationId}`).emit("typing_start", {
        conversationId: payload.conversationId,
        userId,
      });

      const existing = typingTimers.get(key);
      if (existing) clearTimeout(existing);

      typingTimers.set(
        key,
        setTimeout(() => {
          io.to(`conversation:${payload.conversationId}`).emit("typing_stop", {
            conversationId: payload.conversationId,
            userId,
          });
          typingTimers.delete(key);
        }, TYPING_TIMEOUT_MS)
      );
    });

    socket.on("typing_stop", (payload: { conversationId: string }) => {
      const key = `${payload.conversationId}:${userId}`;
      const existing = typingTimers.get(key);
      if (existing) {
        clearTimeout(existing);
        typingTimers.delete(key);
      }
      socket.to(`conversation:${payload.conversationId}`).emit("typing_stop", {
        conversationId: payload.conversationId,
        userId,
      });
    });

    // --- read receipts ---
    socket.on("message_seen", async (payload: { conversationId: string; messageId: string }) => {
      try {
        await prisma.conversationMember.update({
          where: { conversationId_userId: { conversationId: payload.conversationId, userId } },
          data: { lastReadAt: new Date() },
        });
        socket.to(`conversation:${payload.conversationId}`).emit("message_seen", {
          conversationId: payload.conversationId,
          messageId: payload.messageId,
          userId,
        });
      } catch {
        // Not a member, or message/conversation gone — drop silently.
      }
    });

    // --- joining/leaving a conversation room on demand (e.g. added to a new group) ---
    socket.on("group_join", async (payload: { conversationId: string }) => {
      try {
        await assertMembership(payload.conversationId, userId);
        socket.join(`conversation:${payload.conversationId}`);
      } catch {
        // not a member — ignore
      }
    });

    socket.on("group_leave", (payload: { conversationId: string }) => {
      socket.leave(`conversation:${payload.conversationId}`);
    });

    socket.on("disconnect", async () => {
      const count = (onlineSocketCounts.get(userId) ?? 1) - 1;

      if (count <= 0) {
        onlineSocketCounts.delete(userId);
        const lastSeenAt = new Date();
        await prisma.user.update({ where: { id: userId }, data: { isOnline: false, lastSeenAt } });

        const memberships = await prisma.conversationMember.findMany({
          where: { userId },
          select: { conversationId: true },
        });
        for (const { conversationId } of memberships) {
          io.to(`conversation:${conversationId}`).emit("user_offline", { userId, lastSeenAt });
        }
      } else {
        onlineSocketCounts.set(userId, count);
      }
    });
  });
}
