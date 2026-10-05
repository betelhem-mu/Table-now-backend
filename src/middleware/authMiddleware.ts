import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: "customer" | "provider";
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
      role: "customer" | "provider";
    };

    req.user = {
      id: decoded.userId,
      role: decoded.role,
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
          role: "customer" | "provider";
        };
        req.user = {
          id: decoded.userId,
          role: decoded.role,
        };
      }
    }
  } catch {
    // Optional auth - ignore token errors for public browsing
  }
  next();
};

export default authMiddleware;