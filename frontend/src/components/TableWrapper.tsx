import { ReactNode } from "react";

export function TableWrapper({ children }: { children: ReactNode }) {
  return (
    <div className="bg-base-300 rounded-lg overflow-hidden border border-base-200">
      {children}
    </div>
  );
}
