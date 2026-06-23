import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash("password123", 12);

  const alice = await prisma.user.upsert({
    where: { email: "alice@example.com" },
    update: {},
    create: {
      name: "Alice Johnson",
      username: "alice",
      email: "alice@example.com",
      password,
      bio: "Product designer, coffee enthusiast.",
    },
  });

  const bob = await prisma.user.upsert({
    where: { email: "bob@example.com" },
    update: {},
    create: {
      name: "Bob Martinez",
      username: "bob",
      email: "bob@example.com",
      password,
      bio: "Backend engineer.",
    },
  });

  const carol = await prisma.user.upsert({
    where: { email: "carol@example.com" },
    update: {},
    create: {
      name: "Carol Nguyen",
      username: "carol",
      email: "carol@example.com",
      password,
    },
  });

  await prisma.friend.createMany({
    data: [
      { userId: alice.id, friendId: bob.id },
      { userId: bob.id, friendId: alice.id },
    ],
  });

  const directConvo = await prisma.conversation.create({
    data: {
      type: "DIRECT",
      members: { create: [{ userId: alice.id }, { userId: bob.id }] },
    },
  });

  await prisma.message.createMany({
    data: [
      { conversationId: directConvo.id, senderId: alice.id, content: "Hey Bob! 👋" },
      { conversationId: directConvo.id, senderId: bob.id, content: "Hey Alice! How's it going?" },
    ],
  });

  const group = await prisma.conversation.create({
    data: {
      type: "GROUP",
      name: "Project Phoenix",
      description: "Coordination channel for the Phoenix launch.",
      members: {
        create: [
          { userId: alice.id, role: "ADMIN" },
          { userId: bob.id },
          { userId: carol.id },
        ],
      },
    },
  });

  await prisma.message.create({
    data: {
      conversationId: group.id,
      senderId: alice.id,
      content: "Welcome to Project Phoenix everyone!",
    },
  });

  console.log("Seed complete. Demo accounts (password: password123):");
  console.log("  alice@example.com");
  console.log("  bob@example.com");
  console.log("  carol@example.com");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
