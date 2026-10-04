import { Response } from "express";
import Service from "../models/Service.js";
import { AuthenticatedRequest } from "../middleware/authMiddleware.js";

export const getServices = async (
  _req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const services = await Service.find()
      .populate("provider", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      services,
    });
  } catch (error) {
    console.error("Get services error:", error);

    res.status(500).json({
      message: "Server error while fetching services",
    });
  }
};

export const getServiceById = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const service = await Service.findById(id).populate(
      "provider",
      "name email"
    );

    if (!service) {
      res.status(404).json({
        message: "Service not found",
      });
      return;
    }

    res.status(200).json({
      service,
    });
  } catch (error) {
    console.error("Get service by ID error:", error);

    res.status(500).json({
      message: "Server error while fetching service",
    });
  }
};

export const createService = async (
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

    const { name, description, price, duration, category, image } = req.body;

    if (!name || !description || price === undefined || !duration) {
      res.status(400).json({
        message: "Name, description, price, and duration are required",
      });
      return;
    }

    const numericPrice = Number(price);
    const numericDuration = Number(duration);

    if (Number.isNaN(numericPrice) || numericPrice < 0) {
      res.status(400).json({
        message: "Price must be a valid number greater than or equal to 0",
      });
      return;
    }

    if (Number.isNaN(numericDuration) || numericDuration < 1) {
      res.status(400).json({
        message: "Duration must be at least 1 minute",
      });
      return;
    }

    const service = await Service.create({
      name: name.trim(),
      description: description.trim(),
      price: numericPrice,
      duration: numericDuration,
      category: category ? category.trim() : "General",
      image: image ? image.trim() : "",
      provider: req.user.id,
    });

    res.status(201).json({
      message: "Service created successfully",
      service,
    });
  } catch (error) {
    console.error("Create service error:", error);

    res.status(500).json({
      message: "Server error while creating service",
    });
  }
};

export const updateService = async (
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
    const { name, description, price, duration, category, image } = req.body;

    const service = await Service.findById(id);

    if (!service) {
      res.status(404).json({
        message: "Service not found",
      });
      return;
    }

    if (service.provider.toString() !== req.user.id) {
      res.status(403).json({
        message: "You can only edit your own services",
      });
      return;
    }

    if (name !== undefined) {
      if (!name.trim()) {
        res.status(400).json({
          message: "Service name cannot be empty",
        });
        return;
      }

      service.name = name.trim();
    }

    if (description !== undefined) {
      if (!description.trim()) {
        res.status(400).json({
          message: "Service description cannot be empty",
        });
        return;
      }

      service.description = description.trim();
    }

    if (price !== undefined) {
      const numericPrice = Number(price);

      if (Number.isNaN(numericPrice) || numericPrice < 0) {
        res.status(400).json({
          message: "Price must be a valid number greater than or equal to 0",
        });
        return;
      }

      service.price = numericPrice;
    }

    if (duration !== undefined) {
      const numericDuration = Number(duration);

      if (Number.isNaN(numericDuration) || numericDuration < 1) {
        res.status(400).json({
          message: "Duration must be at least 1 minute",
        });
        return;
      }

      service.duration = numericDuration;
    }

    if (category !== undefined) {
      service.category = category.trim();
    }

    if (image !== undefined) {
      service.image = image.trim();
    }

    await service.save();

    res.status(200).json({
      message: "Service updated successfully",
      service,
    });
  } catch (error) {
    console.error("Update service error:", error);

    res.status(500).json({
      message: "Server error while updating service",
    });
  }
};

export const deleteService = async (
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

    const service = await Service.findById(id);

    if (!service) {
      res.status(404).json({
        message: "Service not found",
      });
      return;
    }

    if (service.provider.toString() !== req.user.id) {
      res.status(403).json({
        message: "You can only delete your own services",
      });
      return;
    }

    await service.deleteOne();

    res.status(200).json({
      message: "Service deleted successfully",
    });
  } catch (error) {
    console.error("Delete service error:", error);

    res.status(500).json({
      message: "Server error while deleting service",
    });
  }
};