import { PrismaClient } from "@prisma/client";

// Reuse a single PrismaClient instance across the app. In dev with tsx watch,
// hot-reloads would otherwise create a new client (and new connection pool)
// on every file save, eventually exhausting Postgres connections.
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma =
  global.__prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV === "development") {
  global.__prisma = prisma;
}
