import { Router } from "express";
import { MemoryController } from "../controllers/memoryController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

router.post("/", MemoryController.create);
router.post("/search", MemoryController.search);
router.get("/", MemoryController.list);
router.get("/:memoryId", MemoryController.getById);
router.patch("/:memoryId", MemoryController.update);
router.delete("/:memoryId", MemoryController.delete);

export default router;

