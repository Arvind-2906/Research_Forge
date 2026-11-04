import { Router } from "express";
import { ReportController } from "../controllers/reportController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

router.get("/", ReportController.list);
router.get("/:reportId", ReportController.getById);
router.patch("/:reportId", ReportController.update);
router.delete("/:reportId", ReportController.delete);

// Citation routes
router.get("/:reportId/citations", ReportController.getCitations);
router.post("/:reportId/citations", ReportController.addCitation);
router.delete("/:reportId/citations/:citationId", ReportController.deleteCitation);
router.post("/:reportId/validate-citations", ReportController.validateCitations);

// Export routes
router.get("/:reportId/exports", ReportController.getExports);
router.post("/:reportId/exports", ReportController.createExport);
router.get("/exports/:exportId/download", ReportController.downloadExport);

export default router;
