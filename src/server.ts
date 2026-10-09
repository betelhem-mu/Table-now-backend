import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDatabase from "./config/database.js";
import authRoutes from "./routes/authRoutes.js";
import serviceRoutes from "./routes/serviceRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

app.get("/", (_req, res) => {
  res.json({
    message: "TableNow API is running",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/admin", adminRoutes);

// Error handling middleware to prevent HTML error responses on API endpoints
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("API error caught:", err);
  if (err.type === "entity.too.large" || err.status === 413) {
    res.status(413).json({ message: "Payload too large. Please select a smaller image or paste an image URL." });
    return;
  }
  res.status(err.status || 500).json({ message: err.message || "Internal server error" });
});

const PORT = process.env.PORT || 5000;

const startServer = (): void => {
  app.listen(PORT, () => {
    console.log(`TableNow backend running on port ${PORT}`);
  });

  // Connect database or activate memory fallback asynchronously
  connectDatabase();
};

startServer();