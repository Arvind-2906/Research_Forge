import { AppError } from "./errorHandler.js";

/**
 * Creates an in-memory sliding-window rate limiting middleware.
 */
export function createRateLimiter(options = {}) {
  const windowMs = options.windowMs || 60 * 1000; // 1 minute default
  const max = options.max || 100; // 100 requests per window
  const message = options.message || "Too many requests, please try again later.";
  const keyGenerator =
    options.keyGenerator ||
    ((req) => req.user?.id || req.ip || req.headers["x-forwarded-for"] || "anonymous");

  // In-memory store: Map<key, number[]>
  const hitStore = new Map();

  // Periodic cleanup of stale buckets every 5 minutes
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, timestamps] of hitStore.entries()) {
      const active = timestamps.filter((t) => now - t < windowMs);
      if (active.length === 0) {
        hitStore.delete(key);
      } else {
        hitStore.set(key, active);
      }
    }
  }, 5 * 60 * 1000);
  cleanupInterval.unref?.();

  return (req, res, next) => {
    // In test environment, allow bypassing unless specifically testing rate limits
    if (process.env.NODE_ENV === "test" && !req.headers["x-test-rate-limit"]) {
      return next();
    }

    const key = keyGenerator(req);
    const now = Date.now();
    const timestamps = hitStore.get(key) || [];

    // Filter out timestamps outside current window
    const activeHits = timestamps.filter((t) => now - t < windowMs);

    // Set standard rate-limit headers
    const remaining = Math.max(0, max - activeHits.length - 1);
    const resetTime = Math.ceil((windowMs - (now - (activeHits[0] || now))) / 1000);

    res.setHeader("RateLimit-Limit", max);
    res.setHeader("RateLimit-Remaining", remaining);
    res.setHeader("RateLimit-Reset", resetTime > 0 ? resetTime : Math.ceil(windowMs / 1000));

    if (activeHits.length >= max) {
      res.setHeader("Retry-After", resetTime > 0 ? resetTime : Math.ceil(windowMs / 1000));
      return next(new AppError(message, 429, "TOO_MANY_REQUESTS", { retryAfter: resetTime }));
    }

    activeHits.push(now);
    hitStore.set(key, activeHits);
    next();
  };
}

export const generalLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 150,
  message: "Too many API requests. Please slow down.",
});

export const authLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 30,
  message: "Too many authentication requests. Please try again later.",
});

export const researchLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 30,
  message: "Too many research runs initiated. Please wait before starting another.",
});
