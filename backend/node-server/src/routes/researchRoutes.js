import { Router } from "express";
import { ResearchController } from "../controllers/researchController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

// Runs collection routes
router.post("/runs", ResearchController.createRun);
router.get("/runs", ResearchController.listRuns);

// Run lifecycle and operations
router.get("/runs/:runId", ResearchController.getRunById);
router.post("/runs/:runId/start", ResearchController.startRun);
router.post("/runs/:runId/pause", ResearchController.pauseRun);
router.post("/runs/:runId/resume", ResearchController.resumeRun);
router.post("/runs/:runId/cancel", ResearchController.cancelRun);
router.post("/runs/:runId/retry", ResearchController.retryRun);

// Real-time SSE streaming & inspection
router.get("/runs/:runId/events/stream", ResearchController.streamEvents);
router.get("/runs/:runId/events", ResearchController.getEvents);
router.get("/runs/:runId/tasks", ResearchController.getTasks);
router.get("/runs/:runId/agents", ResearchController.getAgents);
router.get("/runs/:runId/sources", ResearchController.getSources);
router.get("/runs/:runId/evidence", ResearchController.getEvidence);
router.get("/runs/:runId/report", ResearchController.getReport);

export default router;
