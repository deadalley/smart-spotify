/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from "express";

export function requireAuth(req: Request, res: Response, next: any) {
  const access_token = req.cookies?.spotify_access_token;

  if (!access_token) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  (req as any).accessToken = access_token;
  next();
}
