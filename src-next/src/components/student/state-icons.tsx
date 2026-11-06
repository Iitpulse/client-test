// Icons of the batch 5 state boards (Student-TestGate, Student-Submitted, Student-ResultStates, Kit-States), copied
// from the boards' SVGs: 24px grid, currentColor, decorative (the heading next to them says the state).

const base = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeLinecap: "round", "aria-hidden": true, focusable: false } as const;

export type StateIconName =
  | "check"
  | "clock"
  | "closed"
  | "done"
  | "lock"
  | "link"
  | "device"
  | "deviceSaved"
  | "resume"
  | "wifi"
  | "send"
  | "warn"
  | "exit"
  | "clipboard"
  | "people"
  | "info";

export function StateIcon({ name, size = 24 }: { name: StateIconName; size?: number }) {
  const p = { ...base, width: size, height: size, strokeWidth: 2 };
  switch (name) {
    case "check":
      return (
        <svg {...p} strokeWidth={2.2} strokeLinejoin="round">
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
      );
    case "clock":
      return (
        <svg {...p}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      );
    case "closed":
      return (
        <svg {...p}>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M3 10h18M8 3v4M16 3v4M10 14l4 4M14 14l-4 4" />
        </svg>
      );
    case "done":
      return (
        <svg {...p} strokeLinejoin="round">
          <path d="M9 4h6M8 4H6a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2" />
          <path d="m8.5 13 2.5 2.5 4.5-5" />
        </svg>
      );
    case "clipboard":
      return (
        <svg {...p} strokeLinejoin="round">
          <path d="M9 4h6M8 4H6a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2" />
          <path d="M9 12h6M9 16h4" />
        </svg>
      );
    case "lock":
      return (
        <svg {...p}>
          <rect x="5" y="11" width="14" height="10" rx="2" />
          <path d="M8 11V8a4 4 0 0 1 8 0v3" />
        </svg>
      );
    case "link":
      return (
        <svg {...p}>
          <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1M4 4l16 16" />
        </svg>
      );
    case "device":
      return (
        <svg {...p} strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="12" rx="2" />
          <path d="M2 20h20M12 8v3M12 13.5h.01" />
        </svg>
      );
    case "deviceSaved":
      return (
        <svg {...p} strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="12" rx="2" />
          <path d="M2 20h20M9 10l2 2 4-4" />
        </svg>
      );
    case "resume":
      return (
        <svg {...p} strokeLinejoin="round">
          <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
          <path d="M3 3v5h5" />
          <path d="M10 9l5 3-5 3z" />
        </svg>
      );
    case "wifi":
      return (
        <svg {...p}>
          <path d="M2 8.5a15 15 0 0 1 20 0M5.5 12a10 10 0 0 1 13 0M9 15.5a5 5 0 0 1 6 0M12 19h.01M3 3l18 18" />
        </svg>
      );
    case "send":
      return (
        <svg {...p} strokeLinejoin="round">
          <path d="M22 2 11 13M22 2l-7 20-4-9-9-4z" />
        </svg>
      );
    case "warn":
      return (
        <svg {...p}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7.5v5.5M12 16.5h.01" />
        </svg>
      );
    case "info":
      return (
        <svg {...p}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 11v5M12 8h.01" />
        </svg>
      );
    case "exit":
      return (
        <svg {...p} strokeLinejoin="round">
          <path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3" />
        </svg>
      );
    case "people":
      return (
        <svg {...p} strokeLinejoin="round">
          <circle cx="9" cy="8" r="3.5" />
          <path d="M2.5 20a6.5 6.5 0 0 1 13 0M19 8v6M16 11h6" />
        </svg>
      );
  }
}
