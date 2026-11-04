import { config } from "../config/index.js";
import { AppError } from "../middleware/errorHandler.js";

/**
 * Client for internal authenticated HTTP communication from Node backend to Python AI Engine.
 */
export class AIEngineClient {
  static get baseURL() {
    return config.AI_ENGINE_URL;
  }

  static get defaultHeaders() {
    return {
      "Content-Type": "application/json",
      "X-Internal-Service-Key": config.INTERNAL_SERVICE_SECRET,
    };
  }

  /**
   * Health probe verifying AI engine connectivity from Node server
   */
  static async checkHealth() {
    try {
      const res = await fetch(`${this.baseURL}/health`, {
        headers: this.defaultHeaders,
      });
      if (!res.ok) {
        throw new Error(`AI Engine health check returned status ${res.status}`);
      }
      return await res.json();
    } catch (error) {
      throw new AppError("Failed to communicate with AI Engine", 502, "AI_ENGINE_UNAVAILABLE", {
        details: error.message,
      });
    }
  }

  /**
   * Generic internal authenticated request to AI Engine
   */
  static async request(method, endpoint, data = null) {
    try {
      const url = `${this.baseURL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
      const options = {
        method,
        headers: this.defaultHeaders,
      };

      if (data && (method === "POST" || method === "PATCH" || method === "PUT")) {
        options.body = JSON.stringify(data);
      }

      const res = await fetch(url, options);
      const responseBody = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new AppError(
          responseBody?.error?.message || responseBody?.detail || "AI Engine request failed",
          res.status,
          responseBody?.error?.code || "AI_ENGINE_ERROR",
          responseBody
        );
      }

      return responseBody;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError("Failed to communicate with AI Engine", 502, "AI_ENGINE_UNAVAILABLE", {
        details: error.message,
      });
    }
  }

  static async get(endpoint) {
    return this.request("GET", endpoint);
  }

  static async post(endpoint, data = {}) {
    return this.request("POST", endpoint, data);
  }

  static async patch(endpoint, data = {}) {
    return this.request("PATCH", endpoint, data);
  }

  static async delete(endpoint) {
    return this.request("DELETE", endpoint);
  }
}
