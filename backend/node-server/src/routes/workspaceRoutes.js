import { Router } from "express";
import { WorkspaceController } from "../controllers/workspaceController.js";
import { requireAuth } from "../middleware/auth.js";
import { requireWorkspaceMember } from "../middleware/workspaceAuth.js";

const router = Router();

router.use(requireAuth);

// Workspace collection routes
router.get("/", WorkspaceController.list);
router.post("/", WorkspaceController.create);

// Individual workspace routes
router.get("/:workspaceId", requireWorkspaceMember(), WorkspaceController.getById);
router.patch("/:workspaceId", requireWorkspaceMember(["OWNER", "ADMIN"]), WorkspaceController.update);
router.delete("/:workspaceId", requireWorkspaceMember(["OWNER"]), WorkspaceController.delete);

// Workspace membership routes
router.get("/:workspaceId/members", requireWorkspaceMember(), WorkspaceController.listMembers);
router.post("/:workspaceId/members", requireWorkspaceMember(["OWNER", "ADMIN"]), WorkspaceController.addMember);
router.patch(
  "/:workspaceId/members/:memberId",
  requireWorkspaceMember(["OWNER", "ADMIN"]),
  WorkspaceController.updateMemberRole
);
router.delete(
  "/:workspaceId/members/:memberId",
  requireWorkspaceMember(["OWNER", "ADMIN"]),
  WorkspaceController.removeMember
);

export default router;

