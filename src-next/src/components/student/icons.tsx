// Icons of the M2 boards (Student-Home, -Tests, -Result, -ResultPending and the Phone boards), 24px grid, drawn
// with currentColor. Decorative: every one is aria-hidden; the control around it carries the label.

const base = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "aria-hidden": true, focusable: false } as const;

export function ChevronLeftIcon({ size = 20 }: { size?: number }) {
  return (
    <svg {...base} width={size} height={size} strokeWidth={2} strokeLinecap="round">
      <path d="m15 6-6 6 6 6" />
    </svg>
  );
}

export function ChevronRightIcon({ size = 18 }: { size?: number }) {
  return (
    <svg {...base} width={size} height={size} strokeWidth={2} strokeLinecap="round">
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

export function CalendarIcon() {
  return (
    <svg {...base} width={16} height={16} strokeWidth={1.8} strokeLinecap="round">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  );
}

export function SearchIcon() {
  return (
    <svg {...base} width={16} height={16} strokeWidth={2} strokeLinecap="round">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

export function ArrowUpIcon() {
  return (
    <svg {...base} width={12} height={12} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 19V5M6 11l6-6 6 6" />
    </svg>
  );
}

export function ArrowDownIcon() {
  return (
    <svg {...base} width={12} height={12} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14M6 13l6 6 6-6" />
    </svg>
  );
}

export function LockIcon({ size = 16 }: { size?: number }) {
  return (
    <svg {...base} width={size} height={size} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

/** Student-ResultPending: the hourglass inside a ring that swings round once and rests (.sweep). */
export function HourglassRing() {
  return (
    <svg width="132" height="132" viewBox="0 0 120 120" aria-hidden="true" focusable="false" className="relative flex-none">
      <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,.14)" strokeWidth="8" />
      <circle cx="60" cy="60" r="50" fill="none" stroke="#fff" strokeWidth="8" strokeLinecap="round" strokeDasharray="314" strokeDashoffset="250" className="sweep" />
      <path d="M48 38h24M48 82h24" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
      <path d="M50 40c0 10 20 12 20 20s-20 10-20 20h20c0-10-20-12-20-20s20-10 20-20z" fill="rgba(255,255,255,.85)" />
    </svg>
  );
}
