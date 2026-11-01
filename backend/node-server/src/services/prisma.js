import { PrismaClient } from "@prisma/client";
import { logger } from "../utils/logger.js";

const prismaClientSingleton = () => {
  const client = new PrismaClient({
    log: [
      { emit: "event", level: "query" },
      { emit: "event", level: "error" },
      { emit: "event", level: "info" },
      { emit: "event", level: "warn" },
    ],
  });

  client.$on("error", (e) => {
    logger.error(`[Prisma Error] ${e.message}`, { target: e.target });
  });

  client.$on("warn", (e) => {
    logger.warn(`[Prisma Warn] ${e.message}`);
  });

  return client;
};

const globalForPrisma = globalThis;
export const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

/**
 * Validates database connectivity
 */
export async function testDatabaseConnection() {
  try {
    await prisma.$queryRaw`SELECT 1 as result`;
    logger.info("[Database] Successfully connected to Neon PostgreSQL");
    return true;
  } catch (error) {
    logger.error("[Database] Failed to connect to Neon PostgreSQL", { error: error.message });
    throw error;
  }
}

