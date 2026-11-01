import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../auth/index.js";
import { config } from "../config/index.js";
import { AppError } from "./errorHandler.js";

/**
 * Middleware: Requires a valid authenticated session from Better Auth.
 * Populates req.user and req.session on success.
 */
export async function requireAuth(req, res, next) {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session || !session.user) {
      return next(
        new AppError("Authentication required to access this resource", 401, "UNAUTHORIZED")
      );
    }

    req.user = session.user;
    req.session = session.session;
    next();
  } catch (error) {
    next(new AppError("Failed to validate authentication session", 401, "INVALID_SESSION", {
      originalError: error.message,
    }));
  }
}

/**
 * Middleware: Optional authentication. Attaches user/session if present, proceeds otherwise.
 */
export async function optionalAuth(req, res, next) {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (session && session.user) {
      req.user = session.user;
      req.session = session.session;
    } else {
      req.user = null;
      req.session = null;
    }
    next();
  } catch {
    req.user = null;
    req.session = null;
    next();
  }
}

/**
 * Middleware: Requires internal service authentication key (Node <-> Python AI engine).
 */
export function requireInternalServiceAuth(req, res, next) {
  const serviceKey =
    req.headers["x-internal-service-key"] ||
    (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")
      ? req.headers.authorization.slice(7)
      : null);

  if (!serviceKey || serviceKey !== config.INTERNAL_SERVICE_SECRET) {
    return next(
      new AppError("Invalid or missing internal service credentials", 403, "FORBIDDEN")
    );
  }

  next();
}

