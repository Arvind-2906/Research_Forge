import { Router } from "express";
import { ProjectController } from "../controllers/projectController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

router.get("/", ProjectController.list);
router.post("/", ProjectController.create);
router.get("/:projectId", ProjectController.getById);
router.patch("/:projectId", ProjectController.update);
router.delete("/:projectId", ProjectController.delete);

router.get("/:projectId/runs", ProjectController.getRuns);
router.get("/:projectId/reports", ProjectController.getReports);
router.get("/:projectId/documents", ProjectController.getDocuments);

export default router;

