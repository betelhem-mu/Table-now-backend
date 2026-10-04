import { Router } from "express";
import {
  getServices,
  getServiceById,
  createService,
  updateService,
  deleteService,
} from "../controllers/serviceController.js";
import authMiddleware from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";

const router = Router();

router.get("/", authMiddleware, getServices);

router.get("/:id", authMiddleware, getServiceById);

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

router.delete(
  "/:id",
  authMiddleware,
  roleMiddleware("provider"),
  deleteService
);

export default router;