import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/authMiddleware.js";
import User from "../models/User.js";
import Service from "../models/Service.js";
import Booking from "../models/Booking.js";
import { memoryStore, getIsInMemoryMode } from "../config/memoryStore.js";

const getParamId = (param: string | string[] | undefined): string => {
  if (Array.isArray(param)) return param[0] || "";
  return param || "";
};

// 1. Dashboard Statistics & Overview
export const getDashboardStats = async (
  _req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const allUsers = memoryStore.getUsers() || [];
    const allServices = memoryStore.getServices() || [];
    const allBookings = memoryStore.getBookings({}) || [];

    const totalCustomers = allUsers.filter((u) => u.role === "customer").length;
    const totalApprovedProviders = allUsers.filter(
      (u) => u.role === "provider" && u.providerStatus === "approved"
    ).length;
    const pendingProviderApplications = allUsers.filter(
      (u) => u.role === "provider" && u.providerStatus === "pending"
    ).length;
    const totalServices = allServices.length;
    const totalBookings = allBookings.length;

    // Recent applications (last 5 providers sorted newest first)
    const recentApplications = [...allUsers]
      .filter((u) => u.role === "provider")
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5)
      .map((u) => ({
        id: u._id,
        name: u.name,
        email: u.email,
        status: u.providerStatus || "pending",
        createdAt: u.createdAt,
      }));

    // Recent bookings (last 5 bookings sorted newest first)
    const recentBookings = [...allBookings]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);

    res.status(200).json({
      stats: {
        totalCustomers,
        totalApprovedProviders,
        pendingProviderApplications,
        totalServices,
        totalBookings,
      },
      recentApplications,
      recentBookings,
    });
  } catch (error) {
    console.error("Admin dashboard error:", error);
    res.status(500).json({ message: "Server error fetching admin statistics" });
  }
};

// 2. Get Provider Applications (with status filter and search)
export const getProviderApplications = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const statusFilter = req.query.status as string;
    const searchQuery = (req.query.search as string || "").toLowerCase().trim();

    let providers = memoryStore
      .getUsers()
      .filter((u) => u.role === "provider");

    if (statusFilter && ["pending", "approved", "rejected"].includes(statusFilter)) {
      providers = providers.filter((u) => (u.providerStatus || "pending") === statusFilter);
    }

    if (searchQuery) {
      providers = providers.filter(
        (u) =>
          u.name.toLowerCase().includes(searchQuery) ||
          u.email.toLowerCase().includes(searchQuery)
      );
    }

    // Sort by createdAt descending
    providers.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const applications = providers.map((u) => ({
      id: u._id,
      name: u.name,
      email: u.email,
      role: u.role,
      providerStatus: u.providerStatus || "pending",
      isSuspended: u.isSuspended ?? false,
      rejectionReason: u.rejectionReason || "",
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    }));

    res.status(200).json({ applications });
  } catch (error) {
    console.error("Get provider applications error:", error);
    res.status(500).json({ message: "Server error fetching provider applications" });
  }
};

// 3. Get Application Detail by ID
export const getProviderApplicationById = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const id = getParamId(req.params.id);
    const user = memoryStore.findUserById(id);

    if (!user || user.role !== "provider") {
      res.status(404).json({ message: "Provider application not found" });
      return;
    }

    const application = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      providerStatus: user.providerStatus || "pending",
      isSuspended: user.isSuspended ?? false,
      rejectionReason: user.rejectionReason || "",
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    res.status(200).json({ application });
  } catch (error) {
    console.error("Get application by ID error:", error);
    res.status(500).json({ message: "Server error fetching application details" });
  }
};

// 4. Approve Provider Application
export const approveProviderApplication = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const id = getParamId(req.params.id);
    const user = memoryStore.findUserById(id);

    if (!user || user.role !== "provider") {
      res.status(404).json({ message: "Provider application not found" });
      return;
    }

    const updatedUser = memoryStore.updateUser(id, {
      providerStatus: "approved",
      rejectionReason: "",
    });

    if (!getIsInMemoryMode()) {
      try {
        await User.findByIdAndUpdate(id, {
          providerStatus: "approved",
          rejectionReason: "",
        });
      } catch (err) {
        console.warn("MongoDB provider status sync skipped:", err);
      }
    }

    res.status(200).json({
      message: "Provider application approved successfully",
      user: {
        id: updatedUser?._id,
        name: updatedUser?.name,
        email: updatedUser?.email,
        role: updatedUser?.role,
        providerStatus: updatedUser?.providerStatus,
        isSuspended: updatedUser?.isSuspended,
      },
    });
  } catch (error) {
    console.error("Approve provider application error:", error);
    res.status(500).json({ message: "Server error approving application" });
  }
};

