import axios from "axios";
import crypto from "crypto";
import dotenv from "dotenv";
import { Request, Response, Router } from "express";

dotenv.config();

const router: Router = Router();

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI =
  process.env.SPOTIFY_REDIRECT_URI || "http://127.0.0.1:3001/api/auth/callback";
const CLIENT_URL = process.env.CLIENT_URL || "http://127.0.0.1:5173";
const isProduction = process.env.NODE_ENV === "production";

const generateRandomString = (bytes: number): string =>
  crypto.randomBytes(bytes).toString("hex");

router.get("/login", (req: Request, res: Response) => {
  const state = generateRandomString(16);
  const scope =
    "user-read-private user-read-email playlist-read-private playlist-read-collaborative playlist-modify-public playlist-modify-private user-library-read user-library-modify";

  const queryParams = new URLSearchParams({
    response_type: "code",
    client_id: CLIENT_ID!,
    scope,
    redirect_uri: REDIRECT_URI,
    state,
  });

  res.cookie("spotify_auth_state", state, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    maxAge: 10 * 60 * 1000, // 10 minutes
  });

  res.redirect(
    `https://accounts.spotify.com/authorize?${queryParams.toString()}`
  );
});

router.get("/callback", async (req: Request, res: Response) => {
  const { code, state } = req.query;
  const storedState = req.cookies?.spotify_auth_state;

  if (state === null || state !== storedState) {
    return res.redirect(`${CLIENT_URL}?error=state_mismatch`);
  }

  res.clearCookie("spotify_auth_state", { sameSite: "lax" });

  try {
    const response = await axios.post(
      "https://accounts.spotify.com/api/token",
      new URLSearchParams({
        code: code as string,
        redirect_uri: REDIRECT_URI,
        grant_type: "authorization_code",
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${Buffer.from(
            `${CLIENT_ID}:${CLIENT_SECRET}`
          ).toString("base64")}`,
        },
      }
    );

    const { access_token, refresh_token, expires_in } = response.data;

    // Fetch and persist user id once to avoid repeated /me calls in API routes.
    const meResponse = await axios.get("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    const spotifyUserId = (meResponse.data as { id?: string }).id;

    res.cookie("spotify_access_token", access_token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      maxAge: expires_in * 1000,
    });

    res.cookie("spotify_refresh_token", refresh_token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    if (spotifyUserId) {
      res.cookie("spotify_user_id", spotifyUserId, {
        httpOnly: true,
        secure: isProduction,
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      });
    }

    res.redirect(CLIENT_URL);
  } catch (error) {
    console.error("Error during token exchange:", error);
    res.redirect(`${CLIENT_URL}?error=invalid_token`);
  }
});

router.post("/refresh", async (req: Request, res: Response) => {
  const refresh_token = req.cookies?.spotify_refresh_token;

  if (!refresh_token) {
    return res.status(401).json({ error: "No refresh token provided" });
  }

  try {
    const response = await axios.post(
      "https://accounts.spotify.com/api/token",
      new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token,
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${Buffer.from(
            `${CLIENT_ID}:${CLIENT_SECRET}`
          ).toString("base64")}`,
        },
      }
    );

    const { access_token, expires_in } = response.data;

    res.cookie("spotify_access_token", access_token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      maxAge: expires_in * 1000,
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Error refreshing token:", error);
    res.status(401).json({ error: "Failed to refresh token" });
  }
});

router.post("/logout", (req: Request, res: Response) => {
  res.clearCookie("spotify_access_token", { sameSite: "lax" });
  res.clearCookie("spotify_refresh_token", { sameSite: "lax" });
  res.clearCookie("spotify_user_id", { sameSite: "lax" });
  res.json({ success: true });
});

router.get("/me", async (req: Request, res: Response) => {
  const access_token = req.cookies?.spotify_access_token;

  if (!access_token) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const response = await axios.get("https://api.spotify.com/v1/me", {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    res.json(response.data);
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(401).json({ error: "Failed to fetch user profile" });
  }
});

export { router as authRouter };
