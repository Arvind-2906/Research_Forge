import { KnowledgeGraphService } from "../services/knowledgeGraphService.js";
import {
  createNodeSchema,
  updateNodeSchema,
  createEdgeSchema,
  searchGraphSchema,
} from "../validators/knowledgeGraphValidator.js";

export class KnowledgeGraphController {
  static async createNode(req, res, next) {
    try {
      const validated = createNodeSchema.parse(req.body);
      const node = await KnowledgeGraphService.createNode(req.user.id, validated);
      res.status(201).json({ success: true, data: node });
    } catch (error) {
      next(error);
    }
  }

  static async listNodes(req, res, next) {
    try {
      const workspaceId = req.query.workspaceId;
      if (!workspaceId) {
        return res
          .status(400)
          .json({ success: false, error: { message: "workspaceId query parameter is required" } });
      }
      const paginated = await KnowledgeGraphService.listNodes(req.user.id, workspaceId, req.query);
      res.status(200).json({ success: true, ...paginated });
    } catch (error) {
      next(error);
    }
  }

  static async getNode(req, res, next) {
    try {
      const node = await KnowledgeGraphService.getNodeById(req.user.id, req.params.nodeId);
      res.status(200).json({ success: true, data: node });
    } catch (error) {
      next(error);
    }
  }

  static async updateNode(req, res, next) {
    try {
      const validated = updateNodeSchema.parse(req.body);
      const updated = await KnowledgeGraphService.updateNode(
        req.user.id,
        req.params.nodeId,
        validated
      );
      res.status(200).json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }

  static async deleteNode(req, res, next) {
    try {
      const result = await KnowledgeGraphService.deleteNode(req.user.id, req.params.nodeId);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async createEdge(req, res, next) {
    try {
      const validated = createEdgeSchema.parse(req.body);
      const edge = await KnowledgeGraphService.createEdge(req.user.id, validated);
      res.status(201).json({ success: true, data: edge });
    } catch (error) {
      next(error);
    }
  }

  static async deleteEdge(req, res, next) {
    try {
      const result = await KnowledgeGraphService.deleteEdge(req.user.id, req.params.edgeId);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async getNeighborhood(req, res, next) {
    try {
      const depth = parseInt(req.query.depth || "1", 10);
      const neighborhood = await KnowledgeGraphService.getNeighborhood(
        req.user.id,
        req.params.nodeId,
        depth
      );
      res.status(200).json({ success: true, data: neighborhood });
    } catch (error) {
      next(error);
    }
  }

  static async searchGraph(req, res, next) {
    try {
      const validated = searchGraphSchema.parse(req.body);
      const results = await KnowledgeGraphService.searchGraph(req.user.id, validated);
      res.status(200).json({ success: true, data: results });
    } catch (error) {
      next(error);
    }
  }

  static async populateFromRun(req, res, next) {
    try {
      const result = await KnowledgeGraphService.populateFromRun(
        req.user.id,
        req.params.runId
      );
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}

