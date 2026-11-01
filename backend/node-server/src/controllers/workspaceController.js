import { WorkspaceService } from "../services/workspaceService.js";
import {
  createWorkspaceSchema,
  updateWorkspaceSchema,
  addMemberSchema,
  updateMemberRoleSchema,
} from "../validators/workspaceValidator.js";

export class WorkspaceController {
  static async list(req, res, next) {
    try {
      const workspaces = await WorkspaceService.listWorkspaces(req.user.id);
      res.status(200).json({ success: true, data: workspaces });
    } catch (error) {
      next(error);
    }
  }

  static async create(req, res, next) {
    try {
      const validated = createWorkspaceSchema.parse(req.body);
      const workspace = await WorkspaceService.createWorkspace(req.user.id, validated);
      res.status(201).json({ success: true, data: workspace });
    } catch (error) {
      next(error);
    }
  }

  static async getById(req, res, next) {
    try {
      const workspace = await WorkspaceService.getWorkspaceById(req.params.workspaceId, req.user.id);
      res.status(200).json({ success: true, data: workspace });
    } catch (error) {
      next(error);
    }
  }

  static async update(req, res, next) {
    try {
      const validated = updateWorkspaceSchema.parse(req.body);
      const updated = await WorkspaceService.updateWorkspace(req.params.workspaceId, req.user.id, validated);
      res.status(200).json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }

  static async delete(req, res, next) {
    try {
      const result = await WorkspaceService.deleteWorkspace(req.params.workspaceId, req.user.id);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async listMembers(req, res, next) {
    try {
      const members = await WorkspaceService.listMembers(req.params.workspaceId);
      res.status(200).json({ success: true, data: members });
    } catch (error) {
      next(error);
    }
  }

  static async addMember(req, res, next) {
    try {
      const validated = addMemberSchema.parse(req.body);
      const member = await WorkspaceService.addMember(req.params.workspaceId, req.user.id, validated);
      res.status(201).json({ success: true, data: member });
    } catch (error) {
      next(error);
    }
  }

  static async updateMemberRole(req, res, next) {
    try {
      const validated = updateMemberRoleSchema.parse(req.body);
      const updated = await WorkspaceService.updateMemberRole(
        req.params.workspaceId,
        req.params.memberId,
        validated.role
      );
      res.status(200).json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }

  static async removeMember(req, res, next) {
    try {
      const result = await WorkspaceService.removeMember(req.params.workspaceId, req.params.memberId);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}

