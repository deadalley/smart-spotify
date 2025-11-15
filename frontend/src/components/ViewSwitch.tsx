import { Grid2X2, List } from "lucide-react";

export function ViewSwitch({
  view,
  setView,
}: {
  view: "grid" | "list";
  setView: (view: "grid" | "list") => void;
}) {
  return (
    <button
      className="btn btn-sm"
      onClick={() => setView(view === "grid" ? "list" : "grid")}
    >
      {view === "grid" ? <List size={16} /> : <Grid2X2 size={16} />}
    </button>
  );
}
