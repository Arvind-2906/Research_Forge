import { prisma } from "./prisma.js";
import { AppError } from "../middleware/errorHandler.js";
import { getPaginationParams, formatPaginatedResponse } from "../utils/pagination.js";
import { AIEngineClient } from "./aiEngineClient.js";

export class MemoryService {
  /**
   * Validates user has permission to read/modify a specific memory
   */
  static async validateMemoryAccess(memoryId, userId) {
    const memory = await prisma.researchMemory.findUnique({
      where: { id: memoryId },
      include: {
        workspace: {
          include: { members: { where: { userId } } },
        },
        project: {
          include: {
            workspace: {
              include: { members: { where: { userId } } },
            },
          },
        },
      },
    });

    if (!memory) {
      throw new AppError("Memory not found", 404, "MEMORY_NOT_FOUND");
    }

    if (memory.scope === "USER") {
      if (memory.userId !== userId && memory.createdById !== userId) {
        throw new AppError("Access denied to this user memory", 403, "MEMORY_FORBIDDEN");
      }
    } else if (memory.scope === "WORKSPACE") {
      const ws = memory.workspace;
      if (!ws || (ws.ownerId !== userId && ws.members.length === 0)) {
        throw new AppError("Access denied to this workspace memory", 403, "MEMORY_FORBIDDEN");
      }
    } else if (memory.scope === "PROJECT") {
      const ws = memory.project?.workspace;
      if (!ws || (ws.ownerId !== userId && ws.members.length === 0)) {
        throw new AppError("Access denied to this project memory", 403, "MEMORY_FORBIDDEN");
      }
    }

    return memory;
  }

  /**
   * Creates a new scoped research memory
   */
  static async createMemory(userId, data) {
    // Validate scope-specific authorization
    if (data.scope === "WORKSPACE") {
      if (!data.workspaceId) {
        throw new AppError("Workspace ID is required for WORKSPACE scope memory", 400, "MISSING_WORKSPACE_ID");
      }
      const ws = await prisma.workspace.findUnique({
        where: { id: data.workspaceId },
        include: { members: { where: { userId } } },
      });
      if (!ws || (ws.ownerId !== userId && ws.members.length === 0)) {
        throw new AppError("Access denied to this workspace", 403, "WORKSPACE_FORBIDDEN");
      }
    } else if (data.scope === "PROJECT") {
      if (!data.projectId) {
        throw new AppError("Project ID is required for PROJECT scope memory", 400, "MISSING_PROJECT_ID");
      }
      const project = await prisma.researchProject.findUnique({
        where: { id: data.projectId },
        include: {
          workspace: {
            include: { members: { where: { userId } } },
          },
        },
      });
      if (!project || (project.workspace.ownerId !== userId && project.workspace.members.length === 0)) {
        throw new AppError("Access denied to this project", 403, "PROJECT_FORBIDDEN");
      }
      data.workspaceId = project.workspaceId;
    }

    // Try AI Engine for embedding and consolidation
    try {
      const aiPayload = {
        content: data.content,
        scope: data.scope,
        memory_type: data.type,
        workspace_id: data.workspaceId || null,
        project_id: data.projectId || null,
        user_id: data.scope === "USER" ? userId : null,
        created_by_id: userId,
        snapshot_id: data.snapshotId || null,
        metadata: data.metadata || {},
      };
      const aiResponse = await AIEngineClient.post("/api/v1/memory", aiPayload);
      if (aiResponse?.id) {
        return aiResponse;
      }
    } catch (e) {
      // Fallback to direct Prisma creation if AI engine is temporarily unreachable
    }

    return await prisma.researchMemory.create({
      data: {
        content: data.content,
        type: data.type,
        scope: data.scope,
        workspaceId: data.workspaceId || null,
        projectId: data.projectId || null,
        userId: data.scope === "USER" ? userId : null,
        createdById: userId,
        metadata: data.metadata || {},
      },
    });
  }

  /**
   * Lists memories respecting permissions and scopes
   */
  static async listMemories(userId, query) {
    const { page, limit, skip, sortBy, sortOrder } = getPaginationParams(query);

    const where = {
      OR: [
        { scope: "USER", userId },
        {
          scope: "WORKSPACE",
          workspace: {
            OR: [{ ownerId: userId }, { members: { some: { userId } } }],
          },
        },
        {
          scope: "PROJECT",
          project: {
            workspace: {
              OR: [{ ownerId: userId }, { members: { some: { userId } } }],
            },
          },
        },
      ],
      ...(query.scope ? { scope: query.scope } : {}),
      ...(query.workspaceId ? { workspaceId: query.workspaceId } : {}),
      ...(query.projectId ? { projectId: query.projectId } : {}),
      ...(query.type ? { type: query.type } : {}),
    };

    const [total, memories] = await Promise.all([
      prisma.researchMemory.count({ where }),
      prisma.researchMemory.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          createdBy: { select: { id: true, name: true, email: true } },
        },
      }),
    ]);

    return formatPaginatedResponse(memories, total, page, limit);
  }

  /**
   * Retrieves single memory by ID
   */
  static async getMemoryById(memoryId, userId) {
    const memory = await this.validateMemoryAccess(memoryId, userId);
    return memory;
  }

  /**
   * Updates memory content and metadata
   */
  static async updateMemory(memoryId, userId, data) {
    await this.validateMemoryAccess(memoryId, userId);

    try {
      const aiResponse = await AIEngineClient.patch(`/api/v1/memory/${memoryId}`, data);
      if (aiResponse?.id) {
        return aiResponse;
      }
    } catch (e) {
      // Fallback to direct Prisma update
    }

    return await prisma.researchMemory.update({
      where: { id: memoryId },
      data: {
        content: data.content,
        metadata: data.metadata || undefined,
      },
    });
  }

  /**
   * Deletes a memory record
   */
  static async deleteMemory(memoryId, userId) {
    await this.validateMemoryAccess(memoryId, userId);

    try {
      await AIEngineClient.delete(`/api/v1/memory/${memoryId}`);
    } catch (e) {
      // Fallback
    }

    await prisma.researchMemory.delete({
      where: { id: memoryId },
    });

    return { success: true, message: "Memory deleted successfully" };
  }

  /**
   * Semantic vector search across memories
   */
  static async searchMemories(userId, searchParams) {
    const payload = {
      query: searchParams.query,
      scope: searchParams.scope || null,
      workspace_id: searchParams.workspaceId || null,
      project_id: searchParams.projectId || null,
      user_id: searchParams.scope === "USER" ? userId : null,
      memory_type: searchParams.type || null,
      top_k: searchParams.topK || 5,
    };

    try {
      return await AIEngineClient.post("/api/v1/memory/search", payload);
    } catch (e) {
      // Fallback to keyword search via Prisma if AI engine unavailable
      const where = {
        content: { contains: searchParams.query, mode: "insensitive" },
        ...(searchParams.scope ? { scope: searchParams.scope } : {}),
      };
      return await prisma.researchMemory.findMany({
        where,
        take: searchParams.topK || 5,
      });
    }
  }
}

