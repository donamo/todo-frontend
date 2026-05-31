import { useRef, useState } from "react";
import { createPortal } from "react-dom";

type TooltipProps = {
  text: string;
  children: React.ReactNode;
  className?: string;
};

export function Tooltip({ text, children, className }: TooltipProps) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const ref = useRef<HTMLSpanElement>(null);

  const show = () => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    setPos({ top: r.top + window.scrollY, left: r.left + r.width / 2 + window.scrollX });
  };

  const hide = () => setPos(null);

  return (
    <span ref={ref} onMouseEnter={show} onMouseLeave={hide} className={className}>
      {children}
      {pos &&
        createPortal(
          <span
            style={{ position: "absolute", top: pos.top - 6, left: pos.left, zIndex: 9999 }}
            className="pointer-events-none -translate-x-1/2 -translate-y-full whitespace-nowrap rounded bg-neutral-800 px-2 py-1 text-xs text-neutral-50 shadow-lg"
          >
            {text}
          </span>,
          document.body,
        )}
    </span>
  );
}
