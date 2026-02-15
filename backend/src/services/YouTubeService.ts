import { google, youtube_v3 } from "googleapis";

type TokenData = {
  access_token?: string | null;
  refresh_token?: string | null;
  expiry_date?: number | null;
};

function parseISODurationToMs(iso: string | undefined | null): number {
  if (!iso) return 0;
  // Examples: PT3M12S, PT1H2M, PT45S
  const match =
    /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso.trim()) ?? undefined;
  if (!match) return 0;
  const hours = Number(match[1] ?? 0);
  const minutes = Number(match[2] ?? 0);
  const seconds = Number(match[3] ?? 0);
  return ((hours * 60 + minutes) * 60 + seconds) * 1000;
}

export class YouTubeService {
  private oauth2Client: InstanceType<typeof google.auth.OAuth2>;
  private youtube: youtube_v3.Youtube;

  constructor(tokens?: TokenData) {
    const clientId = process.env.YOUTUBE_CLIENT_ID;
    const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
    const redirectUri =
      process.env.YOUTUBE_REDIRECT_URI ||
      "http://127.0.0.1:3001/api/auth/youtube/callback";

    if (!clientId || !clientSecret) {
      throw new Error("Missing YOUTUBE_CLIENT_ID / YOUTUBE_CLIENT_SECRET");
    }

    this.oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

    if (tokens) {
      this.oauth2Client.setCredentials({
        access_token: tokens.access_token ?? undefined,
        refresh_token: tokens.refresh_token ?? undefined,
        expiry_date: tokens.expiry_date ?? undefined,
      });
    }

    this.youtube = google.youtube({ version: "v3", auth: this.oauth2Client });
  }

