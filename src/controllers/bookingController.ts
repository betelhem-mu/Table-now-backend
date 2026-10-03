import { Response } from "express";
import Booking from "../models/Booking.js";
import Service from "../models/Service.js";
import { AuthenticatedRequest } from "../middleware/authMiddleware.js";

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

    const { serviceId, date } = req.body;

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

    const service = await Service.findById(serviceId);

    if (!service) {
      res.status(404).json({
        message: "Service not found",
      });
      return;
    }

    const existingBooking = await Booking.findOne({
      service: service._id,
      date: bookingDate,
      status: "scheduled",
    });

    if (existingBooking) {
      res.status(409).json({
        message: "This service is already booked for this time",
      });
      return;
    }

    const booking = await Booking.create({
      customer: req.user.id,
      service: service._id,
      provider: service.provider,
      date: bookingDate,
      status: "scheduled",
    });

    res.status(201).json({
      message: "Booking created successfully",
      booking,
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

    const bookings = await Booking.find({
      customer: req.user.id,
    })
      .populate("service")
      .populate("provider", "name email")
      .sort({ date: 1 });

    res.status(200).json({
      bookings,
    });
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

    const { id } = req.params;

    const booking = await Booking.findById(id);

    if (!booking) {
      res.status(404).json({
        message: "Booking not found",
      });
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

    const bookings = await Booking.find({
      provider: req.user.id,
    })
      .populate("customer", "name email")
      .populate("service")
      .sort({ date: 1 });

    res.status(200).json({
      bookings,
    });
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

    const { id } = req.params;

    const booking = await Booking.findById(id);

    if (!booking) {
      res.status(404).json({
        message: "Booking not found",
      });
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
  } catch (error) {
    console.error("Complete booking error:", error);

    res.status(500).json({
      message: "Server error while completing booking",
    });
  }
};