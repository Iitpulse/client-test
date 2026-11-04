import type { ReactNode } from "react";

const C = 302; // the boards' circumference for r=48 in a 120 viewBox

/**
 * The boards' score ring (.ring-track / .ring-val, drawn once by --animate-ring). `percent` may be negative or
 * over 100 in the API; the drawing is clamped. `children` sit in the middle (HTML, over the SVG).
 */
export function Ring({
  percent,
  size,
  stroke = 11,
  label,
  track,
  color,
  children,
  className,
}: {
  percent: number;
  size: number;
  stroke?: number;
  label?: string;
  track?: string;
  color?: string;
  children?: ReactNode;
  className?: string;
}) {
  const p = Math.min(100, Math.max(0, Number.isFinite(percent) ? percent : 0));
  const svg = (
    <svg width={size} height={size} viewBox="0 0 120 120" role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true} className="block flex-none">
      <circle className="ring-track" cx="60" cy="60" r="48" fill="none" strokeWidth={stroke} style={track ? { stroke: track } : undefined} />
      <circle
        className="ring-val"
        cx="60"
        cy="60"
        r="48"
        fill="none"
        strokeWidth={stroke}
        strokeDasharray={C}
        strokeDashoffset={C * (1 - p / 100)}
        transform="rotate(-90 60 60)"
        style={{ "--circ": C, ...(color ? { stroke: color } : {}) } as React.CSSProperties}
      />
    </svg>
  );
  if (!children) return <span className={className}>{svg}</span>;
  return (
    <span className={className} style={{ position: "relative", display: "inline-block", width: size, height: size, flex: "none" }}>
      {svg}
      <span className="col absolute inset-0 items-center justify-center" aria-hidden="true">
        {children}
      </span>
    </span>
  );
}
