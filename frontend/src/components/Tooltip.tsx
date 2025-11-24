import { ReactNode, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const MARGIN = 8; // Margin between tooltip and trigger element

export function Tooltip({
  content,
  children,
  position = "top",
}: {
  content: ReactNode;
  children: ReactNode;
  position?: "top" | "bottom" | "left" | "right";
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isVisible && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();

      let top = 0;
      let left = 0;

      switch (position) {
        case "top":
          top = rect.top - MARGIN;
          left = rect.left + rect.width / 2;
          break;
        case "bottom":
          top = rect.bottom + MARGIN;
          left = rect.left + rect.width / 2;
          break;
        case "left":
          top = rect.top + rect.height / 2;
          left = rect.left - MARGIN;
          break;
        case "right":
          top = rect.top + rect.height / 2;
          left = rect.right + MARGIN;
          break;
      }

      setTooltipPosition({ top, left });
    }
  }, [isVisible, position]);

  const positionClasses = {
    top: "-translate-x-1/2 -translate-y-full",
    bottom: "-translate-x-1/2",
    left: "-translate-x-full -translate-y-1/2",
    right: "-translate-y-1/2",
  };

  return (
    <>
      <div
        ref={triggerRef}
        className="relative inline-block"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
      >
        {children}
      </div>
      {isVisible &&
        createPortal(
          <div
            className={`fixed z-50 pointer-events-none ${positionClasses[position]}`}
            style={{
              top: `${tooltipPosition.top}px`,
              left: `${tooltipPosition.left}px`,
            }}
          >
            <div className="bg-base-200 text-base-content text-xs rounded-lg shadow-lg px-3 py-2 whitespace-pre">
              {content}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
