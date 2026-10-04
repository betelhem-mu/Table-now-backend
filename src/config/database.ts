import mongoose from "mongoose";
import dotenv from "dotenv";
import { setInMemoryMode } from "./memoryStore.js";
import Service from "../models/Service.js";

dotenv.config();

const connectDatabase = async (): Promise<void> => {
  try {
    const mongoUri = process.env.MONGODB_URI;

    if (!mongoUri) {
      throw new Error("MONGODB_URI is not defined");
    }

    console.log("[Database] Attempting to connect to MongoDB Atlas...");
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 3000,
      connectTimeoutMS: 3000,
    });

    console.log("[Database] MongoDB Atlas connected successfully!");
    setInMemoryMode(false);

    try {
      await Service.deleteMany({});
      console.log("[Database] Cleared legacy services from Atlas.");
    } catch {
      // Ignore cleanup error
    }
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.warn(`[Database] MongoDB Atlas connection timed out/failed: ${errMsg}`);
    console.log("[Database] Activating fast in-memory fallback store...");
    setInMemoryMode(true);
  }
};

export default connectDatabase;