import { Router } from "express";
import { AnalyticsController } from "../controllers/analyticsController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

router.get("/overview", AnalyticsController.getOverview);
router.get("/usage", AnalyticsController.getUsage);
router.get("/runs", AnalyticsController.getRuns);
router.get("/agents", AnalyticsController.getAgents);
router.get("/models", AnalyticsController.getModels);
router.get("/mcp", AnalyticsController.getMcp);

export default router;

