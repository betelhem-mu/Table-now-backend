import { Router } from "express";
import {
  getServices,
  getServiceById,
  createService,
  updateService,
  deleteService,
} from "../controllers/serviceController.js";
import authMiddleware, { optionalAuthMiddleware } from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";

const router = Router();

router.get("/", optionalAuthMiddleware, getServices);

router.get("/:id", optionalAuthMiddleware, getServiceById);

router.post(
  "/",
  authMiddleware,
  roleMiddleware("provider"),
  createService
);

router.put(
  "/:id",
  authMiddleware,
  roleMiddleware("provider"),
  updateService
);

router.patch(
  "/:id",
  authMiddleware,
  roleMiddleware("provider"),
  updateService
);

router.delete(
  "/:id",
  authMiddleware,
  roleMiddleware("provider"),
  deleteService
);

export default router;