// 5. Reject Provider Application
export const rejectProviderApplication = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const id = getParamId(req.params.id);
    const { reason } = req.body;

    const user = memoryStore.findUserById(id);

    if (!user || user.role !== "provider") {
      res.status(404).json({ message: "Provider application not found" });
      return;
    }

    const rejectionReasonText = (reason || "").trim() || "Application does not meet current platform verification criteria.";

    const updatedUser = memoryStore.updateUser(id, {
      providerStatus: "rejected",
      rejectionReason: rejectionReasonText,
    });

    if (!getIsInMemoryMode()) {
      try {
        await User.findByIdAndUpdate(id, {
          providerStatus: "rejected",
          rejectionReason: rejectionReasonText,
        });
      } catch (err) {
        console.warn("MongoDB provider status sync skipped:", err);
      }
    }

    res.status(200).json({
      message: "Provider application rejected successfully",
      user: {
        id: updatedUser?._id,
        name: updatedUser?.name,
        email: updatedUser?.email,
        role: updatedUser?.role,
        providerStatus: updatedUser?.providerStatus,
        rejectionReason: updatedUser?.rejectionReason,
      },
    });
  } catch (error) {
    console.error("Reject provider application error:", error);
    res.status(500).json({ message: "Server error rejecting application" });
  }
};

// 6. Get Users (User Management)
export const getUsers = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const roleFilter = req.query.role as string;
    const searchQuery = (req.query.search as string || "").toLowerCase().trim();

    let users = memoryStore.getUsers();

    if (roleFilter && ["customer", "provider", "admin"].includes(roleFilter)) {
      users = users.filter((u) => u.role === roleFilter);
    }

    if (searchQuery) {
      users = users.filter(
        (u) =>
          u.name.toLowerCase().includes(searchQuery) ||
          u.email.toLowerCase().includes(searchQuery)
      );
    }

    const formattedUsers = users.map((u) => ({
      id: u._id,
      name: u.name,
      email: u.email,
      role: u.role,
      providerStatus: u.providerStatus || "approved",
      isSuspended: u.isSuspended ?? false,
      createdAt: u.createdAt,
    }));

    res.status(200).json({ users: formattedUsers });
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({ message: "Server error fetching users" });
  }
};

// 7. Toggle User Suspension
export const updateUserStatus = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const id = getParamId(req.params.id);
    const { isSuspended } = req.body;

    if (isSuspended === undefined) {
      res.status(400).json({ message: "isSuspended field is required" });
      return;
    }

    const user = memoryStore.findUserById(id);
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    // Security Guard: Do not allow suspending the currently logged-in administrator
    if (req.user?.id === id && isSuspended) {
      res.status(400).json({ message: "You cannot suspend your own admin account." });
      return;
    }

    // Security Guard: Prevent suspending the last active administrator
    if (user.role === "admin" && isSuspended) {
      const activeAdmins = memoryStore
        .getUsers()
        .filter((u) => u.role === "admin" && !u.isSuspended);
      if (activeAdmins.length <= 1) {
        res.status(400).json({ message: "Cannot suspend the only remaining active administrator." });
        return;
      }
    }

    const updatedUser = memoryStore.updateUser(id, {
      isSuspended: Boolean(isSuspended),
    });

    if (!getIsInMemoryMode()) {
      try {
        await User.findByIdAndUpdate(id, { isSuspended: Boolean(isSuspended) });
      } catch (err) {
        console.warn("MongoDB user status sync skipped:", err);
      }
    }

    res.status(200).json({
      message: `User account ${isSuspended ? "suspended" : "reactivated"} successfully`,
      user: {
        id: updatedUser?._id,
        name: updatedUser?.name,
        email: updatedUser?.email,
        role: updatedUser?.role,
        isSuspended: updatedUser?.isSuspended,
      },
    });
  } catch (error) {
    console.error("Update user status error:", error);
    res.status(500).json({ message: "Server error updating user account status" });
  }
};

// 8. Admin View Services (Platform Oversight)
export const getAdminServices = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const searchQuery = (req.query.search as string || "").toLowerCase().trim();
    let services = memoryStore.getServices() || [];

    if (searchQuery) {
      services = services.filter(
        (s) =>
          s.name.toLowerCase().includes(searchQuery) ||
          s.description.toLowerCase().includes(searchQuery) ||
          (s.category && s.category.toLowerCase().includes(searchQuery))
      );
    }

    res.status(200).json({ services });
  } catch (error) {
    console.error("Get admin services error:", error);
    res.status(500).json({ message: "Server error fetching platform services" });
  }
};

// 9. Admin View Bookings (Platform Oversight)
export const getAdminBookings = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const statusFilter = req.query.status as string;
    const dateFilter = req.query.date as string;

    let bookings = memoryStore.getBookings({});

    if (statusFilter && ["scheduled", "completed", "cancelled"].includes(statusFilter)) {
      bookings = bookings.filter((b) => b.status === statusFilter);
    }

    if (dateFilter) {
      bookings = bookings.filter((b) => {
        const bDateStr = new Date(b.date).toISOString().split("T")[0];
        return bDateStr === dateFilter;
      });
    }

    // Sort newest first
    bookings.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.status(200).json({ bookings });
  } catch (error) {
    console.error("Get admin bookings error:", error);
    res.status(500).json({ message: "Server error fetching platform bookings" });
  }
};
