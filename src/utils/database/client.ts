import { PrismaClient } from "@prisma/client";

const botDatabase = new PrismaClient();

export { botDatabase };
