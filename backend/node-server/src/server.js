import app from "./app.js";
import { config } from "./config/index.js";
import { logger } from "./utils/logger.js";
import { testDatabaseConnection, prisma } from "./services/prisma.js";

const PORT = config.PORT || 5000;

async function startServer() {
  try {
    // Verify database connectivity on boot
    await testDatabaseConnection();

    const server = app.listen(PORT, () => {
      logger.info(`[ResearchForge] Node server running on port ${PORT} in ${config.NODE_ENV} mode`);
    });

    const shutdown = async (signal) => {
      logger.info(`Received ${signal}. Shutting down gracefully...`);
      server.close(async () => {
        await prisma.$disconnect();
        logger.info("Prisma client disconnected. Process exiting.");
        process.exit(0);
      });
    };

    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));
  } catch (error) {
    logger.error("Failed to start Node server:", { error: error.message, stack: error.stack });
    process.exit(1);
  }
}

startServer();
