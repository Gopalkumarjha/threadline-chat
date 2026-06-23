import express from "express";
import http from "http";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { Server } from "socket.io";

import { env } from "./config/env";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware";
import { apiLimiter } from "./middleware/rateLimit.middleware";
import { socketAuthMiddleware } from "./sockets/auth.socket";
import { registerChatSocketHandlers } from "./sockets/chat.socket";
import { setIO } from "./sockets/io";

import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/user.routes";
import friendRoutes from "./routes/friend.routes";
import chatRoutes from "./routes/chat.routes";
import messageRoutes from "./routes/message.routes";
import uploadRoutes from "./routes/upload.routes";
import {
  reactionRoutes,
  notificationRoutes,
  adminRoutes,
  searchRoutes,
} from "./routes/stub.routes";

const app = express();
const httpServer = http.createServer(app);

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(
  cors({
    origin: env.corsOrigins,
    credentials: true, // required so the refresh-token cookie is sent/received cross-origin
  })
);
app.use(express.json());
app.use(cookieParser());
app.use(apiLimiter);

app.get("/health", (_req, res) => res.json({ status: "ok" }));
import path from "path";
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/friends", friendRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/messages", messageRoutes);

// Stubbed feature areas — see routes/stub.routes.ts for what's missing.
app.use("/api/upload", uploadRoutes);
app.use("/api/reactions", reactionRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/search", searchRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

const io = new Server(httpServer, {
  cors: {
    origin: env.corsOrigins,
    credentials: true,
  },
});

io.use(socketAuthMiddleware);
registerChatSocketHandlers(io);
setIO(io);

httpServer.listen(env.port, () => {
  console.log(`Server listening on http://localhost:${env.port} (${env.nodeEnv})`);
});

// Graceful shutdown so in-flight requests/socket disconnects aren't dropped
// mid-write when the process is killed (e.g. by a deploy or Ctrl+C).
process.on("SIGTERM", () => httpServer.close(() => process.exit(0)));
process.on("SIGINT", () => httpServer.close(() => process.exit(0)));
