import type { Response } from "express";
import { asyncHandler, HttpError } from "../utils/asyncHandler";
import * as friendService from "../services/friend.service";
import type { AuthenticatedRequest } from "../types";
import { getIO } from "../sockets/io";

export const sendRequest = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { receiverId } = req.body;
  if (!receiverId) throw new HttpError(400, "receiverId is required");

  const request = await friendService.sendFriendRequest(req.user!.sub, receiverId);

  // Notify the receiver in real time if they're connected.
  getIO()?.to(`user:${receiverId}`).emit("notification_new", {
    type: "friend_request",
    request,
  });

  res.status(201).json({ request });
});

export const acceptRequest = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { requestId } = req.body;
  if (!requestId) throw new HttpError(400, "requestId is required");

  const request = await friendService.respondToFriendRequest(requestId, req.user!.sub, true);
  getIO()?.to(`user:${request.senderId}`).emit("notification_new", {
    type: "friend_request_accepted",
    request,
  });

  res.json({ request });
});

export const rejectRequest = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { requestId } = req.body;
  if (!requestId) throw new HttpError(400, "requestId is required");

  const request = await friendService.respondToFriendRequest(requestId, req.user!.sub, false);
  res.json({ request });
});

export const listFriends = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const friends = await friendService.listFriends(req.user!.sub);
  res.json({ friends });
});

export const listIncoming = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const requests = await friendService.listIncomingRequests(req.user!.sub);
  res.json({ requests });
});

export const removeFriend = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { friendId } = req.body;
  if (!friendId) throw new HttpError(400, "friendId is required");
  await friendService.removeFriend(req.user!.sub, friendId);
  res.json({ message: "Friend removed" });
});
