import { Router } from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";
import {
  getDashboardStats,
  getProviderApplications,
  getProviderApplicationById,
  approveProviderApplication,
  rejectProviderApplication,
  getUsers,
  updateUserStatus,
  getAdminServices,
  getAdminBookings,
} from "../controllers/adminController.js";

const router = Router();

// Protect all admin endpoints with authMiddleware and roleMiddleware("admin")
router.use(authMiddleware);
router.use(roleMiddleware("admin"));

// Dashboard Statistics
router.get("/dashboard", getDashboardStats);

// Provider Applications Management
router.get("/provider-applications", getProviderApplications);
router.get("/provider-applications/:id", getProviderApplicationById);
router.patch("/provider-applications/:id/approve", approveProviderApplication);
router.patch("/provider-applications/:id/reject", rejectProviderApplication);

// User Management
router.get("/users", getUsers);
router.patch("/users/:id/status", updateUserStatus);

// Service & Booking Oversight
router.get("/services", getAdminServices);
router.get("/bookings", getAdminBookings);

export default router;
