import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { connectRedis } from "./redis";
import { authRouter } from "./routes/auth";
import { indexRouter } from "./routes/index";
import { persistRouter } from "./routes/persist";
import { spotifyRouter } from "./routes/spotify";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRouter);
app.use("/api/spotify", spotifyRouter);
app.use("/api/persist", persistRouter);
app.use("/api", indexRouter);

// Initialize Redis connection and start server
const startServer = async () => {
  try {
    await connectRedis();
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
