/* eslint-disable @typescript-eslint/no-explicit-any */
import { Job } from "bullmq";
import { RedisService } from "../services/RedisService.js";
import { SpotifyService } from "../services/SpotifyService.js";
import { SpotifyTrack } from "../types/index.js";

enum JobProgressPercentage {
  // eslint-disable-next-line no-unused-vars
  START = 0,
  // eslint-disable-next-line no-unused-vars
  USER_INFO_STORED = 5,
  // eslint-disable-next-line no-unused-vars
  PLAYLISTS_STORED = 25,
  // eslint-disable-next-line no-unused-vars
  TRACKS_STORED = 65,
  // eslint-disable-next-line no-unused-vars
  ARTISTS_STORED = 80,
  // eslint-disable-next-line no-unused-vars
  COMPLETED = 100,
}

export interface PersistJobData {
  userId: string;
  accessToken: string;
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
      ((currentStep + 1) / totalSteps) * (endPercent - startPercent)
  );
}

export async function persistUserDataJob(
  job: Job<PersistJobData>
): Promise<void> {
  const { userId, accessToken } = job.data;

  try {
    const spotifyService = new SpotifyService(accessToken);
    const redisService = new RedisService();

    // Start job
    await job.updateProgress(JobProgressPercentage.START);

    // Store user info
    const user = await spotifyService.getCurrentUser();
    await redisService.storeUser(user);
    await job.updateProgress(JobProgressPercentage.USER_INFO_STORED);

    // Store playlists
    const playlists = await spotifyService.getUserOwnedPlaylists();
    await redisService.storePlaylists(userId, playlists);
    await job.updateProgress(JobProgressPercentage.PLAYLISTS_STORED);

    // Store tracks
    const tracks: SpotifyTrack[] = [];
    const artistIdsSet: Set<string> = new Set();

    for (let i = 0; i < playlists.length; i++) {
      const playlist = playlists[i];

      const playlistTracks = await spotifyService.getPlaylistTracks(
        playlist.id
      );

      const validTracks = playlistTracks.filter(
        (item) => item.track && !item.track.is_local
      );

      if (validTracks.length > 0) {
        await redisService.storeTracks(userId, playlist.id, validTracks);
        tracks.push(...validTracks.map((item) => item.track!));

        validTracks.forEach((item) => {
          item.track?.artists.forEach((artist) => {
            artistIdsSet.add(artist.id);
          });
        });
      }

      const progress = calculateProgress({
        currentStep: i,
        totalSteps: playlists.length,
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
      const artists = await spotifyService.getArtists(batch);

      await redisService.storeArtists(userId, artists);

      const progress = calculateProgress({
        currentStep: i,
        totalSteps: artistIds.length,
        startPercent: JobProgressPercentage.TRACKS_STORED,
        endPercent: JobProgressPercentage.ARTISTS_STORED,
      });

      await job.updateProgress(progress);
    }

    await job.updateProgress(JobProgressPercentage.COMPLETED);

    console.log(
      `Data persistence completed for user ${userId}: ${
        playlists.length
      } playlists, ${tracks.length} tracks, ${0} artists`
    );
  } catch (error: any) {
    console.error("Error in persist job:", error);
    throw new Error(`Persist job failed: ${error.message}`);
  }
}
