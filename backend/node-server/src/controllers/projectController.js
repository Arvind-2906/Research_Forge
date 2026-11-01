import { ProjectService } from "../services/projectService.js";
import { createProjectSchema, updateProjectSchema } from "../validators/projectValidator.js";

export class ProjectController {
  static async list(req, res, next) {
    try {
      const workspaceId = req.query.workspaceId || req.headers["x-workspace-id"];
      if (!workspaceId) {
        return res.status(400).json({
          success: false,
          error: { message: "workspaceId query parameter is required", code: "MISSING_WORKSPACE_ID" },
        });
      }

      const paginated = await ProjectService.listProjects(workspaceId, req.user.id, req.query);
      res.status(200).json({ success: true, ...paginated });
    } catch (error) {
      next(error);
    }
  }

  static async create(req, res, next) {
    try {
      const validated = createProjectSchema.parse(req.body);
      const project = await ProjectService.createProject(req.user.id, validated);
      res.status(201).json({ success: true, data: project });
    } catch (error) {
      next(error);
    }
  }

  static async getById(req, res, next) {
    try {
      const project = await ProjectService.getProjectById(req.params.projectId, req.user.id);
      res.status(200).json({ success: true, data: project });
    } catch (error) {
      next(error);
    }
  }

  static async update(req, res, next) {
    try {
      const validated = updateProjectSchema.parse(req.body);
      const updated = await ProjectService.updateProject(req.params.projectId, req.user.id, validated);
      res.status(200).json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }

  static async delete(req, res, next) {
    try {
      const result = await ProjectService.deleteProject(req.params.projectId, req.user.id);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async getRuns(req, res, next) {
    try {
      const paginated = await ProjectService.getProjectRuns(req.params.projectId, req.user.id, req.query);
      res.status(200).json({ success: true, ...paginated });
    } catch (error) {
      next(error);
    }
  }

  static async getReports(req, res, next) {
    try {
      const paginated = await ProjectService.getProjectReports(req.params.projectId, req.user.id, req.query);
      res.status(200).json({ success: true, ...paginated });
    } catch (error) {
      next(error);
    }
  }

  static async getDocuments(req, res, next) {
    try {
      const paginated = await ProjectService.getProjectDocuments(req.params.projectId, req.user.id, req.query);
      res.status(200).json({ success: true, ...paginated });
    } catch (error) {
      next(error);
    }
  }
}

