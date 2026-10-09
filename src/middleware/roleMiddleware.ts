import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "./authMiddleware.js";

const roleMiddleware = (
  ...allowedRoles: ("customer" | "provider" | "admin")[]
) => {
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): void => {
    if (!req.user) {
      res.status(401).json({
        message: "Authentication required",
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        message: "You do not have permission to access this resource",
      });
      return;
    }

    next();
  };
};

export default roleMiddleware;