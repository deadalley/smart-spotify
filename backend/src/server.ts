import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { connectRedis } from "./redis";
import { indexRouter } from "./routes";
import { authRouter } from "./routes/auth";
import { persistRouter } from "./routes/persist";
import { spotifyRouter } from "./routes/spotify";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

const clientUrl =
  process.env.CLIENT_URL || "http://127.0.0.1:5173";

app.use(
  cors({
    origin: clientUrl,
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
      console.log(`🚀 Server running on http://127.0.0.1:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
