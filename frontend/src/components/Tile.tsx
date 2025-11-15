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
      className={`card card-border hover:border-primary/50 transition-all duration-150 group overflow-hidden ${
        className ?? ""
      }`}
    >
      {children}
    </Link>
  );
}
