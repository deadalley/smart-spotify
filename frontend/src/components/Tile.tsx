import { PropsWithChildren } from "react";

export function Tile({ children }: PropsWithChildren) {
  return (
    <div className="bg-gray-800 p-4 rounded-lg hover:bg-gray-700 transition-colors duration-200 group">
      <h3 className="text-white font-semibold truncate mb-1">{children}</h3>
    </div>
  );
}
