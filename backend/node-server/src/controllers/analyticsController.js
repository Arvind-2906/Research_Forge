import { AnalyticsService } from "../services/analyticsService.js";

export class AnalyticsController {
  static async getOverview(req, res, next) {
    try {
      const workspaceId = req.query.workspaceId;
      if (!workspaceId) {
        return res
          .status(400)
          .json({ success: false, error: { message: "workspaceId query parameter is required" } });
      }
      const data = await AnalyticsService.getOverview(workspaceId, req.user.id);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  static async getUsage(req, res, next) {
    try {
      const workspaceId = req.query.workspaceId;
      if (!workspaceId) {
        return res
          .status(400)
          .json({ success: false, error: { message: "workspaceId query parameter is required" } });
      }
      const data = await AnalyticsService.getUsage(workspaceId, req.user.id, req.query);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  static async getRuns(req, res, next) {
    try {
      const workspaceId = req.query.workspaceId;
      if (!workspaceId) {
        return res
          .status(400)
          .json({ success: false, error: { message: "workspaceId query parameter is required" } });
      }
      const data = await AnalyticsService.getRunsAnalytics(workspaceId, req.user.id);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  static async getAgents(req, res, next) {
    try {
      const workspaceId = req.query.workspaceId;
      if (!workspaceId) {
        return res
          .status(400)
          .json({ success: false, error: { message: "workspaceId query parameter is required" } });
      }
      const data = await AnalyticsService.getAgentsAnalytics(workspaceId, req.user.id);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  static async getModels(req, res, next) {
    try {
      const workspaceId = req.query.workspaceId;
      if (!workspaceId) {
        return res
          .status(400)
          .json({ success: false, error: { message: "workspaceId query parameter is required" } });
      }
      const data = await AnalyticsService.getModelsAnalytics(workspaceId, req.user.id);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  static async getMcp(req, res, next) {
    try {
      const workspaceId = req.query.workspaceId;
      if (!workspaceId) {
        return res
          .status(400)
          .json({ success: false, error: { message: "workspaceId query parameter is required" } });
      }
      const data = await AnalyticsService.getMcpAnalytics(workspaceId, req.user.id);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}

