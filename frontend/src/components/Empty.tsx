import { LucideIcon } from "lucide-react";
import { PropsWithChildren } from "react";

export function Empty({
  children,
  Icon,
}: PropsWithChildren<{ Icon: LucideIcon }>) {
  return (
    <div className="flex flex-col justify-center items-center min-h-[400px]">
      <Icon className="w-12 h-12 mx-auto mb-4 text-gray-400" />
      <h2 className="text-xl font-semibold mb-2">{children}</h2>
    </div>
  );
}
