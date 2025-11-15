import { Grid2X2, List } from "lucide-react";

export function ViewSwitch({
  view,
  setView,
}: {
  view: "grid" | "list";
  setView: (view: "grid" | "list") => void;
}) {
  return (
    <div className="flex bg-base-200 border border-zinc-800/50 rounded-lg p-1">
      <button
        onClick={() => setView("grid")}
        className={`p-2 rounded transition-all duration-150 ${
          view === "grid"
            ? "bg-primary/10 text-primary"
            : "text-base-content/50 hover:text-base-content hover:bg-base-100/30"
        }`}
        title="Grid view"
      >
        <Grid2X2 size={16} />
      </button>
      <button
        onClick={() => setView("list")}
        className={`p-2 rounded transition-all duration-150 ${
          view === "list"
            ? "bg-primary/10 text-primary"
            : "text-base-content/50 hover:text-base-content hover:bg-base-100/30"
        }`}
        title="List view"
      >
        <List size={16} />
      </button>
    </div>
  );
}
