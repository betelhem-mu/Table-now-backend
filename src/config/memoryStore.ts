import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";

export interface MemoryUser {
  _id: string;
  name: string;
  email: string;
  password: string;
  role: "customer" | "provider" | "admin";
  providerStatus?: "pending" | "approved" | "rejected";
  isSuspended?: boolean;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MemoryService {
  _id: string;
  name: string;
  description: string;
  price: number;
  duration: number;
  category: string;
  image: string;
  provider: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface MemoryBooking {
  _id: string;
  customer: any;
  provider: any;
  service: any;
  date: Date;
  time?: string;
  status: "scheduled" | "completed" | "cancelled";
  createdAt: Date;
  updatedAt: Date;
}

let isInMemoryModeExplicit = false;

export const setInMemoryMode = (enabled: boolean) => {
  isInMemoryModeExplicit = enabled;
};

export const getIsInMemoryMode = (): boolean => {
  if (isInMemoryModeExplicit) return true;
  return mongoose.connection.readyState !== 1;
};

// Initial Default Accounts
const defaultAdminId = "650000000000000000000000";
const defaultProviderId = "650000000000000000000001";
const defaultCustomerId = "650000000000000000000002";
const userBmId = "650000000000000000000003";
const userBmuId = "650000000000000000000004";

const hashedDefaultPassword = bcrypt.hashSync("password123", 10);

const defaultUsers: MemoryUser[] = [
  {
    _id: defaultAdminId,
    name: "System Administrator",
    email: "admin@example.com",
    password: hashedDefaultPassword,
    role: "admin",
    providerStatus: "approved",
    isSuspended: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    _id: defaultProviderId,
    name: "Apex Service Studio",
    email: "provider@example.com",
    password: hashedDefaultPassword,
    role: "provider",
    providerStatus: "approved",
    isSuspended: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    _id: defaultCustomerId,
    name: "Alex Johnson",
    email: "customer@example.com",
    password: hashedDefaultPassword,
    role: "customer",
    providerStatus: "approved",
    isSuspended: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    _id: userBmId,
    name: "BM User",
    email: "bm9577971@gmail.com",
    password: hashedDefaultPassword,
    role: "provider",
    providerStatus: "approved",
    isSuspended: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    _id: userBmuId,
    name: "BM User",
    email: "bmu@gmail.com",
    password: hashedDefaultPassword,
    role: "provider",
    providerStatus: "approved",
    isSuspended: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

let users: MemoryUser[] = [...defaultUsers];
let services: MemoryService[] = [];
let bookings: MemoryBooking[] = [];

// Persistence Storage Path
const dataDir = path.resolve(process.cwd(), "data");
const storePath = path.resolve(dataDir, "store.json");

const loadFromDisk = () => {
  try {
    if (fs.existsSync(storePath)) {
      const raw = fs.readFileSync(storePath, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.users) && parsed.users.length > 0) {
        users = parsed.users.map((u: MemoryUser) => ({
          ...u,
          providerStatus: u.providerStatus || "approved",
          isSuspended: u.isSuspended ?? false,
        }));
        // Ensure default users exist
        for (const defU of defaultUsers) {
          if (!users.some((u) => u.email.toLowerCase().trim() === defU.email.toLowerCase().trim())) {
            users.push(defU);
          }
        }
      }
      if (Array.isArray(parsed.services)) {
        services = parsed.services;
      }
      if (Array.isArray(parsed.bookings)) {
        bookings = parsed.bookings;
      }
    }
  } catch (err) {
    console.warn("Could not load memoryStore from disk:", err);
  }
};

const saveToDisk = () => {
  try {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(storePath, JSON.stringify({ users, services, bookings }, null, 2), "utf-8");
  } catch (err) {
    console.warn("Could not save memoryStore to disk:", err);
  }
};

// Initial load
loadFromDisk();

// Helper ID Generator
const generateId = () => Math.random().toString(16).substring(2, 14) + Date.now().toString(16).substring(0, 12);

export const memoryStore = {
  // USER METHODS
  getUsers: () => {
    return users;
  },

  findUserByEmail: (email: string) => {
    const norm = email.toLowerCase().trim();
    return users.find((u) => u.email.toLowerCase().trim() === norm);
  },

  findUserById: (id: string) => {
    return users.find((u) => u._id === id);
  },

  createUser: (data: {
    name: string;
    email: string;
    password: string;
    role: "customer" | "provider" | "admin";
    providerStatus?: "pending" | "approved" | "rejected";
  }) => {
    const norm = data.email.toLowerCase().trim();
    const existing = users.find((u) => u.email.toLowerCase().trim() === norm);
    if (existing) return null;

    const userRole = data.role || "customer";
    const initialProviderStatus = data.providerStatus || (userRole === "provider" ? "pending" : "approved");

    const newUser: MemoryUser = {
      _id: generateId(),
      name: data.name.trim(),
      email: norm,
      password: data.password,
      role: userRole,
      providerStatus: initialProviderStatus,
      isSuspended: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    users.push(newUser);
    saveToDisk();
    return newUser;
  },

  updateUser: (id: string, updates: Partial<MemoryUser>) => {
    const userIndex = users.findIndex((u) => u._id === id);
    if (userIndex === -1) return null;
    users[userIndex] = {
      ...users[userIndex],
      ...updates,
      updatedAt: new Date(),
    };
    saveToDisk();
    return users[userIndex];
  },

  // SERVICE METHODS
  getServices: () => {
    return services;
  },

  getServiceById: (id: string) => {
    return services.find((s) => s._id === id);
  },

  getServiceByName: (name: string) => {
    const norm = name.toLowerCase().trim();
    return services.find((s) => s.name.toLowerCase().trim() === norm) || null;
  },

  createService: (data: { name: string; description: string; price: number; duration: number; category?: string; image?: string; providerId: string }) => {
    // Prevent duplicate service names (case-insensitive)
    const norm = data.name.toLowerCase().trim();
    const existing = services.find((s) => s.name.toLowerCase().trim() === norm);
    if (existing) return null;

    const providerUser = users.find((u) => u._id === data.providerId);
    const newService: MemoryService = {
      _id: generateId(),
      name: data.name.trim(),
      description: data.description.trim(),
      price: data.price,
      duration: data.duration,
      category: data.category || "General",
      image: data.image || "",
      provider: providerUser
        ? { _id: providerUser._id, name: providerUser.name, email: providerUser.email }
        : { _id: data.providerId, name: "Provider", email: "" },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    services.push(newService);
    saveToDisk();
    return newService;
  },

  updateService: (id: string, data: Partial<MemoryService>) => {
    const index = services.findIndex((s) => s._id === id);
    if (index === -1) return null;
    services[index] = {
      ...services[index],
      ...data,
      updatedAt: new Date(),
    };
    saveToDisk();
    return services[index];
  },

  deleteService: (id: string) => {
    const index = services.findIndex((s) => s._id === id);
    if (index === -1) return false;
    services.splice(index, 1);
    saveToDisk();
    return true;
  },

  // BOOKING METHODS
  isSlotBooked: (serviceId: string, date: Date, time?: string) => {
    return bookings.some((b) => {
      if (b.status !== "scheduled") return false;
      const sId = typeof b.service === "object" ? b.service?._id : b.service;
      if (sId !== serviceId) return false;
      return isSameTimeSlot(b.date, b.time, date, time);
    });
  },

  getBookings: (filter: { customerId?: string; providerId?: string }) => {
    return bookings.filter((b) => {
      if (filter.customerId) {
        const cId = typeof b.customer === "object" ? b.customer?._id : b.customer;
        if (cId !== filter.customerId) return false;
      }
      if (filter.providerId) {
        const pId = typeof b.provider === "object" ? b.provider?._id : b.provider;
        if (pId !== filter.providerId) return false;
      }
      return true;
    });
  },

  createBooking: (data: { customerId: string; serviceId: string; date: Date; time?: string }) => {
    let service: any = services.find((s) => s._id === data.serviceId);
    let customer: any = users.find((u) => u._id === data.customerId);

    if (!customer) {
      customer = { _id: data.customerId, name: "Customer", email: "" };
    }

    if (!service) {
      service = { _id: data.serviceId, name: "Service", price: 0, duration: 30, image: "", category: "General", provider: "provider" };
    }

    const providerObj = typeof service.provider === "object"
      ? service.provider
      : (users.find((u) => u._id === service.provider) || { _id: service.provider, name: "Provider", email: "" });

    const newBooking: MemoryBooking = {
      _id: generateId(),
      customer: { _id: customer._id, name: customer.name || "Customer", email: customer.email || "" },
      provider: typeof providerObj === "object"
        ? { _id: providerObj._id || "provider", name: providerObj.name || "Provider", email: providerObj.email || "" }
        : { _id: providerObj, name: "Provider", email: "" },
      service: { _id: service._id, name: service.name || "Service", price: service.price || 0, duration: service.duration || 30, image: service.image || "", category: service.category || "General" },
      date: new Date(data.date),
      time: data.time || "",
      status: "scheduled",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    bookings.push(newBooking);
    saveToDisk();
    return newBooking;
  },

  updateBookingStatus: (id: string, status: "scheduled" | "completed" | "cancelled") => {
    const booking = bookings.find((b) => b._id === id);
    if (!booking) return null;
    booking.status = status;
    booking.updatedAt = new Date();
    saveToDisk();
    return booking;
  },
};

export const isSameTimeSlot = (
  date1: Date | string,
  time1: string | undefined,
  date2: Date | string,
  time2: string | undefined
): boolean => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  if (Number.isNaN(d1.getTime()) || Number.isNaN(d2.getTime())) return false;

  const sameTimestamp = d1.getTime() === d2.getTime();
  const sameDay = d1.toISOString().split("T")[0] === d2.toISOString().split("T")[0];

  const t1 = (time1 || "").trim().toLowerCase();
  const t2 = (time2 || "").trim().toLowerCase();

  if (t1 && t2) {
    return t1 === t2 && (sameDay || sameTimestamp);
  }

  return sameTimestamp || (sameDay && !t1 && !t2);
};

