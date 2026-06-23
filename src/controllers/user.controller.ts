import type { Response } from "express";
import { asyncHandler, HttpError } from "../utils/asyncHandler";
import * as userService from "../services/user.service";
import type { AuthenticatedRequest } from "../types";

export const getUsers = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const search = typeof req.query.search === "string" ? req.query.search : undefined;
  const users = await userService.listUsers(search, req.user!.sub);
  res.json({ users });
});

export const getUserById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const user = await userService.getUserById(req.params.id);
  res.json({ user });
});

export const updateUser = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (req.params.id !== req.user!.sub) {
    throw new HttpError(403, "You can only update your own profile");
  }
  const { name, bio, statusMessage, avatar } = req.body;
  const user = await userService.updateUserProfile(req.params.id, {
    name,
    bio,
    statusMessage,
    avatar,
  });
  res.json({ user });
});
