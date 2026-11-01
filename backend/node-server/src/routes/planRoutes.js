import { Router } from "express";
import { PlanController } from "../controllers/planController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

router.get("/:runId", PlanController.getByRunId);
router.patch("/:planId", PlanController.update);
router.post("/:planId/approve", PlanController.approve);
router.post("/:planId/reject", PlanController.reject);
router.post("/:planId/regenerate", PlanController.regenerate);

export default router;

