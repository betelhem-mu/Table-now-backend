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

    // 4. Define catalog of services across multiple domains (Barber services removed)
    const initialServices = [
      {
        name: "Full Hair Coloring & Styling",
        description: "Professional hair coloring, highlight application, washing, deep conditioning, and blow dry styling.",
        price: 120,
        duration: 90,
        category: "Beauty & Wellness",
        image: "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=900&q=80",
        provider: provider._id,
      },
      {
        name: "1-on-1 Mathematics & Physics Tutoring",
        description: "Personalized high school or college level math/physics coaching, exam prep, and problem solving.",
        price: 60,
        duration: 60,
        category: "Education & Coaching",
        image: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=900&q=80",
        provider: provider._id,
      },
      {
        name: "Software & Web Development Advisory",
        description: "Technical consulting on application architecture, code reviews, API design, and cloud deployment strategies.",
        price: 150,
        duration: 60,
        category: "Tech & Business",
        image: "https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=900&q=80",
        provider: provider._id,
      },
      {
        name: "Deep Tissue & Swedish Massage",
        description: "Therapeutic full body massage aimed at muscle tension relief, stress reduction, and posture improvement.",
        price: 85,
        duration: 60,
        category: "Beauty & Wellness",
        image: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=900&q=80",
        provider: provider._id,
      },
      {
        name: "Personal Fitness & Nutrition Coaching",
        description: "Customized workout session tailored to your fitness goals plus a tailored nutritional guideline plan.",
        price: 55,
        duration: 45,
        category: "Health & Fitness",
        image: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=900&q=80",
        provider: provider._id,
      },
      {
        name: "Premium Interior & Exterior Auto Detail",
        description: "Complete vehicle wash, paint polish, wax coating, deep interior vacuuming, and leather treatment.",
        price: 160,
        duration: 120,
        category: "Automotive",
        image: "https://images.unsplash.com/photo-1607860108855-64acf2078ed9?auto=format&fit=crop&w=900&q=80",
        provider: provider._id,
      },
      {
        name: "Business Strategy & Growth Audit",
        description: "Comprehensive 90-minute business audit evaluating marketing strategies, sales funnels, and operational efficiency.",
        price: 200,
        duration: 90,
        category: "Tech & Business",
        image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=900&q=80",
        provider: provider._id,
      },
    ];

    // Seed or update services
    let insertedCount = 0;
    for (const serviceItem of initialServices) {
      const existing = await Service.findOne({ name: serviceItem.name });
      if (!existing) {
        await Service.create(serviceItem);
        insertedCount++;
      } else {
        existing.category = serviceItem.category;
        existing.image = serviceItem.image;
        await existing.save();
      }
    }
    console.log(`Seeded or updated ${initialServices.length} services successfully.`);

    // Fetch created services
    const allServices = await Service.find({ provider: provider._id });

    // 4. Create sample initial bookings if none exist for customer
    const existingBookingsCount = await Booking.countDocuments({ customer: customer._id });
    if (existingBookingsCount === 0 && allServices.length > 0) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(14, 0, 0, 0);

      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 5);
      nextWeek.setHours(10, 30, 0, 0);

      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 3);
      pastDate.setHours(16, 0, 0, 0);

      await Booking.create([
        {
          customer: customer._id,
          provider: provider._id,
          service: allServices[0]._id,
          date: tomorrow,
          status: "scheduled",
        },
        {
          customer: customer._id,
          provider: provider._id,
          service: allServices[2]._id,
          date: nextWeek,
          status: "scheduled",
        },
        {
          customer: customer._id,
          provider: provider._id,
          service: allServices[4]._id,
          date: pastDate,
          status: "completed",
        },
      ]);
      console.log("Seeded initial sample bookings for demo customer.");
    }

    console.log("Database seeding completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Database seeding failed:", error);
    process.exit(1);
  }
};

seedData();
