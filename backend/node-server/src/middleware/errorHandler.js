import { logger } from "../utils/logger.js";
import { sanitizeSecrets } from "../utils/security.js";

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
  const rawMessage = err.message || "An unexpected internal server error occurred";
  const message = sanitizeSecrets(rawMessage);

  logger.error(`[${req.method}] ${req.url} -> ${statusCode} ${message}`, {
    code,
    statusCode,
    path: req.originalUrl,
    method: req.method,
    stack: process.env.NODE_ENV === "development" ? sanitizeSecrets(err.stack) : undefined,
  });

  const sanitizedDetails = err.details ? sanitizeSecrets(err.details) : undefined;

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      code,
      ...(sanitizedDetails ? { details: sanitizedDetails } : {}),
    },
    timestamp: new Date().toISOString(),
  });
}

