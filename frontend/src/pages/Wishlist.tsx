import { Track, TrackOwnership } from "@smart-music-library/shared";
import { useQuery } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { useMemo, useState } from "react";
import { Empty } from "../components/Empty";
import { Error } from "../components/Error";
import { PageLoading } from "../components/Loading";
import { Page } from "../components/Page";
import { TrackList } from "../components/TrackList";
import { baseAPI } from "../services/api";

type GroupBy = "none" | "artist" | "album" | "playlist";

const LIKED_SONGS_PLAYLIST_ID = "liked-songs";
const UNSORTED_GROUP_KEY = "__unsorted__";

interface TrackGroup {
  key: string;
  name: string;
  tracks: Track[];
}

export function Wishlist() {
  const [groupBy, setGroupBy] = useState<GroupBy>("none");

  const {
    data: tracks,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["tracks"],
    queryFn: async () => {
      const response = await baseAPI.getTracks();
      return response.data;
    },
  });

  const wishlistTracks = useMemo(
    () =>
      (tracks ?? []).filter(
        (track) => track.ownership === TrackOwnership.WISHLIST,
      ),
    [tracks],
  );

  const wishlistTrackIds = useMemo(
    () => wishlistTracks.map((track) => track.id),
    [wishlistTracks],
  );

  const { data: playlists } = useQuery({
    queryKey: ["playlists"],
    queryFn: async () => {
      const response = await baseAPI.getPlaylists();
      return response.data;
    },
    enabled: groupBy === "playlist",
  });

  const { data: playlistMemberships } = useQuery({
    queryKey: ["track-playlist-memberships", wishlistTrackIds],
    queryFn: async () => {
      const response =
        await baseAPI.getTrackPlaylistMemberships(wishlistTrackIds);
      return response.data;
    },
    enabled: groupBy === "playlist" && wishlistTrackIds.length > 0,
  });

  const groups: TrackGroup[] | null = useMemo(() => {
    if (groupBy === "none") return null;

    const groupMap = new Map<string, TrackGroup>();

    if (groupBy === "artist") {
      wishlistTracks.forEach((track) => {
        const key = track.artistIds[0] ?? "unknown";
        const name = track.artistNames[0] ?? "Unknown Artist";
        const group = groupMap.get(key) ?? { key, name, tracks: [] };
        group.tracks.push(track);
        groupMap.set(key, group);
      });
    } else if (groupBy === "album") {
      wishlistTracks.forEach((track) => {
        const key = track.album?.id ?? "unknown";
        const name = track.album?.name ?? "Unknown Album";
        const group = groupMap.get(key) ?? { key, name, tracks: [] };
        group.tracks.push(track);
        groupMap.set(key, group);
      });
    } else if (groupBy === "playlist") {
      wishlistTracks.forEach((track) => {
        const playlistIds = playlistMemberships?.[track.id] ?? [];

        if (playlistIds.length === 0) {
          const group = groupMap.get(UNSORTED_GROUP_KEY) ?? {
            key: UNSORTED_GROUP_KEY,
            name: "Unsorted",
            tracks: [],
          };
          group.tracks.push(track);
          groupMap.set(UNSORTED_GROUP_KEY, group);
          return;
        }

        playlistIds.forEach((playlistId) => {
          const name =
            playlistId === LIKED_SONGS_PLAYLIST_ID
              ? "Liked Songs"
              : (playlists?.find((playlist) => playlist.id === playlistId)
                  ?.name ?? "Unknown Playlist");
          const group = groupMap.get(playlistId) ?? {
            key: playlistId,
            name,
            tracks: [],
          };
          group.tracks.push(track);
          groupMap.set(playlistId, group);
        });
      });
    }

    return Array.from(groupMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [groupBy, wishlistTracks, playlists, playlistMemberships]);

  if (isLoading) {
    return <PageLoading />;
  }

  if (error) {
    return <Error>Failed to load tracks. Please try again.</Error>;
  }

  return (
    <Page>
      <Page.Header
        title="Wishlist"
        subtitle={
          <span className="flex gap-2 items-center">
            <Star size={16} />
            {wishlistTracks.length} track
            {wishlistTracks.length !== 1 ? "s" : ""}
          </span>
        }
      />

      <div className="flex items-center gap-2 mb-3">
        <span className="text-base-content/50 text-xs font-medium uppercase tracking-wider">
          Group by:
        </span>
        <select
          value={groupBy}
          onChange={(e) => setGroupBy(e.target.value as GroupBy)}
          className="select select-sm bg-base-300 cursor-pointer"
          style={{ boxShadow: "none" }}
        >
          <option value="none">None</option>
          <option value="artist">Artist</option>
          <option value="album">Album</option>
          <option value="playlist">Playlist</option>
        </select>
      </div>

      {wishlistTracks.length === 0 ? (
        <Empty Icon={Star}>No wishlist tracks yet</Empty>
      ) : groups === null ? (
        <TrackList tracks={wishlistTracks} />
      ) : (
        <div className="flex flex-col gap-8">
          {groups.map((group) => (
            <div key={group.key}>
              <h2 className="text-lg font-semibold text-base-content mb-3">
                {group.name}
                <span className="text-base-content/50 font-normal text-sm ml-2">
                  {group.tracks.length} track
                  {group.tracks.length !== 1 ? "s" : ""}
                </span>
              </h2>
              <TrackList tracks={group.tracks} />
            </div>
          ))}
        </div>
      )}
    </Page>
  );
}
