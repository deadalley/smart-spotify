/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  convertFromSpotifyTrack,
  Playlist,
  Track,
  TrackOwnership,
} from "@smart-spotify/shared";
import { Job } from "bullmq";
import { RedisService, SpotifyService, YouTubeService } from "../services";
import type { MusicSource } from "../services/RedisService";
import {
  convertYouTubeThumbnails,
  YOUTUBE_MUSIC_CATEGORY_ID,
} from "../services/YouTubeService";

// YouTube's API has no concept of "YouTube Music" playlists distinct from
// regular YouTube ones — they're the same underlying objects. Approximate
// it by requiring a majority of a playlist's videos to be tagged with the
// "Music" video category; playlists that are mostly non-music (vlogs,
// gaming, tutorials, etc.) are skipped. Not perfect — video category is
// set by the uploader and is sometimes wrong — but it's the best signal
// the official Data API exposes.
const MIN_MUSIC_RATIO = 0.5;

enum JobProgressPercentage {
  START = 0,
  USER_INFO_STORED = 5,
  PLAYLISTS_STORED = 25,
  TRACKS_STORED = 65,
  ARTISTS_STORED = 80,
  COMPLETED = 100,
}

export interface PersistJobData {
  userId: string;
  accessToken: string;
  source: MusicSource;
  refreshToken?: string;
}

export function getPersistJobStatusMessage(progress: number): string {
  if (progress === JobProgressPercentage.START) {
    return "Job started...";
  } else if (progress < JobProgressPercentage.PLAYLISTS_STORED) {
    return "Storing user info...";
  } else if (progress < JobProgressPercentage.TRACKS_STORED) {
    return "Storing playlists...";
  } else if (progress < JobProgressPercentage.ARTISTS_STORED) {
    return "Storing tracks...";
  } else if (progress < JobProgressPercentage.COMPLETED) {
    return "Storing artists...";
  } else if (progress === JobProgressPercentage.COMPLETED) {
    return "Data persistence completed.";
  } else {
    return "Unknown progress state.";
  }
}

function calculateProgress({
  currentStep,
  totalSteps,
  startPercent,
  endPercent,
}: {
  currentStep: number;
  totalSteps: number;
  startPercent: number;
  endPercent: number;
}): number {
  return Math.round(
    startPercent +
      ((currentStep + 1) / totalSteps) * (endPercent - startPercent),
  );
}

