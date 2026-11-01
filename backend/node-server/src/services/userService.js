import { prisma } from "./prisma.js";
import { AppError } from "../middleware/errorHandler.js";

export class UserService {
  /**
   * Retrieves user profile and associated workspaces
   */
  static async getProfile(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
        image: true,
        createdAt: true,
        updatedAt: true,
        memberships: {
          select: {
            id: true,
            role: true,
            workspace: {
              select: {
                id: true,
                name: true,
                description: true,
                createdAt: true,
              },
            },
          },
        },
        ownedWorkspaces: {
          select: {
            id: true,
            name: true,
            description: true,
            createdAt: true,
          },
        },
      },
    });

    if (!user) {
      throw new AppError("User not found", 404, "USER_NOT_FOUND");
    }

    return user;
  }

  /**
   * Updates user name or avatar image
   */
  static async updateProfile(userId, updateData) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(updateData.name ? { name: updateData.name } : {}),
        ...(updateData.image !== undefined ? { image: updateData.image } : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
        image: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user;
  }

  /**
   * Retrieves scoped user preferences from persistent ResearchMemory
   */
  static async getPreferences(userId) {
    const memory = await prisma.researchMemory.findFirst({
      where: {
        userId,
        scope: "USER",
        type: "USER_PREFERENCE",
      },
    });

    return (
      memory?.metadata || {
        theme: "system",
        emailNotifications: true,
        defaultResearchDepth: "standard",
        defaultSearchEngine: "all",
        autoApprovePlans: false,
      }
    );
  }

  /**
   * Persists user preferences into scoped ResearchMemory
   */
  static async updatePreferences(userId, newPreferences) {
    const existing = await prisma.researchMemory.findFirst({
      where: {
        userId,
        scope: "USER",
        type: "USER_PREFERENCE",
      },
    });

    const currentMeta = existing?.metadata || {};
    const mergedMeta = { ...currentMeta, ...newPreferences };

    if (existing) {
      const updated = await prisma.researchMemory.update({
        where: { id: existing.id },
        data: {
          metadata: mergedMeta,
          content: `User settings: theme=${mergedMeta.theme || "system"}, depth=${mergedMeta.defaultResearchDepth || "standard"}`,
        },
      });
      return updated.metadata;
    }

    const created = await prisma.researchMemory.create({
      data: {
        userId,
        createdById: userId,
        scope: "USER",
        type: "USER_PREFERENCE",
        title: "User Settings & Preferences",
        content: `User settings: theme=${mergedMeta.theme || "system"}, depth=${mergedMeta.defaultResearchDepth || "standard"}`,
        metadata: mergedMeta,
      },
    });

    return created.metadata;
  }
}
