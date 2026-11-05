import express from "express";
import cors from "cors";
import { toNodeHandler } from "better-auth/node";
import { config } from "./config/index.js";
import { logger } from "./utils/logger.js";
import { auth } from "./auth/index.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { generalLimiter, authLimiter } from "./middleware/rateLimiter.js";

// Routes
import healthRouter from "./routes/health.js";
import userRouter from "./routes/userRoutes.js";
import workspaceRouter from "./routes/workspaceRoutes.js";
import projectRouter from "./routes/projectRoutes.js";
import researchRouter from "./routes/researchRoutes.js";
import planRouter from "./routes/planRoutes.js";
import reportRouter from "./routes/reportRoutes.js";
import documentRouter from "./routes/documentRoutes.js";
import memoryRouter from "./routes/memoryRoutes.js";
import knowledgeGraphRouter from "./routes/knowledgeGraphRoutes.js";
import analyticsRouter from "./routes/analyticsRoutes.js";

const app = express();

// CORS configuration
app.use(
  cors({
    origin: config.FRONTEND_URL,
    credentials: true,
  })
);

// Better Auth API routes (must be mounted before express.json body parser)
app.use("/api/auth", authLimiter);
app.all("/api/auth/*", toNodeHandler(auth));

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

// Root & health routes
app.use(healthRouter);
app.use("/api", healthRouter);

// Apply rate limiting to API routes
app.use("/api", generalLimiter);

// Domain API routes
app.use("/api/users", userRouter);
app.use("/api/workspaces", workspaceRouter);
app.use("/api/projects", projectRouter);
app.use("/api/research", researchRouter);
app.use("/api/plans", planRouter);
app.use("/api/reports", reportRouter);
app.use("/api/documents", documentRouter);
app.use("/api/memory", memoryRouter);
app.use("/api/knowledge-graph", knowledgeGraphRouter);
app.use("/api/analytics", analyticsRouter);

// Centralized error handling
app.use(errorHandler);

export default app;
