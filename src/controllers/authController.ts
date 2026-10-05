import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { memoryStore, getIsInMemoryMode } from "../config/memoryStore.js";

export const register = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({
        message: "Name, email, and password are required",
      });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({
        message: "Password must be at least 6 characters",
      });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    const allowedRoles = ["customer", "provider"];
    const userRole = (role || "customer") as "customer" | "provider";

    if (!allowedRoles.includes(userRole)) {
      res.status(400).json({
        message: "Invalid role",
      });
      return;
    }

    // Prevent duplicate registration with same email
    const existingMemoryUser = memoryStore.findUserByEmail(normalizedEmail);
    if (existingMemoryUser) {
      res.status(400).json({
        message: "An account with this email address already exists.",
      });
      return;
    }

    if (!getIsInMemoryMode()) {
      try {
        const existingDbUser = await User.findOne({ email: normalizedEmail });
        if (existingDbUser) {
          res.status(400).json({
            message: "An account with this email address already exists.",
          });
          return;
        }
      } catch (err) {
        console.warn("MongoDB email check skipped:", err);
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Register in memoryStore
    const memoryUser = memoryStore.createUser({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: userRole,
    });

    if (!memoryUser) {
      res.status(400).json({
        message: "An account with this email address already exists.",
      });
      return;
    }

    // Also register in Mongo Atlas if connected
    if (!getIsInMemoryMode()) {
      try {
        const existing = await User.findOne({ email: normalizedEmail });
        if (!existing) {
          await User.create({
            name: name.trim(),
            email: normalizedEmail,
            password: hashedPassword,
            role: userRole,
          });
        }
      } catch (err) {
        console.warn("Atlas user registration sync skipped:", err);
      }
    }

    res.status(201).json({
      message: "User registered successfully",
      user: {
        id: memoryUser._id,
        name: memoryUser.name,
        email: memoryUser.email,
        role: memoryUser.role,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      message: "Server error during registration",
    });
  }
};

export const login = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({
        message: "Email and password are required",
      });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    const jwtSecret = process.env.JWT_SECRET || "bookeasy_super_secret_key_change_this_later";

    let foundUser: { id: string; name: string; email: string; passwordHash: string; role: "customer" | "provider" } | null = null;

    // First check memoryStore (default seeded provider/customer & memory registered)
    const memoryUser = memoryStore.findUserByEmail(normalizedEmail);
    if (memoryUser) {
      foundUser = {
        id: memoryUser._id,
        name: memoryUser.name,
        email: memoryUser.email,
        passwordHash: memoryUser.password,
        role: memoryUser.role,
      };
    } else if (!getIsInMemoryMode()) {
      // Check Mongo Atlas
      try {
        const dbUser = await User.findOne({ email: normalizedEmail });
        if (dbUser) {
          foundUser = {
            id: dbUser._id.toString(),
            name: dbUser.name,
            email: dbUser.email,
            passwordHash: dbUser.password,
            role: dbUser.role,
          };
        }
      } catch (dbError) {
        console.warn("Mongo Atlas user lookup failed:", dbError);
      }
    }

    if (!foundUser) {
      res.status(401).json({
        message: "Invalid email or password",
      });
      return;
    }

    const passwordIsCorrect = await bcrypt.compare(
      password,
      foundUser.passwordHash
    );

    if (!passwordIsCorrect) {
      res.status(401).json({
        message: "Invalid email or password",
      });
      return;
    }

    const token = jwt.sign(
      {
        userId: foundUser.id,
        role: foundUser.role,
      },
      jwtSecret,
      {
        expiresIn: "1d",
      }
    );

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: foundUser.id,
        name: foundUser.name,
        email: foundUser.email,
        role: foundUser.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      message: "Server error during login",
    });
  }
};