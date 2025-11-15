import { PropsWithChildren } from "react";
import { Link, To } from "react-router-dom";

export function Tile({
  children,
  to,
  className,
}: PropsWithChildren<{ to: To; className?: string }>) {
  return (
    <Link
      to={to}
      className={`bg-base-200 border border-zinc-800/50 rounded-lg hover:bg-base-100/30 hover:border-primary/50 transition-all duration-150 group flex flex-col overflow-hidden ${
        className ?? ""
      }`}
    >
      {children}
    </Link>
  );
}
