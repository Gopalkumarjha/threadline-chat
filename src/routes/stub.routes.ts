import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";

// STUB ROUTES — schema and Socket.IO event names for these features exist
// (see prisma/schema.prisma and sockets/), but the request handling is not
// implemented in this pass. Each returns 501 with a note on what's needed
// to finish it, rather than a misleading 200 or a 404 that looks like the
// route doesn't exist.

export const uploadRoutes = Router();
uploadRoutes.use(requireAuth);
uploadRoutes.post("/", (_req, res) => {
  res.status(501).json({
    message:
      "Not implemented: file upload needs S3-compatible storage credentials " +
      "(bucket, region, access key) wired into a multer-s3 or @aws-sdk/client-s3 handler.",
  });
});

export const reactionRoutes = Router();
reactionRoutes.use(requireAuth);
reactionRoutes.post("/", (_req, res) => {
  res.status(501).json({
    message: "Not implemented: add/remove reaction. Reaction model exists in schema.prisma.",
  });
});

export const notificationRoutes = Router();
notificationRoutes.use(requireAuth);
notificationRoutes.get("/", (_req, res) => {
  res.status(501).json({
    message: "Not implemented: persisted notification list. Notification model exists in schema.prisma.",
  });
});

export const adminRoutes = Router();
adminRoutes.use(requireAuth);
adminRoutes.use((_req, res) => {
  res.status(501).json({
    message:
      "Not implemented: admin moderation endpoints (ban/suspend/delete message/delete group/reports). " +
      "Needs a role-check middleware (req.user.role === 'ADMIN') in addition to requireAuth.",
  });
});

export const searchRoutes = Router();
searchRoutes.use(requireAuth);
searchRoutes.get("/", (_req, res) => {
  res.status(501).json({
    message:
      "Not implemented: unified search across users/messages/groups with date/user/file-type filters.",
  });
});
