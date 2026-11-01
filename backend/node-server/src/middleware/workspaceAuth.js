import { prisma } from "../services/prisma.js";
import { AppError } from "./errorHandler.js";

/**
 * Middleware factory: Validates workspace membership and optional role requirements.
 *
 * @param {string[]} allowedRoles - Optional array of allowed WorkspaceRoles ('OWNER', 'ADMIN', 'MEMBER').
 */
export function requireWorkspaceMember(allowedRoles = []) {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.id) {
        return next(new AppError("Authentication required", 401, "UNAUTHORIZED"));
      }

      const workspaceId =
        req.params.workspaceId ||
        req.query.workspaceId ||
        (req.body && req.body.workspaceId) ||
        req.headers["x-workspace-id"];

      if (!workspaceId) {
        return next(
          new AppError("Workspace ID is required to access this resource", 400, "MISSING_WORKSPACE_ID")
        );
      }

      // Fetch workspace and user's membership
      const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        include: {
          members: {
            where: { userId: req.user.id },
          },
        },
      });

      if (!workspace) {
        return next(new AppError("Workspace not found", 404, "WORKSPACE_NOT_FOUND"));
      }

      // Check if user is the direct workspace owner or an explicit member
      const isOwner = workspace.ownerId === req.user.id;
      const member = workspace.members[0];

      if (!isOwner && !member) {
        return next(
          new AppError("You do not have access to this workspace", 403, "WORKSPACE_FORBIDDEN")
        );
      }

      const effectiveRole = isOwner ? "OWNER" : member.role;

      // Check role permissions if specified
      if (allowedRoles.length > 0 && !allowedRoles.includes(effectiveRole)) {
        return next(
          new AppError(
            `Insufficient workspace permissions. Required one of: ${allowedRoles.join(", ")}`,
            403,
            "INSUFFICIENT_ROLE"
          )
        );
      }

      // Attach workspace context to request
      req.workspace = workspace;
      req.workspaceRole = effectiveRole;
      req.workspaceMember = member || {
        id: `owner-${req.user.id}`,
        userId: req.user.id,
        workspaceId: workspace.id,
        role: "OWNER",
      };

      next();
    } catch (error) {
      next(
        new AppError("Failed to verify workspace permissions", 500, "WORKSPACE_AUTH_ERROR", {
          originalError: error.message,
        })
      );
    }
  };
}

