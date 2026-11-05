import { Router } from "express";
import { MCPController } from "../controllers/mcpController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

router.get("/servers", MCPController.getServers);
router.get("/tools", MCPController.getTools);
router.post("/execute", MCPController.executeTool);
router.get("/calls", MCPController.getCalls);

export default router;

