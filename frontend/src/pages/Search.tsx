import { useQuery } from "@tanstack/react-query";
import { Music, Search as SearchIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Loading } from "../components/Loading";
import { TrackList } from "../components/TrackList";
import { spotifyAPI } from "../services/api";
import { SpotifySearchResult, SpotifyTrack } from "../types/spotify";

export function Search() {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // Debounce search input
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const { data: searchResults, isLoading } = useQuery<SpotifySearchResult>({
    queryKey: ["search", debouncedQuery],
    queryFn: async () => {
      const response = await spotifyAPI.search(debouncedQuery);
      return response.data;
    },
    enabled: debouncedQuery.length > 0,
  });

  const tracks: SpotifyTrack[] = searchResults?.tracks?.items || [];

  return (
    <div className="container p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Search</h1>
      </div>

      {/* Search Input */}
      <label className="input w-full mb-8">
        <svg
          className="h-[1em] opacity-50"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
        >
          <SearchIcon size={20} />
        </svg>
        <input
          type="search"
          placeholder="Search for songs, artists, or albums..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </label>

      {/* Loading State */}
      {isLoading && debouncedQuery && <Loading />}

      {/* Search Results */}
      {!isLoading && debouncedQuery && tracks.length > 0 && (
        <TrackList tracks={tracks} />
      )}

      {/* No Results */}
      {!isLoading && debouncedQuery && tracks.length === 0 && (
        <div className="hero min-h-96">
          <div className="hero-content text-center">
            <div className="max-w-md">
              <Music size={64} className="mx-auto mb-4 text-base-content/40" />
              <h1 className="text-2xl font-bold text-base-content mb-4">
                No results found
              </h1>
              <p className="text-base-content/60">
                Try searching with different keywords.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!debouncedQuery && (
        <div className="hero min-h-96">
          <div className="hero-content text-center">
            <div className="max-w-md">
              <SearchIcon
                size={64}
                className="mx-auto mb-4 text-base-content"
              />
              <h1 className="text-2xl font-bold text-base-content mb-4">
                Start searching
              </h1>
              <p className="text-base-content/60">
                Enter a song, artist, or album name to find music.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
