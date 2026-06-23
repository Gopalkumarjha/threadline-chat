import type { Socket } from "socket.io";
import { verifyAccessToken } from "../utils/jwt";
import type { AuthTokenPayload } from "../types";

export interface AuthenticatedSocket extends Socket {
  user?: AuthTokenPayload;
}

// Socket.IO handshake auth: client sends the access token once at connect
// time via `io(url, { auth: { token } })` — not on every event — since
// re-verifying a JWT on every single emit would be wasted work for a
// connection that's already been authenticated.
export function socketAuthMiddleware(socket: AuthenticatedSocket, next: (err?: Error) => void) {
  const token = socket.handshake.auth?.token as string | undefined;

  if (!token) {
    return next(new Error("Authentication required: no token provided"));
  }

  try {
    socket.user = verifyAccessToken(token);
    next();
  } catch {
    next(new Error("Authentication failed: invalid or expired token"));
  }
}
