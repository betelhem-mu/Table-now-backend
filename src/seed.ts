import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import User from "./models/User.js";
import Service from "./models/Service.js";
import Booking from "./models/Booking.js";

dotenv.config();

const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/table-now";

const seedData = async () => {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(mongoUri);
    console.log("MongoDB Connected for seeding.");

    // 1. Create or find default Provider account
    let provider = await User.findOne({ email: "provider@example.com" });
    if (!provider) {
      const hashedPassword = await bcrypt.hash("password123", 10);
      provider = await User.create({
        name: "Apex Service Studio",
        email: "provider@example.com",
        password: hashedPassword,
        role: "provider",
      });
      console.log("Created default provider user: provider@example.com");
    }

    // 2. Create or find default Customer account
    let customer = await User.findOne({ email: "customer@example.com" });
    if (!customer) {
      const hashedPassword = await bcrypt.hash("password123", 10);
      customer = await User.create({
        name: "Alex Johnson",
        email: "customer@example.com",
        password: hashedPassword,
        role: "customer",
      });
      console.log("Created default customer user: customer@example.com");
    }

    // 3. Delete any legacy Barber services from DB if present
    const deleteBarberResult = await Service.deleteMany({
      $or: [
        { name: { $regex: /barber|haircut|fade|beard|razor/i } },
        { description: { $regex: /barber|haircut|fade|beard|razor/i } },
      ],
    });
    if (deleteBarberResult.deletedCount > 0) {
      console.log(`Removed ${deleteBarberResult.deletedCount} legacy barber service(s) from database.`);
    }


    // Services are intentionally NOT seeded.
    // Providers must create all services through the dashboard.
    console.log("No services seeded — providers will create their own services.");

    console.log("Database seeding completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Database seeding failed:", error);
    process.exit(1);
  }
};

seedData();
