import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { memoryStore } from "../config/memoryStore.js";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: "customer" | "provider" | "admin";
    providerStatus?: "pending" | "approved" | "rejected";
    isSuspended?: boolean;
  };
}

const getJwtSecret = (): string => {
  return process.env.JWT_SECRET || "bookeasy_super_secret_key_change_this_later";
};

const authMiddleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      res.status(401).json({
        message: "Authorization token is required",
      });
      return;
    }

    if (!authHeader.startsWith("Bearer ")) {
      res.status(401).json({
        message: "Invalid authorization format",
      });
      return;
    }

    const token = authHeader.substring(7);

    if (!token) {
      res.status(401).json({
        message: "Authentication token is missing",
      });
      return;
    }

    const decoded = jwt.verify(token, getJwtSecret()) as {
      userId: string;
      role: "customer" | "provider" | "admin";
    };

    // Check account status in memoryStore
    const existingUser = memoryStore.findUserById(decoded.userId);
    if (existingUser && existingUser.isSuspended) {
      res.status(403).json({
        message: "Your account has been suspended. Please contact an administrator.",
      });
      return;
    }

    req.user = {
      id: decoded.userId,
      role: existingUser ? existingUser.role : decoded.role,
      providerStatus: existingUser?.providerStatus || "approved",
      isSuspended: existingUser?.isSuspended ?? false,
    };

    next();
  } catch {
    res.status(401).json({
      message: "Invalid or expired token",
    });
  }
};

export const optionalAuthMiddleware = (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      if (token) {
        const decoded = jwt.verify(token, getJwtSecret()) as {
          userId: string;
          role: "customer" | "provider" | "admin";
        };
        const existingUser = memoryStore.findUserById(decoded.userId);
        if (existingUser && existingUser.isSuspended) {
          next();
          return;
        }
        req.user = {
          id: decoded.userId,
          role: existingUser ? existingUser.role : decoded.role,
          providerStatus: existingUser?.providerStatus || "approved",
          isSuspended: existingUser?.isSuspended ?? false,
        };
      }
    }
  } catch {
    // Optional auth - ignore token errors for public browsing
  }
  next();
};

export default authMiddleware;