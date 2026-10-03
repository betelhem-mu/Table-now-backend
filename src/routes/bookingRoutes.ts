import { Router } from "express";
import {
  createBooking,
  getCustomerBookings,
  cancelBooking,
  getProviderBookings,
  completeBooking,
} from "../controllers/bookingController.js";
import authMiddleware from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";

const router = Router();

router.post(
  "/",
  authMiddleware,
  roleMiddleware("customer"),
  createBooking
);

router.get(
  "/customer",
  authMiddleware,
  roleMiddleware("customer"),
  getCustomerBookings
);

router.put(
  "/:id/cancel",
  authMiddleware,
  roleMiddleware("customer"),
  cancelBooking
);

router.get(
  "/provider",
  authMiddleware,
  roleMiddleware("provider"),
  getProviderBookings
);

router.put(
  "/:id/complete",
  authMiddleware,
  roleMiddleware("provider"),
  completeBooking
);

export default router;