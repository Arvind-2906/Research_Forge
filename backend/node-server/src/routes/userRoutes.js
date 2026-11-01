import { Router } from "express";
import { UserController } from "../controllers/userController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// All /api/users routes require active session
router.use(requireAuth);

router.get("/me", UserController.getMe);
router.patch("/me", UserController.updateMe);
router.get("/me/preferences", UserController.getPreferences);
router.patch("/me/preferences", UserController.updatePreferences);

export default router;

