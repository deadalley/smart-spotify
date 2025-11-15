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
      className={`bg-zinc-800 p-4 rounded-lg hover:bg-zinc-700 transition-colors duration-200 group flex flex-col ${
        className ?? ""
      }`}
    >
      {children}
    </Link>
  );
}
