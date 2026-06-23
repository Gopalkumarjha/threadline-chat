import type { Server } from "socket.io";

// Controllers (HTTP layer) need to emit socket events too — e.g. a friend
// request created via REST should still notify the receiver live. Rather
// than threading the io instance through every function call, we stash it
// here once on server boot and read it back where needed.
let ioInstance: Server | null = null;

export function setIO(io: Server) {
  ioInstance = io;
}

export function getIO(): Server | null {
  return ioInstance;
}
