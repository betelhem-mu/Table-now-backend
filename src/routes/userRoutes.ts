import { Router } from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import {
  getProfile,
  updateProfile,
  updateTheme,
  changePassword,
  requestAccountDeletion,
  logout,
} from "../controllers/userController.js";

const router = Router();

// All settings user routes are protected by authMiddleware
router.use(authMiddleware);

router.get("/profile", getProfile);
router.put("/profile", updateProfile);
router.put("/theme", updateTheme);
router.put("/change-password", changePassword);
router.post("/deletion-request", requestAccountDeletion);
router.post("/logout", logout);

export default router;
