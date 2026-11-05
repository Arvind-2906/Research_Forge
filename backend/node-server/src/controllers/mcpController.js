import { MCPService } from "../services/mcpService.js";

export class MCPController {
  static async getServers(req, res, next) {
    try {
      const workspaceId = req.headers["x-workspace-id"] || req.query.workspaceId;
      const servers = await MCPService.listServers(workspaceId);
      res.json({
        success: true,
        data: servers,
        error: null,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getTools(req, res, next) {
    try {
      const workspaceId = req.headers["x-workspace-id"] || req.query.workspaceId;
      const tools = await MCPService.listTools(workspaceId);
      res.json({
        success: true,
        data: tools,
        error: null,
      });
    } catch (error) {
      next(error);
    }
  }

  static async executeTool(req, res, next) {
    try {
      const workspaceId = req.headers["x-workspace-id"] || req.body.workspaceId;
      const userId = req.user?.id;
      const result = await MCPService.executeTool({
        ...req.body,
        userId,
        workspaceId,
      });
      res.json({
        success: true,
        data: result,
        error: null,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getCalls(req, res, next) {
    try {
      const workspaceId = req.headers["x-workspace-id"] || req.query.workspaceId;
      const limit = parseInt(req.query.limit, 10) || 20;
      const page = parseInt(req.query.page, 10) || 1;
      const offset = (page - 1) * limit;

      const result = await MCPService.listToolCalls(workspaceId, { limit, offset });
      res.json({
        success: true,
        data: result.calls,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: Math.ceil(result.total / limit),
        },
        error: null,
      });
    } catch (error) {
      next(error);
    }
  }
}

