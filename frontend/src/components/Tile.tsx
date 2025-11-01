import { PropsWithChildren } from "react";

interface TileProps extends PropsWithChildren {
  onClick?: () => void;
  className?: string;
}

export function Tile({ children, onClick, className = "" }: TileProps) {
  return (
    <div
      className={`bg-gray-800 p-4 rounded-lg hover:bg-gray-700 transition-colors duration-200 group ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
