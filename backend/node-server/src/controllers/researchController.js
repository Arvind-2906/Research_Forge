import { ResearchService } from "../services/researchService.js";
import { createRunSchema } from "../validators/researchValidator.js";
import { config } from "../config/index.js";
import { prisma } from "../services/prisma.js";
import { logger } from "../utils/logger.js";

export class ResearchController {
  static async createRun(req, res, next) {
    try {
      const validated = createRunSchema.parse(req.body);
      const run = await ResearchService.createRun(req.user.id, validated);
      res.status(201).json({ success: true, data: run });
    } catch (error) {
      next(error);
    }
  }

  static async listRuns(req, res, next) {
    try {
      const paginated = await ResearchService.listRuns(req.user.id, req.query);
      res.status(200).json({ success: true, ...paginated });
    } catch (error) {
      next(error);
    }
  }

  static async getRunById(req, res, next) {
    try {
      const run = await ResearchService.getRunById(req.params.runId, req.user.id);
      res.status(200).json({ success: true, data: run });
    } catch (error) {
      next(error);
    }
  }

  static async startRun(req, res, next) {
    try {
      const result = await ResearchService.startRun(req.params.runId, req.user.id);
      res.status(200).json({ success: true, data: result.run, message: result.message });
    } catch (error) {
      next(error);
    }
  }

  static async pauseRun(req, res, next) {
    try {
      const run = await ResearchService.pauseRun(req.params.runId, req.user.id);
      res.status(200).json({ success: true, data: run });
    } catch (error) {
      next(error);
    }
  }

  static async resumeRun(req, res, next) {
    try {
      const run = await ResearchService.resumeRun(req.params.runId, req.user.id);
      res.status(200).json({ success: true, data: run });
    } catch (error) {
      next(error);
    }
  }

  static async cancelRun(req, res, next) {
    try {
      const run = await ResearchService.cancelRun(req.params.runId, req.user.id);
      res.status(200).json({ success: true, data: run });
    } catch (error) {
      next(error);
    }
  }

  static async retryRun(req, res, next) {
    try {
      const result = await ResearchService.retryRun(req.params.runId, req.user.id);
      res.status(200).json({ success: true, data: result.run, message: result.message });
    } catch (error) {
      next(error);
    }
  }

  static async getEvents(req, res, next) {
    try {
      if (req.query.stream === "true" || req.headers.accept?.includes("text/event-stream")) {
        return await ResearchController.streamEvents(req, res, next);
      }
      const paginated = await ResearchService.getRunEvents(req.params.runId, req.user.id, req.query);
      res.status(200).json({ success: true, ...paginated });
    } catch (error) {
      next(error);
    }
  }

  static async streamEvents(req, res, next) {
    try {
      await ResearchService.validateRunAccess(req.params.runId, req.user.id);

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no");
      res.flushHeaders?.();

      const lastEventId = req.headers["last-event-id"] || req.query.last_event_id;
      const abortController = new AbortController();

      req.on("close", () => {
        abortController.abort();
      });

      // Forward live stream to Python AI Engine SSE endpoint
      let proxiedSuccessfully = false;
      try {
        const queryParams = new URLSearchParams();
        if (lastEventId) queryParams.set("last_event_id", String(lastEventId));
        if (req.query.after_sequence) queryParams.set("after_sequence", String(req.query.after_sequence));

        const queryString = queryParams.toString() ? `?${queryParams.toString()}` : "";
        const url = `${config.AI_ENGINE_URL}/api/v1/research/${req.params.runId}/events${queryString}`;

        const upstreamRes = await fetch(url, {
          headers: {
            "X-Internal-Service-Key": config.INTERNAL_SERVICE_SECRET,
            "Accept": "text/event-stream",
            ...(lastEventId ? { "Last-Event-ID": String(lastEventId) } : {}),
          },
          signal: abortController.signal,
        });

        if (upstreamRes.ok && upstreamRes.body) {
          proxiedSuccessfully = true;
          const reader = upstreamRes.body.getReader();
          const decoder = new TextDecoder();

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            res.write(chunk);
          }
          res.end();
          return;
        }
      } catch (err) {
        if (abortController.signal.aborted) return;
        logger.warn(`[SSE Proxy] AI Engine SSE stream unreachable (${err.message}). Using database fallback stream.`);
      }

      // Fallback: Replay existing events from Postgres database and maintain heartbeat
      if (!proxiedSuccessfully && !abortController.signal.aborted) {
        const where = {
          runId: req.params.runId,
          ...(lastEventId && !isNaN(Number(lastEventId)) ? { sequence: { gt: Number(lastEventId) } } : {}),
        };

        const events = await prisma.researchEvent.findMany({
          where,
          orderBy: { sequence: "asc" },
          take: 1000,
        });

        for (const evt of events) {
          res.write(`id: ${evt.id}\n`);
          res.write(`event: ${evt.eventType}\n`);
          res.write(`data: ${JSON.stringify(evt)}\n\n`);
        }

        const heartbeatInterval = setInterval(() => {
          if (!res.writableEnded) {
            res.write(`event: ping\ndata: ${JSON.stringify({ ping: true, runId: req.params.runId })}\n\n`);
          }
        }, 15000);
        heartbeatInterval.unref?.();

        req.on("close", () => {
          clearInterval(heartbeatInterval);
        });
      }
    } catch (error) {
      next(error);
    }
  }

  static async getTasks(req, res, next) {
    try {
      const tasks = await ResearchService.getRunTasks(req.params.runId, req.user.id);
      res.status(200).json({ success: true, data: tasks });
    } catch (error) {
      next(error);
    }
  }

  static async getAgents(req, res, next) {
    try {
      const agents = await ResearchService.getRunAgents(req.params.runId, req.user.id);
      res.status(200).json({ success: true, data: agents });
    } catch (error) {
      next(error);
    }
  }

  static async getSources(req, res, next) {
    try {
      const sources = await ResearchService.getRunSources(req.params.runId, req.user.id);
      res.status(200).json({ success: true, data: sources });
    } catch (error) {
      next(error);
    }
  }

  static async getEvidence(req, res, next) {
    try {
      const evidence = await ResearchService.getRunEvidence(req.params.runId, req.user.id);
      res.status(200).json({ success: true, data: evidence });
    } catch (error) {
      next(error);
    }
  }

  static async getReport(req, res, next) {
    try {
      const report = await ResearchService.getRunReport(req.params.runId, req.user.id);
      res.status(200).json({ success: true, data: report });
    } catch (error) {
      next(error);
    }
  }
}
