import { Router } from "express";
import { ReportController } from "../controllers/reportController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

router.get("/", ReportController.list);
router.get("/:reportId", ReportController.getById);
router.patch("/:reportId", ReportController.update);
router.delete("/:reportId", ReportController.delete);

router.get("/:reportId/citations", ReportController.getCitations);
router.post("/:reportId/exports", ReportController.createExport);

export default router;

