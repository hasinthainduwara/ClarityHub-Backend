import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import { connectDatabase } from "./config/database";
import { errorHandler } from "./middleware/errorHandler";
import userRoutes from "./routes/userRoutes";
import authRoutes from "./routes/authRoutes";
import postRoutes from "./routes/postRoutes";
import professionalRoutes from "./routes/professionalRoutes";
import commentRoutes from "./routes/commentRoutes";
import moodRoutes from "./routes/moodRoutes";
import communityRoutes from "./routes/communityRoutes";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
});

// Middleware
app.use(
  helmet({
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
    crossOriginEmbedderPolicy: false,
  })
); // Security headers with Google OAuth compatibility
app.use(compression()); // Compress responses
app.use(limiter); // Apply rate limiting
app.use(
  cors({
    origin: (origin, callback) => {
      const allowedOrigins = [
        "https://clarity-hub-front-end-blond.vercel.app",
        "http://localhost:5173",
        "http://localhost:3000",
      ];

      if (process.env.CORS_ORIGIN === "*") {
        return callback(null, true);
      }

      if (process.env.CORS_ORIGIN) {
        if (process.env.CORS_ORIGIN.includes(",")) {
          allowedOrigins.push(
            ...process.env.CORS_ORIGIN.split(",").map((o) => o.trim())
          );
        } else {
          allowedOrigins.push(process.env.CORS_ORIGIN);
        }
      }

      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "ClarityHub Backend is running",
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/professionals", professionalRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/mood", moodRoutes);
app.use("/api/communities", communityRoutes);

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    error: "Route not found",
    message: `The requested endpoint ${req.originalUrl} does not exist`,
  });
});

// Global error handler
app.use(errorHandler);

// Connect to database (for serverless, connection is cached)
let isConnected = false;

const connectDB = async () => {
  if (isConnected) return;
  try {
    await connectDatabase();
    isConnected = true;
  } catch (error) {
    console.error("Database connection error:", error);
    throw error;
  }
};

// For local development - start server
if (process.env.NODE_ENV !== "production") {
  const startServer = async (): Promise<void> => {
    try {
      await connectDatabase();
      app.listen(PORT, () => {
        console.log(`🚀 Server is running on port ${PORT}`);
        console.log(
          `📊 Health check available at http://localhost:${PORT}/health`
        );
      });
    } catch (error) {
      console.error("Failed to start server:", error);
      process.exit(1);
    }
  };

  startServer().catch(console.error);
}

// Handle unhandled promise rejections
process.on("unhandledRejection", (err: Error) => {
  console.error("Unhandled Promise Rejection:", err);
  if (process.env.NODE_ENV !== "production") {
    process.exit(1);
  }
});

// Handle uncaught exceptions
process.on("uncaughtException", (err: Error) => {
  console.error("Uncaught Exception:", err);
  if (process.env.NODE_ENV !== "production") {
    process.exit(1);
  }
});

// Connect to database before handling requests (for serverless)
connectDB().catch(console.error);

// Export app for Vercel serverless and testing
export default app;
export { app };
