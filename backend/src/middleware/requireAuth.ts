/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextFunction, Request, Response } from "express";
import { SpotifyService, YouTubeService } from "../services";
import type { MusicSource } from "../services/RedisService";

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const spotifyAccess = req.cookies?.spotify_access_token as string | undefined;
  const youtubeAccess = req.cookies?.youtube_access_token as string | undefined;

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
