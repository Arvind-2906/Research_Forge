import { logger } from "../utils/logger.js";

/**
 * Custom application error class
 */
export class AppError extends Error {
  constructor(message, statusCode = 500, code = "INTERNAL_ERROR", details = null) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

/**
 * Centralized Express Error Handling Middleware
 */
export function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || (err.status ? Number(err.status) : 500);
  const code = err.code || "INTERNAL_ERROR";
  const message = err.message || "An unexpected internal server error occurred";

  logger.error(`[${req.method}] ${req.url} -> ${statusCode} ${message}`, {
    code,
    statusCode,
    path: req.originalUrl,
    method: req.method,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      code,
      ...(err.details ? { details: err.details } : {}),
    },
    timestamp: new Date().toISOString(),
  });
}

