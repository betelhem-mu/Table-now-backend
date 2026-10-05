import { Response } from "express";
import Booking from "../models/Booking.js";
import Service from "../models/Service.js";
import { AuthenticatedRequest } from "../middleware/authMiddleware.js";
import { memoryStore, getIsInMemoryMode } from "../config/memoryStore.js";

const getParamId = (param: string | string[] | undefined): string => {
  if (Array.isArray(param)) return param[0] || "";
  return param || "";
};


export const createBooking = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        message: "Authentication required",
      });
      return;
    }

    const { serviceId, date, time } = req.body;

    if (!serviceId || !date) {
      res.status(400).json({
        message: "Service ID and date are required",
      });
      return;
    }

    const bookingDate = new Date(date);

    if (Number.isNaN(bookingDate.getTime())) {
      res.status(400).json({
        message: "Invalid booking date",
      });
      return;
    }

    if (bookingDate <= new Date()) {
      res.status(400).json({
        message: "Booking date must be in the future",
      });
      return;
    }

    const memoryBooking = memoryStore.createBooking({
      customerId: req.user.id,
      serviceId,
      date: bookingDate,
      time: time || "",
    });

    if (!getIsInMemoryMode()) {
      try {
        const service = await Service.findById(serviceId);
        if (service) {
          const existingBooking = await Booking.findOne({
            service: service._id,
            date: bookingDate,
            status: "scheduled",
          });

          if (!existingBooking) {
            await Booking.create({
              customer: req.user.id,
              service: service._id,
              provider: service.provider,
              date: bookingDate,
              time: time || "",
              status: "scheduled",
            });
          }
        }
      } catch (err) {
        console.warn("Atlas booking sync skipped/fallback used:", err);
      }
    }

    res.status(201).json({
      message: "Booking created successfully",
      booking: memoryBooking,
    });
  } catch (error) {
    console.error("Create booking error:", error);
    res.status(500).json({
      message: "Server error while creating booking",
    });
  }
};

export const getCustomerBookings = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        message: "Authentication required",
      });
      return;
    }

    const memoryBookings = memoryStore.getBookings({ customerId: req.user.id }) || [];

    if (getIsInMemoryMode()) {
      res.status(200).json({ bookings: memoryBookings });
      return;
    }

    try {
      const dbBookings = await Booking.find({
        customer: req.user.id,
      })
        .populate("service")
        .populate("provider", "name email")
        .sort({ date: 1 });

      const existingIds = new Set(dbBookings.map((b) => b._id.toString()));
      const combined = [...dbBookings];

      for (const mBook of memoryBookings) {
        if (!existingIds.has(mBook._id)) {
          combined.push(mBook as any);
        }
      }

      res.status(200).json({ bookings: combined });
    } catch {
      res.status(200).json({ bookings: memoryBookings });
    }
  } catch (error) {
    console.error("Get customer bookings error:", error);
    res.status(500).json({
      message: "Server error while fetching bookings",
    });
  }
};

export const cancelBooking = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        message: "Authentication required",
      });
      return;
    }

    const id = getParamId(req.params.id);

    if (getIsInMemoryMode()) {
      const updated = memoryStore.updateBookingStatus(id, "cancelled");
      if (!updated) {
        res.status(404).json({ message: "Booking not found" });
        return;
      }
      res.status(200).json({
        message: "Booking cancelled successfully",
        booking: updated,
      });
      return;
    }

    try {
      const booking = await Booking.findById(id);

      if (!booking) {
        const updated = memoryStore.updateBookingStatus(id, "cancelled");
        if (updated) {
          res.status(200).json({
            message: "Booking cancelled successfully",
            booking: updated,
          });
          return;
        }
        res.status(404).json({ message: "Booking not found" });
        return;
      }

      if (booking.customer.toString() !== req.user.id) {
        res.status(403).json({
          message: "You can only cancel your own bookings",
        });
        return;
      }

      if (booking.status !== "scheduled") {
        res.status(400).json({
          message: "Only scheduled bookings can be cancelled",
        });
        return;
      }

      booking.status = "cancelled";
      await booking.save();

      res.status(200).json({
        message: "Booking cancelled successfully",
        booking,
      });
    } catch {
      const updated = memoryStore.updateBookingStatus(id, "cancelled");
      res.status(200).json({
        message: "Booking cancelled successfully",
        booking: updated,
      });
    }
  } catch (error) {
    console.error("Cancel booking error:", error);
    res.status(500).json({
      message: "Server error while cancelling booking",
    });
  }
};

export const getProviderBookings = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        message: "Authentication required",
      });
      return;
    }

    const memoryBookings = memoryStore.getBookings({ providerId: req.user.id }) || [];

    if (getIsInMemoryMode()) {
      res.status(200).json({ bookings: memoryBookings });
      return;
    }

    try {
      const dbBookings = await Booking.find({
        provider: req.user.id,
      })
        .populate("customer", "name email")
        .populate("service")
        .sort({ date: 1 });

      const existingIds = new Set(dbBookings.map((b) => b._id.toString()));
      const combined = [...dbBookings];

      for (const mBook of memoryBookings) {
        if (!existingIds.has(mBook._id)) {
          combined.push(mBook as any);
        }
      }

      res.status(200).json({ bookings: combined });
    } catch {
      res.status(200).json({ bookings: memoryBookings });
    }
  } catch (error) {
    console.error("Get provider bookings error:", error);
    res.status(500).json({
      message: "Server error while fetching provider bookings",
    });
  }
};

export const completeBooking = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        message: "Authentication required",
      });
      return;
    }

    const id = getParamId(req.params.id);

    if (getIsInMemoryMode()) {
      const updated = memoryStore.updateBookingStatus(id, "completed");
      if (!updated) {
        res.status(404).json({ message: "Booking not found" });
        return;
      }
      res.status(200).json({
        message: "Booking marked as completed",
        booking: updated,
      });
      return;
    }

    try {
      const booking = await Booking.findById(id);

      if (!booking) {
        const updated = memoryStore.updateBookingStatus(id, "completed");
        if (updated) {
          res.status(200).json({
            message: "Booking marked as completed",
            booking: updated,
          });
          return;
        }
        res.status(404).json({ message: "Booking not found" });
        return;
      }

      if (booking.provider.toString() !== req.user.id) {
        res.status(403).json({
          message: "You can only manage bookings for your services",
        });
        return;
      }

      if (booking.status !== "scheduled") {
        res.status(400).json({
          message: "Only scheduled bookings can be completed",
        });
        return;
      }

      booking.status = "completed";
      await booking.save();

      res.status(200).json({
        message: "Booking marked as completed",
        booking,
      });
    } catch {
      const updated = memoryStore.updateBookingStatus(id, "completed");
      res.status(200).json({
        message: "Booking marked as completed",
        booking: updated,
      });
    }
  } catch (error) {
    console.error("Complete booking error:", error);
    res.status(500).json({
      message: "Server error while completing booking",
    });
  }
};

export const getBookings = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: "Authentication required" });
    return;
  }

  if (req.user.role === "provider") {
    return getProviderBookings(req, res);
  }

  return getCustomerBookings(req, res);
};

export const updateBookingStatus = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: "Authentication required" });
    return;
  }

  const { status } = req.body;
  if (status === "cancelled") {
    return cancelBooking(req, res);
  }
  if (status === "completed") {
    return completeBooking(req, res);
  }

  res.status(400).json({
    message: "Status must be 'completed' or 'cancelled'",
  });
};