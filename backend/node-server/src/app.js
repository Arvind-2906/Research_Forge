import express from "express";
import cors from "cors";
import { config } from "./config/index.js";
import { logger } from "./utils/logger.js";
import { errorHandler } from "./middleware/errorHandler.js";
import healthRouter from "./routes/health.js";

const app = express();

// CORS configuration
app.use(
  cors({
    origin: config.FRONTEND_URL,
    credentials: true,
  })
);

// Body parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    logger.info(`[HTTP] ${req.method} ${req.originalUrl} ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// Root / health routes
app.use(healthRouter);
app.use("/api", healthRouter);

// Centralized error handling
app.use(errorHandler);

export default app;
