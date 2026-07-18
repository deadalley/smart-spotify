import { useQuery } from "@tanstack/react-query";
import { baseAPI } from "../services/api";
import { useDebouncedValue } from "./useDebouncedValue";

const MIN_QUERY_LENGTH = 2;

export function useLibrarySearch(query: string, isOpen: boolean) {
  const debouncedQuery = useDebouncedValue(query, 300).trim();
  const hasMinQuery = debouncedQuery.length >= MIN_QUERY_LENGTH;

  const { data, isLoading, isError } = useQuery({
    queryKey: ["search", debouncedQuery],
    queryFn: async () => (await baseAPI.search(debouncedQuery)).data,
    enabled: isOpen && hasMinQuery,
    staleTime: 30_000,
  });

  const hasAnyMatches = !!data && (
    data.tracks.totalCount +
      data.albums.totalCount +
      data.artists.totalCount +
      data.playlists.totalCount >
    0
  );

  return { data, isLoading, isError, hasMinQuery, hasAnyMatches };
}