  static createAuthUrl(state: string): string {
    const clientId = process.env.YOUTUBE_CLIENT_ID;
    const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
    const redirectUri =
      process.env.YOUTUBE_REDIRECT_URI ||
      "http://127.0.0.1:3001/api/auth/youtube/callback";

    if (!clientId || !clientSecret) {
      throw new Error("Missing YOUTUBE_CLIENT_ID / YOUTUBE_CLIENT_SECRET");
    }

    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
    return oauth2Client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      include_granted_scopes: true,
      state,
      scope: [
        // Read playlists + playlist items.
        "https://www.googleapis.com/auth/youtube.readonly",
        // Some endpoints (e.g. channels.mine) are commonly used with this scope too.
        "https://www.googleapis.com/auth/youtube.force-ssl",
        // Basic identity (not strictly required, but useful).
        "openid",
        "email",
        "profile",
      ],
    });
  }

  async getGrantedScopes(): Promise<string[]> {
    const accessToken = this.oauth2Client.credentials.access_token;
    if (!accessToken) return [];
    const info = await this.oauth2Client.getTokenInfo(accessToken);
    const scopes =
      (info as unknown as { scopes?: string[] }).scopes ??
      (typeof (info as unknown as { scope?: string }).scope === "string"
        ? (info as unknown as { scope: string }).scope.split(" ")
        : []);
    return scopes.filter(Boolean);
  }

  async exchangeCode(code: string): Promise<TokenData> {
    const { tokens } = await this.oauth2Client.getToken(code);
    return {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expiry_date,
    };
  }

  async refreshAccessToken(): Promise<TokenData> {
    const refresh = this.oauth2Client.credentials.refresh_token;
    if (!refresh) {
      throw new Error("No refresh token available");
    }
    const { credentials } = await this.oauth2Client.refreshAccessToken();
    return {
      access_token: credentials.access_token,
      refresh_token: credentials.refresh_token,
      expiry_date: credentials.expiry_date,
    };
  }

  async getMyChannel(): Promise<{
    id: string;
    title: string;
    thumbnails: youtube_v3.Schema$ThumbnailDetails | null;
    likesPlaylistId?: string;
  }> {
    const res = await this.youtube.channels.list({
      mine: true,
      part: ["snippet", "contentDetails"],
      maxResults: 1,
    });

    const channel = res.data.items?.[0];
    const id = channel?.id;
    const title = channel?.snippet?.title;

    if (!id || !title) {
      throw new Error("Failed to fetch YouTube channel for authenticated user");
    }

    const likesPlaylistId = channel?.contentDetails?.relatedPlaylists?.likes;

    return {
      id,
      title,
      thumbnails: channel?.snippet?.thumbnails ?? null,
      likesPlaylistId: likesPlaylistId || undefined,
    };
  }

  async listMyPlaylists(): Promise<
    Array<{
      id: string;
      title: string;
      description: string;
      itemCount: number;
      thumbnails: youtube_v3.Schema$ThumbnailDetails | null;
    }>
  > {
    const out: Array<{
      id: string;
      title: string;
      description: string;
      itemCount: number;
      thumbnails: youtube_v3.Schema$ThumbnailDetails | null;
    }> = [];

    let pageToken: string | undefined;
    do {
      const res = await this.youtube.playlists.list({
        mine: true,
        part: ["snippet", "contentDetails"],
        maxResults: 50,
        pageToken,
      });

      const items = res.data.items ?? [];
      for (const p of items) {
        if (!p.id) continue;
        out.push({
          id: p.id,
          title: p.snippet?.title ?? "Untitled playlist",
          description: p.snippet?.description ?? "",
          itemCount: p.contentDetails?.itemCount ?? 0,
          thumbnails: p.snippet?.thumbnails ?? null,
        });
      }

      pageToken = res.data.nextPageToken ?? undefined;
    } while (pageToken);

    return out;
  }

  async listPlaylistVideoIds(playlistId: string): Promise<string[]> {
    const ids: string[] = [];
    let pageToken: string | undefined;
    do {
      const res = await this.youtube.playlistItems.list({
        playlistId,
        part: ["contentDetails"],
        maxResults: 50,
        pageToken,
      });

      const items = res.data.items ?? [];
      for (const it of items) {
        const vid = it.contentDetails?.videoId;
        if (vid) ids.push(vid);
      }

      pageToken = res.data.nextPageToken ?? undefined;
    } while (pageToken);

    return ids;
  }

  async getVideosByIds(ids: string[]): Promise<
    Array<{
      id: string;
      title: string;
      channelId: string;
      channelTitle: string;
      publishedAt?: string;
      durationMs: number;
      thumbnails: youtube_v3.Schema$ThumbnailDetails | null;
      viewCount?: number;
    }>
  > {
    if (ids.length === 0) return [];

    const chunks: string[][] = [];
    for (let i = 0; i < ids.length; i += 50) chunks.push(ids.slice(i, i + 50));

    const results: Array<{
      id: string;
      title: string;
      channelId: string;
      channelTitle: string;
      publishedAt?: string;
      durationMs: number;
      thumbnails: youtube_v3.Schema$ThumbnailDetails | null;
      viewCount?: number;
    }> = [];

    for (const chunk of chunks) {
      const res = await this.youtube.videos.list({
        id: chunk,
        part: ["snippet", "contentDetails", "statistics"],
        maxResults: 50,
      });

      for (const v of res.data.items ?? []) {
        const id = v.id;
        const title = v.snippet?.title;
        const channelId = v.snippet?.channelId;
        const channelTitle = v.snippet?.channelTitle;
        if (!id || !title || !channelId || !channelTitle) continue;

        results.push({
          id,
          title,
          channelId,
          channelTitle,
          publishedAt: v.snippet?.publishedAt ?? undefined,
          durationMs: parseISODurationToMs(v.contentDetails?.duration),
          thumbnails: v.snippet?.thumbnails ?? null,
          viewCount: v.statistics?.viewCount
            ? Number(v.statistics.viewCount)
            : undefined,
        });
      }
    }

    return results;
  }
}

