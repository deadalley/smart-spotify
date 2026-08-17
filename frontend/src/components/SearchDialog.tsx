import { Disc3, Music, Search, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLibrarySearch } from "../hooks/useLibrarySearch";
import { TableSearch } from "./TableSearch";
import { Error } from "./Error";
import { SearchEmptyState } from "./search/SearchEmptyState";
import { SearchResultRow } from "./search/SearchResultRow";
import { SearchResultSection } from "./search/SearchResultSection";

const SEARCH_MODAL_ID = "searchModal";

function isMacPlatform() {
  if (typeof navigator === "undefined") return false;
  return /Mac|iPod|iPhone|iPad/.test(navigator.platform ?? navigator.userAgent);
}

export function SearchDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const { data, isLoading, isError, hasMinQuery, hasAnyMatches } =
    useLibrarySearch(query, isOpen);

  const handleClose = () => {
    (document.getElementById(SEARCH_MODAL_ID) as HTMLDialogElement)?.close();
  };

  const handleOpen = () => {
    setIsOpen(true);
    // @ts-expect-error daisyUI adds this
    document.getElementById(SEARCH_MODAL_ID)?.showModal();
    inputRef.current?.focus();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== "k") return;

      const dialog = document.getElementById(
        SEARCH_MODAL_ID
      ) as HTMLDialogElement | null;
      if (!dialog || dialog.open) return;

      e.preventDefault();
      setIsOpen(true);
      dialog.showModal();
      inputRef.current?.focus();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      <dialog
        id={SEARCH_MODAL_ID}
        className="modal"
        onClose={() => {
          setQuery("");
          setIsOpen(false);
        }}
      >
        <div className="modal-box">
          <div className="flex items-start justify-between gap-4 mb-4">
            <h3 className="text-lg font-bold">Search your library</h3>
            <button
              type="button"
              className="btn btn-ghost btn-sm btn-circle"
              onClick={handleClose}
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          <TableSearch
            ref={inputRef}
            value={query}
            onChange={setQuery}
            placeholder="Search tracks, albums, artists, playlists..."
            autoFocus
          />

          <div className="mt-4 max-h-[60vh] overflow-y-auto space-y-8 pr-1">
            {hasMinQuery && isLoading && (
              <div className="flex justify-center py-8">
                <span className="loading loading-spinner loading-md text-primary"></span>
              </div>
            )}

            {hasMinQuery && !isLoading && isError && (
              <Error>Failed to search your library.</Error>
            )}

            {hasMinQuery && !isLoading && !isError && data && (
              <>
                {!hasAnyMatches && <SearchEmptyState query={query} />}

                {hasAnyMatches && (
                  <>
                    <SearchResultSection
                      label="Playlists"
                      Icon={Music}
                      count={data.playlists.totalCount}
                    >
                      {data.playlists.items.map((playlist) => (
                        <SearchResultRow
                          key={playlist.id}
                          to={`/playlists/${playlist.id}`}
                          image={playlist.images?.[0]?.url}
                          FallbackIcon={Music}
                          shape="square"
                          title={playlist.name}
                          subtitle={`${playlist.trackCount} track${
                            playlist.trackCount !== 1 ? "s" : ""
                          }`}
                          onNavigate={handleClose}
                        />
                      ))}
                    </SearchResultSection>

                    <SearchResultSection
                      label="Tracks"
                      Icon={Disc3}
                      count={data.tracks.totalCount}
                    >
                      {data.tracks.items.map((track) => {
                        const hasRealAlbum =
                          !!track.album.id && track.album.type !== "youtube";
                        return (
                          <SearchResultRow
                            key={track.id}
                            to={
                              hasRealAlbum
                                ? `/albums/${track.album.id}`
                                : `/artists/${track.artistIds[0]}`
                            }
                            image={track.album.images?.[0]?.url}
                            FallbackIcon={Disc3}
                            shape="square"
                            title={track.name}
                            subtitle={track.artistNames.join(", ")}
                            onNavigate={handleClose}
                          />
                        );
                      })}
                    </SearchResultSection>

                    <SearchResultSection
                      label="Albums"
                      Icon={Disc3}
                      count={data.albums.totalCount}
                    >
                      {data.albums.items.map((album) => (
                        <SearchResultRow
                          key={album.id}
                          to={`/albums/${album.id}`}
                          image={album.images?.[0]?.url}
                          FallbackIcon={Disc3}
                          shape="square"
                          title={album.name}
                          subtitle={album.artistName}
                          onNavigate={handleClose}
                        />
                      ))}
                    </SearchResultSection>

                    <SearchResultSection
                      label="Artists"
                      Icon={User}
                      count={data.artists.totalCount}
                    >
                      {data.artists.items.map((artist) => (
                        <SearchResultRow
                          key={artist.id}
                          to={`/artists/${artist.id}`}
                          image={artist.images?.[0]?.url}
                          FallbackIcon={User}
                          shape="circle"
                          title={artist.name}
                          subtitle={`${artist.trackCount ?? 0} track${
                            artist.trackCount !== 1 ? "s" : ""
                          }`}
                          onNavigate={handleClose}
                        />
                      ))}
                    </SearchResultSection>
                  </>
                )}
              </>
            )}
          </div>
        </div>
        <div className="modal-backdrop" onClick={handleClose}></div>
      </dialog>

      <button
        type="button"
        className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-base-content/70 hover:text-base-content hover:bg-base-300/50 transition-all duration-150"
        onClick={handleOpen}
      >
        <Search size={16} />
        <span>Search</span>
        <span className="flex items-center gap-0.5">
          <kbd className="kbd kbd-sm">{isMacPlatform() ? "⌘" : "Ctrl"}</kbd>
          <kbd className="kbd kbd-sm">K</kbd>
        </span>
      </button>
    </>
  );
}