async function syncSpotify(
  accessToken: string,
  refreshToken: string | undefined,
  userId: string,
  job: Job<PersistJobData>,
): Promise<void> {
  const spotifyService = new SpotifyService(accessToken);
  const redisService = new RedisService("spotify");

  const refreshAccessToken = async () => {
    if (!refreshToken) return;
    const { accessToken: newToken } =
      await spotifyService.refreshAccessToken(refreshToken);
    spotifyService.setAccessToken(newToken);
  };

  const withAutoRefresh = async <T>(fn: () => Promise<T>): Promise<T> => {
    try {
      return await fn();
    } catch (error: any) {
      if (error?.response?.status === 401 && refreshToken) {
        await refreshAccessToken();
        return await fn();
      }
      throw error;
    }
  };

  // Delete old data (Spotify namespace only)
  await redisService.deleteUserData(userId);

  // Store user info
  await refreshAccessToken();
  const user = await withAutoRefresh(() => spotifyService.getCurrentUser());
  await redisService.storeUser(user);
  await job.updateProgress(JobProgressPercentage.USER_INFO_STORED);

  // Store playlists
  const playlists = await withAutoRefresh(() =>
    spotifyService.getUserOwnedPlaylists(),
  );
  await redisService.storePlaylists(userId, playlists);

  // Get saved tracks to store as a special playlist
  const savedTracksData = await withAutoRefresh(() =>
    spotifyService.getUserSavedTracks(),
  );
  const savedTracks = savedTracksData
    .filter((item) => item.track && !item.track.is_local)
    .map((item) => item.track);

  if (savedTracks.length > 0) {
    // Create a virtual "Liked Songs" playlist
    const likedSongsPlaylist = {
      id: "liked-songs",
      name: "Liked Songs",
      description: "Your liked songs from Spotify",
      owner: { id: userId },
      public: false,
      collaborative: false,
      tracks: { total: savedTracks.length },
      images: [
        {
          url: "https://misc.scdn.co/liked-songs/liked-songs-64.png",
          height: 64,
          width: 64,
        },
      ],
      external_urls: { spotify: "" },
      snapshot_id: "",
    };

    // Store the virtual playlist
    await redisService.storePlaylists(userId, [likedSongsPlaylist]);
    // Store the saved tracks under this virtual playlist
    await redisService.storeTracks(userId, "liked-songs", savedTracks);
  }

  await job.updateProgress(JobProgressPercentage.PLAYLISTS_STORED);

  // Store tracks
  const tracks: Track[] = [];
  const artistIdsSet: Set<string> = new Set();

  // Process regular playlists
  for (let i = 0; i < playlists.length; i++) {
    const playlist = playlists[i];

    const playlistTracks = await withAutoRefresh(() =>
      spotifyService.getPlaylistTracks(playlist.id),
    );

    const validTracks = playlistTracks
      .filter((item) => item.track && !item.track.is_local)
      .map((item) => item.track);

    if (validTracks.length > 0) {
      await redisService.storeTracks(userId, playlist.id, validTracks);

      validTracks.forEach((track) => {
        tracks.push(convertFromSpotifyTrack(track));
        track.artists.forEach((artist) => {
          artistIdsSet.add(artist.id);
        });
      });
    }

    const progress = calculateProgress({
      currentStep: i,
      totalSteps: playlists.length + (savedTracks.length > 0 ? 1 : 0),
      startPercent: JobProgressPercentage.PLAYLISTS_STORED,
      endPercent: JobProgressPercentage.TRACKS_STORED,
    });
    await job.updateProgress(progress);
  }

  // Process saved tracks (already stored above, just add to tracking)
  if (savedTracks.length > 0) {
    savedTracks.forEach((track) => {
      tracks.push(convertFromSpotifyTrack(track));
      track.artists.forEach((artist) => {
        artistIdsSet.add(artist.id);
      });
    });

    const progress = calculateProgress({
      currentStep: playlists.length,
      totalSteps: playlists.length + 1,
      startPercent: JobProgressPercentage.PLAYLISTS_STORED,
      endPercent: JobProgressPercentage.TRACKS_STORED,
    });
    await job.updateProgress(progress);
  }

  // Store artists
  const artistIds = Array.from(artistIdsSet);
  const batchSize = 50;

  for (let i = 0; i < artistIds.length; i += batchSize) {
    const batch = artistIds.slice(i, i + batchSize);
    const artists = await withAutoRefresh(() =>
      spotifyService.getArtists(batch),
    );

    await redisService.storeArtists(userId, artists);

    const progress = calculateProgress({
      currentStep: i,
      totalSteps: artistIds.length,
      startPercent: JobProgressPercentage.TRACKS_STORED,
      endPercent: JobProgressPercentage.ARTISTS_STORED,
    });

    await job.updateProgress(progress);
  }

  await redisService.setSyncMeta({
    userId,
    lastSync: new Date().toISOString(),
    playlistCount: playlists.length + (savedTracks.length > 0 ? 1 : 0),
    trackCount: tracks.length,
    artistCount: artistIds.length,
  });

  await job.updateProgress(JobProgressPercentage.COMPLETED);

  console.log(
    `Spotify persistence completed for user ${userId}: ${
      playlists.length + (savedTracks.length > 0 ? 1 : 0)
    } playlists (including ${savedTracks.length} saved tracks), ${
      tracks.length
    } tracks, ${artistIds.length} artists`,
  );
}

