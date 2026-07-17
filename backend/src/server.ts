import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import crypto from "crypto";
import { connectRedis } from "./redis";
import { indexRouter } from "./routes";
import { authRouter } from "./routes/auth";
import { persistRouter } from "./routes/persist";
import { spotifyRouter } from "./routes/spotify";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

const clientUrl = process.env.CLIENT_URL || "http://127.0.0.1:5173";
const isProduction = process.env.NODE_ENV === "production";

// Helps secure cookies work correctly behind proxies in production
app.set("trust proxy", 1);

app.use(
  cors({
    origin: clientUrl,
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser());

// Minimal CSRF protection (double-submit cookie):
// - server sets a readable csrf cookie
// - client echoes it in X-CSRF-Token for non-GET requests
app.use((req, res, next) => {
  const existing = req.cookies?.csrf_token as string | undefined;
  const csrfToken = existing ?? crypto.randomBytes(32).toString("hex");

  if (!existing) {
    res.cookie("csrf_token", csrfToken, {
      httpOnly: false,
      secure: isProduction,
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });
  }

  if (
    req.method === "GET" ||
    req.method === "HEAD" ||
    req.method === "OPTIONS"
  ) {
    return next();
  }

  const headerToken = req.header("x-csrf-token");
  if (!headerToken || headerToken !== csrfToken) {
    return res.status(403).json({ error: "Invalid CSRF token" });
  }

  next();
});

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
