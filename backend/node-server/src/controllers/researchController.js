import { ResearchService } from "../services/researchService.js";
import { createRunSchema } from "../validators/researchValidator.js";

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
      const paginated = await ResearchService.getRunEvents(req.params.runId, req.user.id, req.query);
      res.status(200).json({ success: true, ...paginated });
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

