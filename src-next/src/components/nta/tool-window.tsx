"use client";
// M6 addition to the frozen NTA exam screen (board Exam-Additions, items 6 and 7): the NTA / TCS iON style window the
// calculator and the rough sheet open in. Title bar with optional Help, minimise and close; dragged by the title bar
// (mouse, touch, or the arrow keys when the title bar has focus). On a phone it is pinned instead (calculator: a
// full-width panel at the bottom; rough sheet: full screen). Non-modal: the exam stays usable behind it.

import { useCallback, useEffect, useRef, useState } from "react";
import { useIsDesktop } from "@/lib/use-media";
import "./exam-tools.css";

interface ToolWindowProps {
  title: string;
  /** accessible name of the dialog */
  label: string;
  /** desktop: where the window first opens (px from the viewport's top-left) and its width */
  initial: { left: number; top: number; width: number };
  /** phone: "bottom" = full-width panel at the bottom, "full" = full screen */
  phone: "bottom" | "full";
  onClose: () => void;
  onHelp?: () => void;
  helpOpen?: boolean;
  /** desktop height (the rough sheet); the calculator sizes to its keys */
  height?: number;
  children: React.ReactNode;
  testId?: string;
}

export function ToolWindow({ title, label, initial, phone, onClose, onHelp, helpOpen, height, children, testId }: ToolWindowProps) {
  const isDesktop = useIsDesktop();
  const isPhone = isDesktop === false;
  const [minimised, setMinimised] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number }>(() => ({ left: initial.left, top: initial.top }));
  const winRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ dx: number; dy: number; id: number } | null>(null);

  // Keep the window inside the viewport (opening on a narrow desktop window, or after a resize)
  const clamp = useCallback((left: number, top: number) => {
    const el = winRef.current;
    const w = el?.offsetWidth ?? initial.width;
    const vw = document.documentElement.clientWidth;
    const vh = window.innerHeight;
    return { left: Math.max(0, Math.min(left, vw - w)), top: Math.max(0, Math.min(top, vh - 40)) };
  }, [initial.width]);

  useEffect(() => {
    if (isPhone) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the viewport size is only known in the browser
    setPos((p) => clamp(p.left, p.top));
    const onResize = () => setPos((p) => clamp(p.left, p.top));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [clamp, isPhone]);

  // Focus moves into the window when it opens, and back to the page's opener when it closes (handled by the page)
  useEffect(() => {
    winRef.current?.querySelector<HTMLElement>("[data-autofocus]")?.focus({ preventScroll: true });
  }, []);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isPhone || (e.target as HTMLElement).closest("button")) return;
    drag.current = { dx: e.clientX - pos.left, dy: e.clientY - pos.top, id: e.pointerId };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current || drag.current.id !== e.pointerId) return;
    setPos(clamp(e.clientX - drag.current.dx, e.clientY - drag.current.dy));
  };
  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (drag.current?.id === e.pointerId) drag.current = null;
  };
  const onTitleKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (isPhone || e.target !== e.currentTarget) return;
    const step = e.shiftKey ? 40 : 10;
    const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
    if (!d) return;
    e.preventDefault();
    setPos((p) => clamp(p.left + d[0], p.top + d[1]));
  };

  const style: React.CSSProperties = isPhone
    ? phone === "full" && !minimised
      ? { top: 0, bottom: 0 }
      : { bottom: 0 }
    : { left: pos.left, top: pos.top, width: initial.width, ...(height && !minimised ? { height } : {}) };

  return (
    <div
      ref={winRef}
      role="dialog"
      aria-label={label}
      data-testid={testId}
      className={`nta-win${isPhone ? " is-phone" : ""}`}
      style={style}
    >
      <div
        className="nta-win-t"
        tabIndex={isPhone ? -1 : 0}
        aria-label={isPhone ? undefined : `${title}: move with the arrow keys`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onTitleKey}
      >
        <span>{title}</span>
        <span className="nta-win-x">
          {onHelp && (
            <button type="button" onClick={onHelp} aria-pressed={!!helpOpen}>
              Help
            </button>
          )}
          <button type="button" aria-label={minimised ? `Restore ${title}` : `Minimise ${title}`} aria-expanded={!minimised} onClick={() => setMinimised((m) => !m)}>
            _
          </button>
          <button type="button" aria-label={`Close ${title}`} onClick={onClose}>
            ×
          </button>
        </span>
      </div>
      {!minimised && children}
    </div>
  );
}
