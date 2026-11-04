import { prisma } from "./prisma.js";
import { AppError } from "../middleware/errorHandler.js";
import { getPaginationParams, formatPaginatedResponse } from "../utils/pagination.js";
import { AIEngineClient } from "./aiEngineClient.js";
import { logger } from "../utils/logger.js";

export class KnowledgeGraphService {
  /**
   * Helper to ensure user has access to workspace
   */
  static async validateWorkspaceAccess(workspaceId, userId) {
    const ws = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: { members: { where: { userId } } },
    });

    if (!ws) {
      throw new AppError("Workspace not found", 404, "WORKSPACE_NOT_FOUND");
    }

    const isOwner = ws.ownerId === userId;
    const isMember = ws.members.length > 0;

    if (!isOwner && !isMember) {
      throw new AppError("Access denied to this workspace", 403, "WORKSPACE_FORBIDDEN");
    }

    return ws;
  }

  /**
   * Creates a knowledge node with semantic embedding
   */
  static async createNode(userId, data) {
    await this.validateWorkspaceAccess(data.workspaceId, userId);

    try {
      const response = await AIEngineClient.post("/api/v1/kg/nodes", {
        workspace_id: data.workspaceId,
        name: data.name,
        type: data.type || "CONCEPT",
        description: data.description,
        metadata: data.metadata,
        deduplicate: data.deduplicate ?? true,
      });
      if (response?.data) {
        return response.data;
      }
    } catch (err) {
      logger.warn(`[KnowledgeGraphService] AI Engine createNode fallback: ${err.message}`);
    }

    // Direct fallback to Prisma
    return prisma.knowledgeNode.create({
      data: {
        workspaceId: data.workspaceId,
        name: data.name,
        type: data.type || "CONCEPT",
        description: data.description,
        metadata: data.metadata,
      },
    });
  }

  /**
   * Lists nodes in a workspace
   */
  static async listNodes(userId, workspaceId, query) {
    await this.validateWorkspaceAccess(workspaceId, userId);

    const { page, limit, skip, sortBy, sortOrder } = getPaginationParams(query);

    const where = {
      workspaceId,
      ...(query.type ? { type: query.type } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: "insensitive" } },
              { description: { contains: query.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const total = await prisma.knowledgeNode.count({ where });
    const nodes = await prisma.knowledgeNode.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        _count: {
          select: { outgoingEdges: true, incomingEdges: true },
        },
      },
    });

    return formatPaginatedResponse(nodes, total, page, limit);
  }

  /**
   * Retrieves single node by ID
   */
  static async getNodeById(userId, nodeId) {
    const node = await prisma.knowledgeNode.findUnique({
      where: { id: nodeId },
      include: {
        outgoingEdges: {
          include: { targetNode: { select: { id: true, name: true, type: true } } },
        },
        incomingEdges: {
          include: { sourceNode: { select: { id: true, name: true, type: true } } },
        },
      },
    });

    if (!node) {
      throw new AppError("Knowledge node not found", 404, "NODE_NOT_FOUND");
    }

    await this.validateWorkspaceAccess(node.workspaceId, userId);
    return node;
  }

  /**
   * Updates an existing node
   */
  static async updateNode(userId, nodeId, data) {
    const node = await this.getNodeById(userId, nodeId);

    return prisma.knowledgeNode.update({
      where: { id: nodeId },
      data: {
        ...(data.name ? { name: data.name } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.type ? { type: data.type } : {}),
        ...(data.metadata ? { metadata: data.metadata } : {}),
      },
    });
  }

  /**
   * Deletes a node
   */
  static async deleteNode(userId, nodeId) {
    await this.getNodeById(userId, nodeId);

    await prisma.knowledgeNode.delete({
      where: { id: nodeId },
    });

    return { success: true, message: "Node deleted successfully" };
  }

  /**
   * Creates or updates a relationship edge between two nodes
   */
  static async createEdge(userId, data) {
    const sourceNode = await prisma.knowledgeNode.findUnique({
      where: { id: data.sourceNodeId },
    });
    const targetNode = await prisma.knowledgeNode.findUnique({
      where: { id: data.targetNodeId },
    });

    if (!sourceNode || !targetNode) {
      throw new AppError("Source or target node not found", 404, "NODE_NOT_FOUND");
    }

    if (sourceNode.workspaceId !== targetNode.workspaceId) {
      throw new AppError(
        "Cannot link nodes across different workspaces",
        400,
        "CROSS_WORKSPACE_EDGE_FORBIDDEN"
      );
    }

    await this.validateWorkspaceAccess(sourceNode.workspaceId, userId);

    return prisma.knowledgeEdge.upsert({
      where: {
        sourceNodeId_targetNodeId_relationship: {
          sourceNodeId: data.sourceNodeId,
          targetNodeId: data.targetNodeId,
          relationship: data.relationship,
        },
      },
      update: {
        description: data.description,
        weight: data.weight ?? 1.0,
        metadata: data.metadata,
      },
      create: {
        sourceNodeId: data.sourceNodeId,
        targetNodeId: data.targetNodeId,
        relationship: data.relationship,
        description: data.description,
        weight: data.weight ?? 1.0,
        metadata: data.metadata,
      },
      include: {
        sourceNode: { select: { id: true, name: true, type: true } },
        targetNode: { select: { id: true, name: true, type: true } },
      },
    });
  }

  /**
   * Deletes an edge
   */
  static async deleteEdge(userId, edgeId) {
    const edge = await prisma.knowledgeEdge.findUnique({
      where: { id: edgeId },
      include: { sourceNode: true },
    });

    if (!edge) {
      throw new AppError("Edge not found", 404, "EDGE_NOT_FOUND");
    }

    await this.validateWorkspaceAccess(edge.sourceNode.workspaceId, userId);

    await prisma.knowledgeEdge.delete({
      where: { id: edgeId },
    });

    return { success: true, message: "Edge deleted successfully" };
  }

  /**
   * Retrieves local graph neighborhood (depth 1 or 2)
   */
  static async getNeighborhood(userId, nodeId, depth = 1) {
    const centerNode = await this.getNodeById(userId, nodeId);

    const edges = await prisma.knowledgeEdge.findMany({
      where: {
        OR: [{ sourceNodeId: nodeId }, { targetNodeId: nodeId }],
      },
      include: {
        sourceNode: { select: { id: true, name: true, type: true, description: true } },
        targetNode: { select: { id: true, name: true, type: true, description: true } },
      },
    });

    const nodeMap = new Map();
    nodeMap.set(centerNode.id, {
      id: centerNode.id,
      name: centerNode.name,
      type: centerNode.type,
      description: centerNode.description,
    });

    for (const e of edges) {
      nodeMap.set(e.sourceNode.id, e.sourceNode);
      nodeMap.set(e.targetNode.id, e.targetNode);
    }

    return {
      center: centerNode,
      nodes: Array.from(nodeMap.values()),
      edges,
    };
  }

  /**
   * Executes hybrid vector and keyword search across graph nodes
   */
  static async searchGraph(userId, data) {
    await this.validateWorkspaceAccess(data.workspaceId, userId);

    try {
      const response = await AIEngineClient.post("/api/v1/kg/search", {
        workspace_id: data.workspaceId,
        query: data.query,
        node_type: data.nodeType,
        limit: data.limit || 20,
        min_similarity: data.minSimilarity || 0.3,
      });

      if (response?.data) {
        return response.data;
      }
    } catch (err) {
      logger.warn(`[KnowledgeGraphService] AI Engine searchGraph fallback: ${err.message}`);
    }

    // Direct fallback to Prisma keyword search
    return prisma.knowledgeNode.findMany({
      where: {
        workspaceId: data.workspaceId,
        ...(data.nodeType ? { type: data.nodeType } : {}),
        OR: [
          { name: { contains: data.query, mode: "insensitive" } },
          { description: { contains: data.query, mode: "insensitive" } },
        ],
      },
      take: data.limit || 20,
    });
  }

  /**
   * Auto-populates knowledge graph from a research run
   */
  static async populateFromRun(userId, runId) {
    const run = await prisma.researchRun.findUnique({
      where: { id: runId },
      include: { project: true },
    });

    if (!run) {
      throw new AppError("Research run not found", 404, "RUN_NOT_FOUND");
    }

    await this.validateWorkspaceAccess(run.project.workspaceId, userId);

    try {
      const response = await AIEngineClient.post(`/api/v1/kg/populate-from-run/${runId}`, {
        workspace_id: run.project.workspaceId,
      });
      return response.data;
    } catch (err) {
      logger.warn(`[KnowledgeGraphService] AI Engine populateFromRun error: ${err.message}`);
      throw new AppError(
        "Failed to auto-populate graph from run via AI Engine",
        502,
        "AI_ENGINE_POPULATION_FAILED",
        { details: err.message }
      );
    }
  }
}
