import { Response } from "express";
import Service from "../models/Service.js";
import { AuthenticatedRequest } from "../middleware/authMiddleware.js";
import { memoryStore, getIsInMemoryMode } from "../config/memoryStore.js";

const getParamId = (param: string | string[] | undefined): string => {
  if (Array.isArray(param)) return param[0] || "";
  return param || "";
};

export const getServices = async (
  _req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const memoryServices = memoryStore.getServices() || [];

    if (getIsInMemoryMode()) {
      res.status(200).json({ services: memoryServices });
      return;
    }

    try {
      const dbServices = await Service.find()
        .populate("provider", "name email")
        .sort({ createdAt: -1 });

      const existingIds = new Set(dbServices.map((s) => s._id.toString()));
      const combined = [...dbServices];

      for (const mServ of memoryServices) {
        if (!existingIds.has(mServ._id)) {
          combined.push(mServ as any);
        }
      }

      res.status(200).json({ services: combined });
    } catch {
      res.status(200).json({ services: memoryServices });
    }
  } catch (error) {
    console.error("Get services error:", error);
    res.status(200).json({ services: memoryStore.getServices() });
  }
};

export const getServiceById = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const id = getParamId(req.params.id);

    if (getIsInMemoryMode()) {
      const service = memoryStore.getServiceById(id);
      if (!service) {
        res.status(404).json({ message: "Service not found" });
        return;
      }
      res.status(200).json({ service });
      return;
    }

    try {
      const service = await Service.findById(id).populate("provider", "name email");
      if (!service) {
        const memServ = memoryStore.getServiceById(id);
        if (memServ) {
          res.status(200).json({ service: memServ });
          return;
        }
        res.status(404).json({ message: "Service not found" });
        return;
      }
      res.status(200).json({ service });
    } catch {
      const memServ = memoryStore.getServiceById(id);
      if (memServ) {
        res.status(200).json({ service: memServ });
        return;
      }
      res.status(404).json({ message: "Service not found" });
    }
  } catch (error) {
    console.error("Get service by ID error:", error);
    res.status(500).json({ message: "Server error while fetching service" });
  }
};

export const createService = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    if (req.user.role === "provider" && req.user.providerStatus !== "approved") {
      res.status(403).json({ message: "Your service provider application is pending approval or has been rejected. You cannot manage services until approved by an admin." });
      return;
    }

    const { name, description, price, duration, category, image } = req.body;

    if (!name || !description || price === undefined || !duration) {
      res.status(400).json({ message: "Name, description, price, and duration are required" });
      return;
    }

    const numericPrice = Number(price);
    const numericDuration = Number(duration);

    if (Number.isNaN(numericPrice) || numericPrice < 0) {
      res.status(400).json({ message: "Price must be a valid number greater than or equal to 0" });
      return;
    }

    if (Number.isNaN(numericDuration) || numericDuration < 1) {
      res.status(400).json({ message: "Duration must be at least 1 minute" });
      return;
    }

    // --- Duplicate service name check ---
    const trimmedName = name.trim().toLowerCase();

    // Check memoryStore first
    const memDuplicate = memoryStore.getServiceByName(trimmedName);
    if (memDuplicate) {
      res.status(409).json({ message: `A service named "${name.trim()}" already exists. Please use a different name.` });
      return;
    }

    // If using MongoDB, also check the DB
    if (!getIsInMemoryMode()) {
      try {
        const dbDuplicate = await Service.findOne({
          name: { $regex: new RegExp(`^${trimmedName}$`, "i") },
        });
        if (dbDuplicate) {
          res.status(409).json({ message: `A service named "${name.trim()}" already exists. Please use a different name.` });
          return;
        }
      } catch {
        // If DB check fails, fall through — memoryStore already confirmed no duplicate
      }
    }
    // --- End duplicate check ---

    const newServ = memoryStore.createService({
      name,
      description,
      price: numericPrice,
      duration: numericDuration,
      category,
      image,
      providerId: req.user.id,
    });

    if (!newServ) {
      res.status(409).json({ message: `A service named "${name.trim()}" already exists. Please use a different name.` });
      return;
    }

    if (!getIsInMemoryMode()) {
      try {
        await Service.create({
          name: name.trim(),
          description: description.trim(),
          price: numericPrice,
          duration: numericDuration,
          category: category ? category.trim() : "General",
          image: image ? image.trim() : "",
          provider: req.user.id,
        });
      } catch (err) {
        console.warn("Atlas service creation sync skipped/fallback used:", err);
      }
    }

    res.status(201).json({ message: "Service created successfully", service: newServ });
  } catch (error) {
    console.error("Create service error:", error);
    res.status(500).json({ message: "Server error while creating service" });
  }
};

export const updateService = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    if (req.user.role === "provider" && req.user.providerStatus !== "approved") {
      res.status(403).json({ message: "Your service provider application is pending approval or has been rejected. You cannot manage services until approved by an admin." });
      return;
    }

    const id = getParamId(req.params.id);
    const { name, description, price, duration, category, image } = req.body;

    if (getIsInMemoryMode()) {
      const updated = memoryStore.updateService(id, {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(price !== undefined && { price: Number(price) }),
        ...(duration !== undefined && { duration: Number(duration) }),
        ...(category !== undefined && { category }),
        ...(image !== undefined && { image }),
      });

      if (!updated) {
        res.status(404).json({ message: "Service not found" });
        return;
      }

      res.status(200).json({ message: "Service updated successfully", service: updated });
      return;
    }

    try {
      const service = await Service.findById(id);
      if (!service) {
        res.status(404).json({ message: "Service not found" });
        return;
      }

      if (service.provider.toString() !== req.user.id) {
        res.status(403).json({ message: "You can only edit your own services" });
        return;
      }

      if (name !== undefined) service.name = name.trim();
      if (description !== undefined) service.description = description.trim();
      if (price !== undefined) service.price = Number(price);
      if (duration !== undefined) service.duration = Number(duration);
      if (category !== undefined) service.category = category.trim();
      if (image !== undefined) service.image = image.trim();

      await service.save();
      res.status(200).json({ message: "Service updated successfully", service });
    } catch {
      const updated = memoryStore.updateService(id, {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(price !== undefined && { price: Number(price) }),
        ...(duration !== undefined && { duration: Number(duration) }),
        ...(category !== undefined && { category }),
        ...(image !== undefined && { image }),
      });
      res.status(200).json({ message: "Service updated successfully", service: updated });
    }
  } catch (error) {
    console.error("Update service error:", error);
    res.status(500).json({ message: "Server error while updating service" });
  }
};

export const deleteService = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    if (req.user.role === "provider" && req.user.providerStatus !== "approved") {
      res.status(403).json({ message: "Your service provider application is pending approval or has been rejected. You cannot manage services until approved by an admin." });
      return;
    }

    const id = getParamId(req.params.id);

    if (getIsInMemoryMode()) {
      memoryStore.deleteService(id);
      res.status(200).json({ message: "Service deleted successfully" });
      return;
    }

    try {
      const service = await Service.findById(id);
      if (service) {
        await service.deleteOne();
      } else {
        memoryStore.deleteService(id);
      }
      res.status(200).json({ message: "Service deleted successfully" });
    } catch {
      memoryStore.deleteService(id);
      res.status(200).json({ message: "Service deleted successfully" });
    }
  } catch (error) {
    console.error("Delete service error:", error);
    res.status(500).json({ message: "Server error while deleting service" });
  }
};