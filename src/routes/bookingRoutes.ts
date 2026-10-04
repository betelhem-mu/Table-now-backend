import { Router } from "express";
import {
  createBooking,
  getCustomerBookings,
  cancelBooking,
  getProviderBookings,
  completeBooking,
  getBookings,
  updateBookingStatus,
} from "../controllers/bookingController.js";
import authMiddleware from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";

const router = Router();

// Generic API endpoints matching suggested API surface
router.get("/", authMiddleware, getBookings);

router.post(
  "/",
  authMiddleware,
  roleMiddleware("customer"),
  createBooking
);

router.patch("/:id", authMiddleware, updateBookingStatus);

router.delete("/:id", authMiddleware, cancelBooking);

// Role specific / legacy aliases
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

router.patch(
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

router.patch(
  "/:id/complete",
  authMiddleware,
  roleMiddleware("provider"),
  completeBooking
);

export default router;