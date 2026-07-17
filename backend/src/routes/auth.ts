import axios from "axios";
import crypto from "crypto";
import dotenv from "dotenv";
import { Request, Response, Router } from "express";
import { YouTubeService } from "../services/YouTubeService";
import { AuthService } from "../services";

dotenv.config();

const router: Router = Router();

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const SPOTIFY_REDIRECT_URI =
  process.env.SPOTIFY_REDIRECT_URI ||
  "http://127.0.0.1:3001/api/auth/spotify/callback";

const YOUTUBE_CLIENT_ID = process.env.YOUTUBE_CLIENT_ID;
const YOUTUBE_CLIENT_SECRET = process.env.YOUTUBE_CLIENT_SECRET;

const CLIENT_URL = process.env.CLIENT_URL || "http://127.0.0.1:5173";

const isProduction = process.env.NODE_ENV === "production";

const generateRandomString = (bytes: number): string =>
  crypto.randomBytes(bytes).toString("hex");

/**
 * SPOTIFY AUTH ROUTES
 */
router.get("/spotify/login", (req: Request, res: Response) => {
  const state = generateRandomString(16);
  const scope =
    "user-read-private user-read-email playlist-read-private playlist-read-collaborative playlist-modify-public playlist-modify-private user-library-read user-library-modify";

  const queryParams = new URLSearchParams({
    response_type: "code",
    client_id: SPOTIFY_CLIENT_ID!,
    scope,
    redirect_uri: SPOTIFY_REDIRECT_URI,
    state,
  });

  res.cookie("spotify_auth_state", state, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    maxAge: 10 * 60 * 1000, // 10 minutes
  });

  res.redirect(
    `https://accounts.spotify.com/authorize?${queryParams.toString()}`,
  );
});

router.get("/spotify/callback", async (req: Request, res: Response) => {
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
        redirect_uri: SPOTIFY_REDIRECT_URI,
        grant_type: "authorization_code",
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${Buffer.from(
            `${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`,
          ).toString("base64")}`,
        },
      },
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

router.post("/spotify/refresh", async (req: Request, res: Response) => {
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
            `${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`,
          ).toString("base64")}`,
        },
      },
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

router.post("/spotify/logout", (req: Request, res: Response) => {
  res.clearCookie("spotify_access_token", { sameSite: "lax" });
  res.clearCookie("spotify_refresh_token", { sameSite: "lax" });
  res.clearCookie("spotify_user_id", { sameSite: "lax" });
  res.json({ success: true });
});

router.get("/spotify/me", async (req: Request, res: Response) => {
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

/**
 * YOUTUBE AUTH ROUTES
 */
router.get("/youtube/login", (req: Request, res: Response) => {
  if (!YOUTUBE_CLIENT_ID || !YOUTUBE_CLIENT_SECRET) {
    return res.redirect(`${CLIENT_URL}?error=youtube_not_configured`);
  }

  const state = generateRandomString(16);
  res.cookie("youtube_auth_state", state, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: 10 * 60 * 1000, // 10 minutes
  });

  const url = YouTubeService.createAuthUrl(state);
  return res.redirect(url);
});

router.get("/youtube/callback", async (req: Request, res: Response) => {
  const { code, state } = req.query;
  const storedState = req.cookies?.youtube_auth_state;

  if (!code || typeof code !== "string") {
    return res.redirect(`${CLIENT_URL}?error=youtube_missing_code`);
  }
  if (!state || typeof state !== "string" || state !== storedState) {
    return res.redirect(`${CLIENT_URL}?error=youtube_state_mismatch`);
  }

  res.clearCookie("youtube_auth_state", { sameSite: "lax", path: "/" });

  try {
    const authService = new AuthService();
    const yt = new YouTubeService();
    const tokens = await yt.exchangeCode(code);

    if (!tokens.access_token) {
      return res.redirect(`${CLIENT_URL}?error=youtube_invalid_token`);
    }

    // Fetch and persist a stable user id (channel id) for caching.
    const ytMe = new YouTubeService({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token ?? undefined,
      expiry_date: tokens.expiry_date ?? undefined,
    });

    const grantedScopes = await ytMe.getGrantedScopes();
    const hasYouTubeScope =
      grantedScopes.includes(
        "https://www.googleapis.com/auth/youtube.readonly",
      ) ||
      grantedScopes.includes(
        "https://www.googleapis.com/auth/youtube.force-ssl",
      );
    if (!hasYouTubeScope) {
      console.error("YouTube OAuth missing required scopes:", grantedScopes);
      return res.redirect(`${CLIENT_URL}?error=youtube_missing_scopes`);
    }

    const channel = await ytMe.getMyChannel();

    res.cookie("youtube_access_token", tokens.access_token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 1000, // 1 hour (refreshed via /auth/youtube/refresh)
    });

    if (tokens.refresh_token) {
      res.cookie("youtube_refresh_token", tokens.refresh_token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: "lax",
        path: "/",
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      });
    }

    res.cookie("youtube_user_id", channel.id, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    const userId = await authService.createUser(channel.id);

    authService.storeYouTubeToken(userId, {
      userId: channel.id,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? undefined,
    });

    res.cookie("user_id", userId, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    res.redirect(CLIENT_URL);
  } catch (error) {
    console.error("Error during YouTube token exchange:", error);
    res.redirect(`${CLIENT_URL}?error=youtube_invalid_token`);
  }
});

router.post("/youtube/refresh", async (req: Request, res: Response) => {
  const refresh_token = req.cookies?.youtube_refresh_token as
    | string
    | undefined;
  if (!refresh_token) {
    return res.status(401).json({ error: "No refresh token provided" });
  }

  try {
    const yt = new YouTubeService({ refresh_token });
    const tokens = await yt.refreshAccessToken();

    if (!tokens.access_token) {
      return res.status(401).json({ error: "Failed to refresh token" });
    }

    res.cookie("youtube_access_token", tokens.access_token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 1000,
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Error refreshing YouTube token:", error);
    res.status(401).json({ error: "Failed to refresh token" });
  }
});

router.post("/youtube/logout", (_req: Request, res: Response) => {
  res.clearCookie("youtube_access_token", { sameSite: "lax" });
  res.clearCookie("youtube_refresh_token", { sameSite: "lax" });
  res.clearCookie("youtube_user_id", { sameSite: "lax" });
  res.json({ success: true });
});

router.get("/youtube/me", async (req: Request, res: Response) => {
  const access_token = req.cookies?.youtube_access_token as string | undefined;
  if (!access_token) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const yt = new YouTubeService({ access_token });
    const channel = await yt.getMyChannel();
    // Return a SpotifyUser-shaped payload so the existing frontend AuthContext works.
    return res.json({ id: channel.id, display_name: channel.title });
  } catch (error) {
    console.error("Error fetching YouTube profile:", error);
    return res.status(401).json({ error: "Failed to fetch user profile" });
  }
});

/**
 * AUTH ROUTES
 */
router.get("/me", async (req: Request, res: Response) => {
  try {
    const ytAccessToken = req.cookies?.youtube_access_token as
      | string
      | undefined;
    if (!ytAccessToken) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    const userId = req.cookies?.user_id as string | undefined;
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const authService = new AuthService();
    const userResponse = await authService.getUser(userId);

    if (!userResponse) {
      return res.status(404).json({ error: "User not found" });
    }

    if (
      !userResponse.spotify?.accessToken &&
      !userResponse.ytMusic?.accessToken
    ) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    res.json(userResponse);
  } catch (error) {
    console.error("Error fetching user data:", error);
    res.status(500).json({ error: "Failed to fetch user data" });
  }
});

export { router as authRouter };
