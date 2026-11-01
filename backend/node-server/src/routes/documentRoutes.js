import { Router } from "express";
import { DocumentController } from "../controllers/documentController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

router.post("/", DocumentController.create);
router.get("/", DocumentController.list);
router.get("/:documentId", DocumentController.getById);
router.delete("/:documentId", DocumentController.delete);
router.post("/:documentId/process", DocumentController.process);
router.get("/:documentId/status", DocumentController.getStatus);

export default router;

