import { PropsWithChildren } from "react";

export function Error({ children }: PropsWithChildren) {
  return <p className="p-6 text-center text-red-400">{children}</p>;
}
