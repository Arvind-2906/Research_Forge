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
   * Generic internal authenticated POST request to AI Engine
   */
  static async post(endpoint, data = {}) {
    try {
      const url = `${this.baseURL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
      const res = await fetch(url, {
        method: "POST",
        headers: this.defaultHeaders,
        body: JSON.stringify(data),
      });

      const responseBody = await res.json();
      if (!res.ok) {
        throw new AppError(
          responseBody?.error?.message || "AI Engine execution request failed",
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
}

