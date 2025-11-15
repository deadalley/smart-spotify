import { Grid2X2, List } from "lucide-react";

export function ViewSwitch({
  view,
  setView,
}: {
  view: "grid" | "list";
  setView: (view: "grid" | "list") => void;
}) {
  return (
    <div className="join">
      <button
        onClick={() => setView("grid")}
        className={`btn btn-sm btn-outline join-item ${
          view === "grid" ? "btn-primary" : ""
        }`}
        title="Grid view"
      >
        <Grid2X2 size={16} />
      </button>
      <button
        onClick={() => setView("list")}
        className={`btn btn-sm btn-outline join-item ${
          view === "list" ? "btn-primary" : ""
        }`}
        title="List view"
      >
        <List size={16} />
      </button>
    </div>
  );
}
