import { Router } from "express";
import { prisma } from "../services/prisma.js";

const router = Router();

/**
 * Basic liveness probe
 */
router.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "node-server",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

/**
 * Readiness probe - checks Neon DB connectivity
 */
router.get("/ready", async (req, res) => {
  const checks = {
    database: "pending",
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = "connected";
    return res.status(200).json({
      status: "ready",
      service: "node-server",
      checks,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    checks.database = "disconnected";
    return res.status(503).json({
      status: "not_ready",
      service: "node-server",
      checks,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;

