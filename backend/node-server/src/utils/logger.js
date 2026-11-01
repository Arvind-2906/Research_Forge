/**
 * ResearchForge - Structured Logger
 * Provides consistent log levels, timestamps, and sensitive credential redaction.
 */

const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const CURRENT_LEVEL = process.env.NODE_ENV === "production" ? LOG_LEVELS.info : LOG_LEVELS.debug;

function formatLog(level, message, meta = {}) {
  const sanitizedMeta = sanitize(meta);
  const logEntry = {
    timestamp: new Date().toISOString(),
    service: "node-server",
    level,
    message,
    ...(Object.keys(sanitizedMeta).length > 0 ? { meta: sanitizedMeta } : {}),
  };

  if (process.env.NODE_ENV === "production") {
    return JSON.stringify(logEntry);
  }

  const metaStr = Object.keys(sanitizedMeta).length > 0 ? ` ${JSON.stringify(sanitizedMeta)}` : "";
  return `[${logEntry.timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`;
}

const REDACTED_KEYS = new Set([
  "password",
  "token",
  "secret",
  "apikey",
  "api_key",
  "authorization",
  "client_secret",
  "cookie",
]);

function sanitize(obj, depth = 0) {
  if (depth > 4 || obj === null || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map((item) => sanitize(item, depth + 1));

  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    if (REDACTED_KEYS.has(key.toLowerCase())) {
      result[key] = "[REDACTED]";
    } else if (typeof value === "object" && value !== null) {
      result[key] = sanitize(value, depth + 1);
    } else {
      result[key] = value;
    }
  }
  return result;
}

export const logger = {
  debug: (msg, meta) => {
    if (CURRENT_LEVEL <= LOG_LEVELS.debug) console.debug(formatLog("debug", msg, meta));
  },
  info: (msg, meta) => {
    if (CURRENT_LEVEL <= LOG_LEVELS.info) console.log(formatLog("info", msg, meta));
  },
  warn: (msg, meta) => {
    if (CURRENT_LEVEL <= LOG_LEVELS.warn) console.warn(formatLog("warn", msg, meta));
  },
  error: (msg, meta) => {
    if (CURRENT_LEVEL <= LOG_LEVELS.error) console.error(formatLog("error", msg, meta));
  },
};

