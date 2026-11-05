import net from "net";
import { URL } from "url";

/**
 * Checks whether an IP address belongs to a private, loopback, or link-local range.
 */
export function isPrivateOrLoopbackIP(ip) {
  if (!net.isIP(ip)) return false;

  // IPv4 Loopback (127.0.0.0/8)
  if (ip.startsWith("127.")) return true;

  // IPv4 Private (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)
  if (ip.startsWith("10.")) return true;
  if (ip.startsWith("192.168.")) return true;
  if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip)) return true;

  // IPv4 Link-Local (169.254.0.0/16)
  if (ip.startsWith("169.254.")) return true;

  // IPv4 Broadcast / Current host
  if (ip === "0.0.0.0" || ip === "255.255.255.255") return true;

  // IPv6 Loopback (::1) and Unique Local (fc00::/7) and Link-Local (fe80::/10)
  if (ip === "::1" || ip === "::") return true;
  if (ip.toLowerCase().startsWith("fc") || ip.toLowerCase().startsWith("fd")) return true;
  if (ip.toLowerCase().startsWith("fe80:")) return true;

  return false;
}

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "metadata.google.internal",
  "169.254.169.254",
  "instance-data",
]);

/**
 * Validates a target URL against SSRF attacks
 */
export function isSafeUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== "string") return false;

  try {
    const parsed = new URL(rawUrl.trim());
    const protocol = parsed.protocol.toLowerCase();
    if (protocol !== "http:" && protocol !== "https:") return false;

    const hostname = parsed.hostname.toLowerCase();
    if (!hostname || BLOCKED_HOSTNAMES.has(hostname)) return false;

    if (isPrivateOrLoopbackIP(hostname)) return false;

    // Reject localhost-like internal suffixes
    if (
      hostname.endsWith(".local") ||
      hostname.endsWith(".internal") ||
      hostname.endsWith(".localhost")
    ) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

const SENSITIVE_KEYS = new Set([
  "password",
  "secret",
  "token",
  "apikey",
  "api_key",
  "authorization",
  "cookie",
  "bearer",
  "access_token",
  "refresh_token",
  "internal_service_secret",
]);

/**
 * Recursively sanitizes sensitive credential keys from objects or strings
 */
export function sanitizeSecrets(data, depth = 0) {
  if (depth > 6 || data == null) return data;

  if (typeof data === "string") {
    // Scrub URL credentials: postgresql://user:password@host
    let scrubbed = data.replace(
      /(:\/\/[^:]+:)[^@]+(@)/g,
      "$1[REDACTED_PASSWORD]$2"
    );
    // Scrub bearer tokens
    scrubbed = scrubbed.replace(
      /(bearer\s+)[a-zA-Z0-9_\-\.]{15,}/gi,
      "$1[REDACTED_TOKEN]"
    );
    return scrubbed;
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeSecrets(item, depth + 1));
  }

  if (typeof data === "object") {
    const cleaned = {};
    for (const [key, val] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      if (
        SENSITIVE_KEYS.has(lowerKey) ||
        lowerKey.includes("secret") ||
        lowerKey.includes("password") ||
        lowerKey.includes("token") ||
        lowerKey.includes("apikey") ||
        lowerKey.includes("api_key")
      ) {
        cleaned[key] = "[REDACTED]";
      } else {
        cleaned[key] = sanitizeSecrets(val, depth + 1);
      }
    }
    return cleaned;
  }

  return data;
}
