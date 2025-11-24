import { ReactNode, useState } from "react";

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

  const positionClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div
          className={`absolute z-50 ${positionClasses[position]} pointer-events-none`}
        >
          <div className="bg-base-200 text-base-content text-sm rounded-lg shadow-lg px-3 py-2 whitespace-pre">
            {content}
          </div>
        </div>
      )}
    </div>
  );
}
