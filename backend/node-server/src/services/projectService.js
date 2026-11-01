import { prisma } from "./prisma.js";
import { AppError } from "../middleware/errorHandler.js";
import { getPaginationParams, formatPaginatedResponse } from "../utils/pagination.js";

export class ProjectService {
  /**
   * Helper to ensure user has access to a project's parent workspace
   */
  static async validateProjectAccess(projectId, userId, requiredRoles = []) {
    const project = await prisma.researchProject.findUnique({
      where: { id: projectId },
      include: {
        workspace: {
          include: {
            members: { where: { userId } },
          },
        },
      },
    });

    if (!project) {
      throw new AppError("Research project not found", 404, "PROJECT_NOT_FOUND");
    }

    const isOwner = project.workspace.ownerId === userId;
    const member = project.workspace.members[0];

    if (!isOwner && !member) {
      throw new AppError("Access denied to this project", 403, "PROJECT_FORBIDDEN");
    }

    const effectiveRole = isOwner ? "OWNER" : member.role;
    if (requiredRoles.length > 0 && !requiredRoles.includes(effectiveRole)) {
      throw new AppError(
        `Insufficient role. Required: ${requiredRoles.join(", ")}`,
        403,
        "INSUFFICIENT_ROLE"
      );
    }

    return { project, effectiveRole };
  }

  /**
   * Lists projects in a workspace with search, filtering, and pagination
   */
  static async listProjects(workspaceId, userId, query) {
    const { page, limit, skip, sortBy, sortOrder } = getPaginationParams(query);

    // Verify workspace membership
    const membership = await prisma.workspaceMember.findFirst({
      where: { workspaceId, userId },
    });
    const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });

    if (!workspace || (workspace.ownerId !== userId && !membership)) {
      throw new AppError("Access denied to this workspace", 403, "WORKSPACE_FORBIDDEN");
    }

    const where = {
      workspaceId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: "insensitive" } },
              { description: { contains: query.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [total, projects] = await Promise.all([
      prisma.researchProject.count({ where }),
      prisma.researchProject.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          createdBy: {
            select: { id: true, name: true, email: true, image: true },
          },
          _count: {
            select: {
              runs: true,
              documents: true,
              memories: true,
            },
          },
        },
      }),
    ]);

    return formatPaginatedResponse(projects, total, page, limit);
  }

  /**
   * Creates a new research project
   */
  static async createProject(userId, data) {
    // Verify membership in target workspace
    const workspace = await prisma.workspace.findUnique({
      where: { id: data.workspaceId },
      include: {
        members: { where: { userId } },
      },
    });

    if (!workspace || (workspace.ownerId !== userId && workspace.members.length === 0)) {
      throw new AppError("Access denied to create project in this workspace", 403, "WORKSPACE_FORBIDDEN");
    }

    const project = await prisma.researchProject.create({
      data: {
        title: data.title,
        description: data.description,
        settings: data.settings || {},
        workspaceId: data.workspaceId,
        createdById: userId,
      },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
    });

    return project;
  }

  /**
   * Retrieves single project details
   */
  static async getProjectById(projectId, userId) {
    const { project } = await this.validateProjectAccess(projectId, userId);

    const detailed = await prisma.researchProject.findUnique({
      where: { id: projectId },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true, image: true },
        },
        workspace: {
          select: { id: true, name: true, ownerId: true },
        },
        _count: {
          select: {
            runs: true,
            documents: true,
            memories: true,
          },
        },
      },
    });

    return detailed;
  }

  /**
   * Updates project details
   */
  static async updateProject(projectId, userId, updateData) {
    await this.validateProjectAccess(projectId, userId, ["OWNER", "ADMIN", "MEMBER"]);

    const updated = await prisma.researchProject.update({
      where: { id: projectId },
      data: {
        ...(updateData.title ? { title: updateData.title } : {}),
        ...(updateData.description !== undefined ? { description: updateData.description } : {}),
        ...(updateData.status ? { status: updateData.status } : {}),
        ...(updateData.settings ? { settings: updateData.settings } : {}),
      },
    });

    return updated;
  }

  /**
   * Deletes a project
   */
  static async deleteProject(projectId, userId) {
    await this.validateProjectAccess(projectId, userId, ["OWNER", "ADMIN"]);

    await prisma.researchProject.delete({
      where: { id: projectId },
    });

    return { success: true, message: "Project deleted successfully" };
  }

  /**
   * Retrieves runs for a project
   */
  static async getProjectRuns(projectId, userId, query) {
    await this.validateProjectAccess(projectId, userId);
    const { page, limit, skip, sortBy, sortOrder } = getPaginationParams(query);

    const where = {
      projectId,
      ...(query.status ? { status: query.status } : {}),
    };

    const [total, runs] = await Promise.all([
      prisma.researchRun.count({ where }),
      prisma.researchRun.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          requestedBy: {
            select: { id: true, name: true, email: true, image: true },
          },
          _count: {
            select: {
              plans: true,
              tasks: true,
              reports: true,
              events: true,
            },
          },
        },
      }),
    ]);

    return formatPaginatedResponse(runs, total, page, limit);
  }

  /**
   * Retrieves reports for a project
   */
  static async getProjectReports(projectId, userId, query) {
    await this.validateProjectAccess(projectId, userId);
    const { page, limit, skip, sortBy, sortOrder } = getPaginationParams(query);

    const where = {
      run: { projectId },
    };

    const [total, reports] = await Promise.all([
      prisma.researchReport.count({ where }),
      prisma.researchReport.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          run: {
            select: { id: true, question: true, status: true },
          },
          _count: {
            select: { citations: true, exports: true },
          },
        },
      }),
    ]);

    return formatPaginatedResponse(reports, total, page, limit);
  }

  /**
   * Retrieves documents associated with a project
   */
  static async getProjectDocuments(projectId, userId, query) {
    await this.validateProjectAccess(projectId, userId);
    const { page, limit, skip, sortBy, sortOrder } = getPaginationParams(query);

    const where = { projectId };

    const [total, documents] = await Promise.all([
      prisma.documentAsset.count({ where }),
      prisma.documentAsset.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          uploadedBy: {
            select: { id: true, name: true, email: true },
          },
        },
      }),
    ]);

    // Convert BigInt fileSize to number for JSON response
    const formattedDocs = documents.map((doc) => ({
      ...doc,
      fileSize: Number(doc.fileSize),
    }));

    return formatPaginatedResponse(formattedDocs, total, page, limit);
  }
}