async function syncYoutube(
  accessToken: string,
  refreshToken: string | undefined,
  userId: string,
  job: Job<PersistJobData>,
) {
  const redisService = new RedisService("yt-music");
  await redisService.deleteUserData(userId);

  let yt = new YouTubeService({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  const refreshAccessToken = async () => {
    if (!refreshToken) return;
    const tokens = await yt.refreshAccessToken();
    if (tokens.access_token) {
      yt = new YouTubeService({
        access_token: tokens.access_token,
        refresh_token: refreshToken,
        expiry_date: tokens.expiry_date ?? undefined,
      });
    }
  };

  const withAutoRefresh = async <T>(fn: () => Promise<T>): Promise<T> => {
    try {
      return await fn();
    } catch (error: any) {
      if (error?.response?.status === 401 && refreshToken) {
        await refreshAccessToken();
        return await fn();
      }
      throw error;
    }
  };

  const youtubePlaylists = await withAutoRefresh(() => yt.listMyPlaylists());

  const uniqueArtists = new Map<string, { id: string; name: string }>();
  const musicPlaylistsDomain: Playlist[] = [];
  let totalTracksStored = 0;

  for (let i = 0; i < youtubePlaylists.length; i++) {
    const p = youtubePlaylists[i];
    const ids = await withAutoRefresh(() => yt.listPlaylistVideoIds(p.id));
    const videos = await withAutoRefresh(() => yt.getVideosByIds(ids));

    const musicRatio =
      videos.length === 0
        ? 1
        : videos.filter((v) => v.categoryId === YOUTUBE_MUSIC_CATEGORY_ID)
            .length / videos.length;

    if (musicRatio >= MIN_MUSIC_RATIO) {
      musicPlaylistsDomain.push({
        id: p.id,
        name: p.title,
        description: p.description,
        ownerId: userId,
        public: false,
        collaborative: false,
        trackCount: p.itemCount,
        images: convertYouTubeThumbnails(p.thumbnails),
        externalUrls: {
          spotify: `https://www.youtube.com/playlist?list=${p.id}`,
        },
        snapshotId: "",
      });

      const tracks: Track[] = videos.map((v) => {
        const artistName = v.channelTitle.replace(/ - Topic$/, "");
        uniqueArtists.set(v.channelId, {
          id: v.channelId,
          name: artistName,
        });
        return {
          id: v.id,
          name: v.title,
          uri: `youtube:video:${v.id}`,
          durationMs: v.durationMs,
          explicit: false,
          popularity: v.viewCount ?? 0,
          previewUrl: null,
          trackNumber: 0,
          discNumber: 0,
          externalUrls: {
            spotify: `https://www.youtube.com/watch?v=${v.id}`,
          },
          artistIds: [v.channelId],
          artistNames: [artistName],
          album: {
            // Unique per video, not per channel: each YouTube video has its
            // own thumbnail, and this "album" only exists to carry that
            // thumbnail. Reusing the channel id here would collide across
            // every track from the same artist, and the storage layer's
            // "write album once per id" dedupe (see RedisService.storeTracksDomain)
            // would then keep only the first video's thumbnail, showing it
            // on every other track from that channel.
            id: `${v.channelId}:${v.id}`,
            name: artistName,
            type: "youtube",
            releaseDate: v.publishedAt?.slice(0, 10),
            images: convertYouTubeThumbnails(v.thumbnails),
            externalUrls: {
              spotify: `https://www.youtube.com/channel/${v.channelId}`,
            },
          },
          ownership: TrackOwnership.NOT_OWNED,
        };
      });

      await redisService.storeTracksDomain(userId, p.id, tracks);
      totalTracksStored += tracks.length;
    }

    const progress = calculateProgress({
      currentStep: i,
      totalSteps: youtubePlaylists.length + 1,
      startPercent: JobProgressPercentage.PLAYLISTS_STORED,
      endPercent: JobProgressPercentage.TRACKS_STORED,
    });
    await job.updateProgress(progress);
  }

  await redisService.storePlaylistsDomain(userId, musicPlaylistsDomain);

  // Store artists (channel ids). Genres are unknown for YouTube, store empty.
  const artistIds = Array.from(uniqueArtists.keys());
  const channels = await withAutoRefresh(() => yt.getChannelsByIds(artistIds));
  const channelThumbnails = new Map(
    channels.map((c) => [c.id, c.thumbnails] as const),
  );

  const artistsDomain = Array.from(uniqueArtists.values()).map((a) => ({
    id: a.id,
    name: a.name,
    images: convertYouTubeThumbnails(channelThumbnails.get(a.id)),
    externalUrls: { spotify: `https://www.youtube.com/channel/${a.id}` },
    trackCount: 0,
    genres: [],
  }));

  await redisService.storeArtistsDomain(userId, artistsDomain);
  await job.updateProgress(JobProgressPercentage.ARTISTS_STORED);

  await redisService.setSyncMeta({
    userId,
    lastSync: new Date().toISOString(),
    playlistCount: musicPlaylistsDomain.length,
    trackCount: totalTracksStored,
    artistCount: artistsDomain.length,
  });

  await job.updateProgress(JobProgressPercentage.COMPLETED);
  console.log(
    `YouTube persistence completed for user ${userId}: ${musicPlaylistsDomain.length} playlists, ${totalTracksStored} tracks, ${artistsDomain.length} artists`,
  );
}

export async function persistUserDataJob(
  job: Job<PersistJobData>,
): Promise<void> {
  const { userId, accessToken, refreshToken, source } = job.data;

  try {
    // Start job
    await job.updateProgress(JobProgressPercentage.START);

    if (source === "spotify") {
      return await syncSpotify(accessToken, refreshToken, userId, job);
    }

    if (source === "yt-music") {
      return await syncYoutube(accessToken, refreshToken, userId, job);
    }

    throw new Error(`Unsupported music source: ${source}`);
  } catch (error: any) {
    console.error("Error in persist job:", error);
    throw new Error(`Persist job failed: ${error.message}`);
  }
}
