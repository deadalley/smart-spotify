import { ReactNode, useMemo, useState } from "react";

export function Accordion({
  name,
  items,
}: {
  name?: string;
  items: { title: ReactNode; content: ReactNode; defaultOpen?: boolean }[];
}) {
  const defaultOpenState = useMemo(
    () =>
      items.reduce<Record<number, boolean>>((acc, { defaultOpen }, index) => {
        acc[index] = !!defaultOpen;
        return acc;
      }, {}),
    [items]
  );

  const [isOpen, setIsOpen] =
    useState<Record<number, boolean>>(defaultOpenState);

  return (
    <div>
      {items.map(({ title, content }, index) => (
        <details
          key={name ? `${name}-item-${index}` : `accordion-item-${index}`}
          className="collapse collapse-arrow bg-base-100 border border-base-300"
          onClick={() => setIsOpen((s) => ({ ...s, [index]: !s[index] }))}
          open={isOpen[index]}
        >
          <summary className="collapse-title font-semibold">{title}</summary>
          <div className="collapse-content text-sm">{content}</div>
        </details>
      ))}
    </div>
  );
}
