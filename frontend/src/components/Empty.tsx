import { LucideIcon } from "lucide-react";
import { PropsWithChildren } from "react";

export function Empty({
  children,
  size = "md",
  Icon,
}: PropsWithChildren<{ Icon: LucideIcon; size?: "sm" | "md" | "lg" }>) {
  return (
    <div
      className={`flex flex-col justify-center items-center ${
        size === "sm" ? "p-6" : size === "lg" ? "p-12" : "p-8"
      }`}
    >
      <Icon
        className={`mx-auto mb-4 text-base-content ${
          size === "sm" ? "w-6 h-6" : size === "lg" ? "w-16 h-16" : "w-12 h-12"
        }`}
      />
      <h2
        className={`font-semibold mb-2 ${
          size === "sm" ? "text-lg" : size === "lg" ? "text-3xl" : "text-xl"
        }`}
      >
        {children}
      </h2>
    </div>
  );
}
