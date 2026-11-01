import { prisma } from "./prisma.js";
import { AppError } from "../middleware/errorHandler.js";

export class WorkspaceService {
  /**
   * Lists all workspaces where the user is an owner or a member
   */
  static async listWorkspaces(userId) {
    const workspaces = await prisma.workspace.findMany({
      where: {
        OR: [
          { ownerId: userId },
          { members: { some: { userId } } },
        ],
      },
      include: {
        owner: {
          select: { id: true, name: true, email: true, image: true },
        },
        _count: {
          select: {
            members: true,
            projects: true,
            documents: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return workspaces;
  }

  /**
   * Creates a new workspace and sets the creator as OWNER
   */
  static async createWorkspace(userId, data) {
    const workspace = await prisma.$transaction(async (tx) => {
      const ws = await tx.workspace.create({
        data: {
          name: data.name,
          description: data.description,
          settings: data.settings || {},
          ownerId: userId,
        },
      });

      // Automatically add creator as an OWNER member
      await tx.workspaceMember.create({
        data: {
          workspaceId: ws.id,
          userId,
          role: "OWNER",
        },
      });

      return ws;
    });

    return workspace;
  }

  /**
   * Retrieves workspace details by ID
   */
  static async getWorkspaceById(workspaceId, userId) {
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        owner: {
          select: { id: true, name: true, email: true, image: true },
        },
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, image: true },
            },
          },
        },
        _count: {
          select: {
            projects: true,
            documents: true,
            sources: true,
            memories: true,
          },
        },
      },
    });

    if (!workspace) {
      throw new AppError("Workspace not found", 404, "WORKSPACE_NOT_FOUND");
    }

    const isMember =
      workspace.ownerId === userId ||
      workspace.members.some((m) => m.userId === userId);

    if (!isMember) {
      throw new AppError("Access denied to this workspace", 403, "WORKSPACE_FORBIDDEN");
    }

    return workspace;
  }

  /**
   * Updates workspace settings (Requires OWNER or ADMIN)
   */
  static async updateWorkspace(workspaceId, userId, data) {
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        members: { where: { userId } },
      },
    });

    if (!workspace) {
      throw new AppError("Workspace not found", 404, "WORKSPACE_NOT_FOUND");
    }

    const isOwner = workspace.ownerId === userId;
    const memberRole = workspace.members[0]?.role;

    if (!isOwner && memberRole !== "ADMIN" && memberRole !== "OWNER") {
      throw new AppError("Only workspace owners or admins can modify settings", 403, "INSUFFICIENT_ROLE");
    }

    const updated = await prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        ...(data.name ? { name: data.name } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.settings ? { settings: data.settings } : {}),
      },
    });

    return updated;
  }

  /**
   * Deletes workspace (Requires OWNER)
   */
  static async deleteWorkspace(workspaceId, userId) {
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
    });

    if (!workspace) {
      throw new AppError("Workspace not found", 404, "WORKSPACE_NOT_FOUND");
    }

    if (workspace.ownerId !== userId) {
      throw new AppError("Only the workspace owner can delete this workspace", 403, "OWNER_ONLY");
    }

    await prisma.workspace.delete({
      where: { id: workspaceId },
    });

    return { success: true, message: "Workspace deleted successfully" };
  }

  /**
   * Lists members of a workspace
   */
  static async listMembers(workspaceId) {
    return prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
      orderBy: { joinedAt: "asc" },
    });
  }

  /**
   * Adds or invites a member to a workspace
   */
  static async addMember(workspaceId, inviterId, memberData) {
    let targetUserId = memberData.userId;

    if (!targetUserId && memberData.email) {
      const user = await prisma.user.findUnique({
        where: { email: memberData.email },
      });
      if (!user) {
        throw new AppError(
          `No registered user found with email: ${memberData.email}`,
          404,
          "USER_NOT_FOUND"
        );
      }
      targetUserId = user.id;
    }

    // Check if already a member
    const existing = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: targetUserId,
        },
      },
    });

    if (existing) {
      throw new AppError("User is already a member of this workspace", 409, "MEMBER_EXISTS");
    }

    const member = await prisma.workspaceMember.create({
      data: {
        workspaceId,
        userId: targetUserId,
        role: memberData.role || "MEMBER",
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
    });

    return member;
  }

  /**
   * Updates a member's role
   */
  static async updateMemberRole(workspaceId, memberId, newRole) {
    const member = await prisma.workspaceMember.findUnique({
      where: { id: memberId },
      include: { workspace: true },
    });

    if (!member || member.workspaceId !== workspaceId) {
      throw new AppError("Workspace member not found", 404, "MEMBER_NOT_FOUND");
    }

    if (member.workspace.ownerId === member.userId && newRole !== "OWNER") {
      throw new AppError("Cannot demote the workspace owner", 400, "CANNOT_DEMOTE_OWNER");
    }

    const updated = await prisma.workspaceMember.update({
      where: { id: memberId },
      data: { role: newRole },
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
    });

    return updated;
  }

  /**
   * Removes a member from a workspace
   */
  static async removeMember(workspaceId, memberId) {
    const member = await prisma.workspaceMember.findUnique({
      where: { id: memberId },
      include: { workspace: true },
    });

    if (!member || member.workspaceId !== workspaceId) {
      throw new AppError("Workspace member not found", 404, "MEMBER_NOT_FOUND");
    }

    if (member.workspace.ownerId === member.userId) {
      throw new AppError("Cannot remove the workspace owner from their workspace", 400, "CANNOT_REMOVE_OWNER");
    }

    await prisma.workspaceMember.delete({
      where: { id: memberId },
    });

    return { success: true, message: "Member removed successfully" };
  }
}

