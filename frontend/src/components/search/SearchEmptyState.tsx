import { SearchX } from "lucide-react";
import { Empty } from "../Empty";
import { Tooltip } from "../Tooltip";
import { useSettings } from "../../contexts/SettingsContext";
import { buildLinks } from "../../utils/buyLinks";

export function SearchEmptyState({ query }: { query: string }) {
  const { enabledServices } = useSettings();

  const externalLinks = buildLinks({
    entityType: "track",
    name: query,
    services: enabledServices,
  });

  return (
    <div>
      <Empty Icon={SearchX} size="sm">
        No results for &quot;{query}&quot; in your library
      </Empty>

      {externalLinks.length > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-2 px-4">
          {externalLinks.map((link) => (
            <Tooltip key={link.service} content={`Search on ${link.label}`}>
              <a
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-outline btn-sm"
              >
                <img
                  src={link.icon}
                  alt=""
                  className="size-4 mr-2 rounded-sm"
                />
                {link.label}
              </a>
            </Tooltip>
          ))}
        </div>
      )}
    </div>
  );
}
