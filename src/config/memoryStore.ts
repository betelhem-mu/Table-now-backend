import bcrypt from "bcryptjs";
import mongoose from "mongoose";

export interface MemoryUser {
  _id: string;
  name: string;
  email: string;
  password: string;
  role: "customer" | "provider";
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
const defaultProviderId = "650000000000000000000001";
const defaultCustomerId = "650000000000000000000002";
const userBmId = "650000000000000000000003";

const hashedDefaultPassword = bcrypt.hashSync("password123", 10);

const users: MemoryUser[] = [
  {
    _id: defaultProviderId,
    name: "Apex Service Studio",
    email: "provider@example.com",
    password: hashedDefaultPassword,
    role: "provider",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    _id: defaultCustomerId,
    name: "Alex Johnson",
    email: "customer@example.com",
    password: hashedDefaultPassword,
    role: "customer",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    _id: userBmId,
    name: "BM User",
    email: "bm9577971@gmail.com",
    password: hashedDefaultPassword,
    role: "provider",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const services: MemoryService[] = [];
const bookings: MemoryBooking[] = [];

// Helper ID Generator
const generateId = () => Math.random().toString(16).substring(2, 14) + Date.now().toString(16).substring(0, 12);

export const memoryStore = {
  // USER METHODS
  findUserByEmail: (email: string) => {
    const norm = email.toLowerCase().trim();
    return users.find((u) => u.email.toLowerCase().trim() === norm);
  },

  findUserById: (id: string) => {
    return users.find((u) => u._id === id);
  },

  createUser: (data: { name: string; email: string; password: string; role: "customer" | "provider" }) => {
    const newUser: MemoryUser = {
      _id: generateId(),
      name: data.name.trim(),
      email: data.email.toLowerCase().trim(),
      password: data.password,
      role: data.role || "customer",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    users.push(newUser);
    return newUser;
  },

  // SERVICE METHODS
  getServices: () => {
    return services;
  },

  getServiceById: (id: string) => {
    return services.find((s) => s._id === id);
  },

  createService: (data: { name: string; description: string; price: number; duration: number; category?: string; image?: string; providerId: string }) => {
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
        : data.providerId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    services.push(newService);
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
    return services[index];
  },

  deleteService: (id: string) => {
    const index = services.findIndex((s) => s._id === id);
    if (index === -1) return false;
    services.splice(index, 1);
    return true;
  },

  // BOOKING METHODS
  getBookings: (filter: { customerId?: string; providerId?: string }) => {
    return bookings.filter((b) => {
      if (filter.customerId && (b.customer._id || b.customer) !== filter.customerId) return false;
      if (filter.providerId && (b.provider._id || b.provider) !== filter.providerId) return false;
      return true;
    });
  },

  createBooking: (data: { customerId: string; serviceId: string; date: Date }) => {
    const service = services.find((s) => s._id === data.serviceId);
    const customer = users.find((u) => u._id === data.customerId);
    if (!service || !customer) return null;

    const provider = typeof service.provider === "object" ? service.provider : users.find((u) => u._id === service.provider);

    const newBooking: MemoryBooking = {
      _id: generateId(),
      customer: { _id: customer._id, name: customer.name, email: customer.email },
      provider: provider ? { _id: provider._id, name: provider.name, email: provider.email } : service.provider,
      service: { _id: service._id, name: service.name, price: service.price, duration: service.duration, image: service.image, category: service.category },
      date: new Date(data.date),
      status: "scheduled",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    bookings.push(newBooking);
    return newBooking;
  },

  updateBookingStatus: (id: string, status: "scheduled" | "completed" | "cancelled") => {
    const booking = bookings.find((b) => b._id === id);
    if (!booking) return null;
    booking.status = status;
    booking.updatedAt = new Date();
    return booking;
  },
};
