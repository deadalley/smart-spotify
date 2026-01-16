/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextFunction, Request, Response } from "express";
import { SpotifyService } from "../services";

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const access_token = req.cookies?.spotify_access_token as string | undefined;

  if (!access_token) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  (req as any).accessToken = access_token;

  // Reduce duplicate network calls: most routes only need the Spotify user id.
  // We persist it in a cookie during login, and only fall back to /me if missing.
  const existingUserId = req.cookies?.spotify_user_id as string | undefined;
  if (existingUserId) {
    (req as any).userId = existingUserId;
    return next();
  }

  try {
    const spotifyService = new SpotifyService(access_token);
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
    // If /me fails, token is likely invalid/expired.
    return res.status(401).json({ error: "Token expired" });
  }
}
