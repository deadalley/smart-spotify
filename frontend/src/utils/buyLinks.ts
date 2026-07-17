export type BuyLinkService =
  | "qobuz"
  | "bandcamp"
  | "appleMusic"
  | "discogs"
  | "amazon";

export type BuyLinkEntityType = "track" | "album" | "artist";

export const BUY_LINK_SERVICES: {
  id: BuyLinkService;
  label: string;
  icon: string;
}[] = [
  { id: "qobuz", label: "Qobuz", icon: "/icons/qobuz.png" },
  { id: "bandcamp", label: "Bandcamp", icon: "/icons/bandcamp.png" },
  { id: "appleMusic", label: "Apple Music", icon: "/icons/appleMusic.png" },
  { id: "discogs", label: "Discogs", icon: "/icons/discogs.png" },
  { id: "amazon", label: "Amazon", icon: "/icons/amazon.png" },
];

export function getPrimaryArtistNameFromTracks(
  tracks: ReadonlyArray<{ artistNames: string[] }>
) {
  const counts = tracks
    .flatMap((t) => t.artistNames ?? [])
    .reduce(
      (acc, name) => acc.set(name, (acc.get(name) ?? 0) + 1),
      new Map<string, number>()
    );

  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

// Qobuz locale format is typically "{country}-{language}" (e.g. "us-en", "de-de"),
// while browsers usually expose "{language}-{country}" (e.g. "en-US", "de-DE").
function getQobuzLocale() {
  const nav = typeof navigator !== "undefined" ? navigator : undefined;
  const preferred =
    (nav?.languages ?? [])
      .map((l) => l.replace("_", "-"))
      .find((l) => l.toLowerCase().startsWith("de-")) ??
    nav?.language?.replace("_", "-") ??
    "de-DE";

  const [lang = "de", country = "de"] = preferred
    .split("-")
    .map((p) => p.toLowerCase());

  return `${country}-${lang}`;
}

function buildHref(
  service: BuyLinkService,
  entityType: BuyLinkEntityType,
  q: string
) {
  switch (service) {
    case "qobuz": {
      const qobuzType =
        entityType === "track"
          ? "tracks"
          : entityType === "artist"
          ? "artists"
          : "albums";
      return `https://www.qobuz.com/${getQobuzLocale()}/search/${qobuzType}/${q}`;
    }
    case "bandcamp":
      return `https://bandcamp.com/search?q=${q}`;
    case "appleMusic":
      return `https://music.apple.com/search?term=${q}`;
    case "discogs": {
      const type =
        entityType === "album"
          ? "&type=release"
          : entityType === "artist"
          ? "&type=artist"
          : "";
      return `https://www.discogs.com/search/?q=${q}${type}`;
    }
    case "amazon":
      return `https://www.amazon.com/s?k=${q}`;
  }
}

export function buildLinks({
  entityType,
  name,
  artistName,
  services,
}: {
  entityType: BuyLinkEntityType;
  name: string;
  artistName?: string | null;
  services: BuyLinkService[];
}) {
  const q = encodeURIComponent(
    [name, artistName].filter(Boolean).join(" ").trim()
  );

  const enabled = new Set(services);

  return BUY_LINK_SERVICES.filter((s) => enabled.has(s.id)).map((s) => ({
    service: s.id,
    label: s.label,
    icon: s.icon,
    href: buildHref(s.id, entityType, q),
  }));
}
