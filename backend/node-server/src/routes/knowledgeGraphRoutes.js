import { Router } from "express";
import { KnowledgeGraphController } from "../controllers/knowledgeGraphController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

// Node endpoints
router.post("/nodes", KnowledgeGraphController.createNode);
router.get("/nodes", KnowledgeGraphController.listNodes);
router.get("/nodes/:nodeId", KnowledgeGraphController.getNode);
router.patch("/nodes/:nodeId", KnowledgeGraphController.updateNode);
router.delete("/nodes/:nodeId", KnowledgeGraphController.deleteNode);

// Edge endpoints
router.post("/edges", KnowledgeGraphController.createEdge);
router.delete("/edges/:edgeId", KnowledgeGraphController.deleteEdge);

// Graph analysis & traversal
router.get("/neighborhood/:nodeId", KnowledgeGraphController.getNeighborhood);
router.post("/search", KnowledgeGraphController.searchGraph);
router.post("/populate-from-run/:runId", KnowledgeGraphController.populateFromRun);

export default router;

