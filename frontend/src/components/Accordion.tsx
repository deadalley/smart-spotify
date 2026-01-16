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
    <div className="flex flex-col gap-y-2">
      {items.map(({ title, content }, index) => (
        <details
          key={name ? `${name}-item-${index}` : `accordion-item-${index}`}
          className="collapse collapse-arrow"
          onToggle={(e) => {
            const details = e.currentTarget as HTMLDetailsElement;
            setIsOpen((s) => ({ ...s, [index]: details.open }));
          }}
          open={isOpen[index]}
        >
          <summary className="collapse-title font-semibold">{title}</summary>
          <div className="collapse-content text-sm">{content}</div>
        </details>
      ))}
    </div>
  );
}
