/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextFunction, Request, Response } from "express";
import { SpotifyService, YouTubeService } from "../services";
import type { MusicSource } from "../services/RedisService";

const isProduction = process.env.NODE_ENV === "production";

/**
 * Exchanges the youtube_refresh_token cookie for a fresh access token and
 * writes it back as a cookie. The access token cookie is short-lived (1h),
 * so this lets a session survive past that without forcing a full re-login.
 * Returns the new access token, or null if there's no valid refresh token.
 */
export async function refreshYouTubeAccessToken(
  req: Request,
  res: Response,
): Promise<string | null> {
  const refreshToken = req.cookies?.youtube_refresh_token as
    | string
    | undefined;
  if (!refreshToken) return null;

  try {
    const yt = new YouTubeService({ refresh_token: refreshToken });
    const tokens = await yt.refreshAccessToken();
    if (!tokens.access_token) return null;

    res.cookie("youtube_access_token", tokens.access_token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 1000, // 1 hour
    });

    return tokens.access_token;
  } catch (error) {
    console.error("Error refreshing YouTube access token:", error);
    return null;
  }
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const spotifyAccess = req.cookies?.spotify_access_token as string | undefined;
  let youtubeAccess = req.cookies?.youtube_access_token as string | undefined;

  if (!spotifyAccess && !youtubeAccess) {
    youtubeAccess = (await refreshYouTubeAccessToken(req, res)) ?? undefined;
  }

  const source: MusicSource | null = spotifyAccess
    ? "spotify"
    : youtubeAccess
      ? "yt-music"
      : null;

  if (!source) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  (req as any).source = source;

  if (source === "spotify") {
    (req as any).accessToken = spotifyAccess;

    const existingUserId = req.cookies?.spotify_user_id as string | undefined;
    if (existingUserId) {
      (req as any).userId = existingUserId;
      return next();
    }

    try {
      const spotifyService = new SpotifyService(spotifyAccess!);
      const me = await spotifyService.getCurrentUser();
      if (me?.id) {
        (req as any).userId = me.id;
        res.cookie("spotify_user_id", me.id, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        });
      }
      return next();
    } catch {
      return res.status(401).json({ error: "Token expired" });
    }
  }

  // yt-music
  (req as any).accessToken = youtubeAccess;

  const existingYouTubeUserId = req.cookies?.youtube_user_id as
    | string
    | undefined;
  if (existingYouTubeUserId) {
    (req as any).userId = existingYouTubeUserId;
    return next();
  }

  try {
    const yt = new YouTubeService({ access_token: youtubeAccess! });
    const me = await yt.getMyChannel();
    (req as any).userId = me.id;
    res.cookie("youtube_user_id", me.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });
    return next();
  } catch {
    return res.status(401).json({ error: "Token expired" });
  }
}
