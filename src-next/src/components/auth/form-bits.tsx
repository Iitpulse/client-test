"use client";

// Form parts of the sign-up, sign-in and test-key boards (Student-Signup, Student-Login, Student-SignInLink,
// Kit-Forms): field error and success lines, the form-level boxes, the +91 phone, password with Show, the 6 code
// boxes, the 1-2-3 steps and the strength meter. Students get 44px controls.
import { useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { passwordStrength } from "./reset-email";

const svg = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeLinecap: "round", "aria-hidden": true, focusable: false } as const;

export function CheckMark({ size = 16, strokeWidth = 2.4 }: { size?: number; strokeWidth?: number }) {
  return (
    <svg {...svg} width={size} height={size} strokeWidth={strokeWidth} strokeLinejoin="round">
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

export function ErrIcon({ size = 14, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg {...svg} width={size} height={size} strokeWidth={2} stroke={color}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5.5M12 16.5h.01" />
    </svg>
  );
}

export function ChevronDown() {
  return (
    <svg {...svg} width={16} height={16} strokeWidth={2} strokeLinejoin="round">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

/** A field's error line (Kit-Forms: says what to do, in a few words). */
export function ErrText({ id, children, icon = false }: { id?: string; children: ReactNode; icon?: boolean }) {
  return (
    <span id={id} className="au-err" role="alert">
      {icon && <ErrIcon />}
      <span>{children}</span>
    </span>
  );
}

export function OkText({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <span id={id} className="au-ok" role="status">
      <CheckMark size={14} strokeWidth={2.6} />
      <span>{children}</span>
    </span>
  );
}

const BOX_ICON = {
  wrong: (
    <svg {...svg} width={16} height={16} strokeWidth={2} stroke="#C40000">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5.5M12 16.5h.01" />
    </svg>
  ),
  clock: (
    <svg {...svg} width={16} height={16} strokeWidth={2} stroke="#C40000">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  ),
  lock: (
    <svg {...svg} width={16} height={16} strokeWidth={2} stroke="#C40000">
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  ),
  wifi: (
    <svg {...svg} width={16} height={16} strokeWidth={2}>
      <path d="M2 8.5a15 15 0 0 1 20 0M5.5 12a10 10 0 0 1 13 0M9 15.5a5 5 0 0 1 6 0M12 19h.01M3 3l18 18" />
    </svg>
  ),
  info: (
    <svg {...svg} width={16} height={16} strokeWidth={2} stroke="#00007E">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5.5M12 7.5h.01" />
    </svg>
  ),
};

/** Student-Login's form-level boxes: `sum` (error), `srv` (offline / server), `inf` (information). */
export function AuthBox({
  tone,
  icon,
  title,
  children,
  id,
}: {
  tone: "sum" | "srv" | "inf";
  icon: keyof typeof BOX_ICON;
  title: ReactNode;
  children?: ReactNode;
  id?: string;
}) {
  return (
    <div id={id} className={cn("au-box pop", tone)} role={tone === "srv" ? "status" : "alert"}>
      {BOX_ICON[icon]}
      <span className="col" style={{ gap: 2 }}>
        <span className="sm" style={{ fontWeight: 600 }}>
          {title}
        </span>
        {children}
      </span>
    </div>
  );
}

/** Kit-Forms password: the field with a "Show" button at its end (Student-Signup). */
export function ShowPasswordField({
  id,
  value,
  onChange,
  invalid,
  describedBy,
  autoComplete = "new-password",
  onBlur,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  invalid?: boolean;
  describedBy?: string;
  autoComplete?: string;
  onBlur?: () => void;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className={cn("au-affix", invalid && "e")}>
      <input
        id={id}
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        autoComplete={autoComplete}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        maxLength={128}
      />
      <button type="button" className="sb" onClick={() => setShow((s) => !s)} aria-pressed={show} aria-label={show ? "Hide password" : "Show password"}>
        {show ? "Hide" : "Show"}
      </button>
    </div>
  );
}

/** Formats 10 digits as the board writes them: "98930 77201". */
export function formatPhone(digits: string): string {
  const d = digits.replace(/\D/g, "").slice(0, 10);
  return d.length > 5 ? `${d.slice(0, 5)} ${d.slice(5)}` : d;
}
export const phoneDigits = (v: string) => {
  const d = v.replace(/\D/g, "");
  // pasted with the country code: +91 98930 77201 / 0 98930 77201
  if (d.length === 12 && d.startsWith("91")) return d.slice(2);
  if (d.length === 11 && d.startsWith("0")) return d.slice(1);
  return d.slice(0, 10);
};

/** Kit-Forms phone: fixed +91, 10 digits shown as 98260 12345. `value` holds the digits. */
export function PhoneField({
  id,
  value,
  onChange,
  invalid,
  describedBy,
  onBlur,
  autoComplete = "tel-national",
}: {
  id: string;
  value: string;
  onChange: (digits: string) => void;
  invalid?: boolean;
  describedBy?: string;
  onBlur?: () => void;
  autoComplete?: string;
}) {
  return (
    <div className={cn("au-affix", invalid && "e")}>
      <span className="pre" aria-hidden="true">
        +91
      </span>
      <input
        id={id}
        type="tel"
        inputMode="tel"
        autoComplete={autoComplete}
        value={formatPhone(value)}
        onChange={(e) => onChange(phoneDigits(e.target.value))}
        onBlur={onBlur}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
      />
    </div>
  );
}

/** The 6 code boxes: typing moves on, Backspace moves back, a pasted or auto-filled code fills every box. */
export function OtpBoxes({ value, onChange, invalid, describedBy, onComplete }: { value: string; onChange: (v: string) => void; invalid?: boolean; describedBy?: string; onComplete?: (v: string) => void }) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = Array.from({ length: 6 }, (_, i) => value[i] ?? "");
  const setFrom = (i: number, raw: string) => {
    const typed = raw.replace(/\D/g, "");
    if (!typed) {
      const next = digits.slice();
      next[i] = "";
      onChange(next.join("").slice(0, 6));
      return;
    }
    const next = digits.slice();
    for (let k = 0; k < typed.length && i + k < 6; k++) next[i + k] = typed[k];
    const joined = next.join("");
    onChange(joined);
    const to = Math.min(i + typed.length, 5);
    refs.current[to]?.focus();
    // check by itself only when the last box is reached (typing on, or a pasted / auto-filled code), not on an edit mid-way
    if (i + typed.length >= 6 && /^\d{6}$/.test(joined)) onComplete?.(joined);
  };
  return (
    <div className="row" style={{ gap: 8 }} role="group" aria-label="6-digit code" aria-describedby={describedBy}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          className={cn("au-otp", invalid && "e")}
          value={d}
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          aria-label={`Digit ${i + 1}`}
          aria-invalid={invalid || undefined}
          maxLength={i === 0 ? 6 : 1}
          onChange={(e) => setFrom(i, e.target.value)}
          onFocus={(e) => e.target.select()}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !d && i > 0) refs.current[i - 1]?.focus();
            if (e.key === "ArrowLeft" && i > 0) refs.current[i - 1]?.focus();
            if (e.key === "ArrowRight" && i < 5) refs.current[i + 1]?.focus();
          }}
          onPaste={(e) => {
            e.preventDefault();
            setFrom(i, e.clipboardData.getData("text"));
          }}
        />
      ))}
    </div>
  );
}

/**
 * The 1-2-3 steps (Student-Signup): done steps are filled navy (and, when `onGo` is given, links back), the current
 * one ringed. Phones keep only the numbers.
 */
export function Steps({ labels, current, onGo, label }: { labels: string[]; current: number; onGo?: (step: number) => void; label: string }) {
  return (
    <ol className="au-steps" aria-label={label}>
      {labels.map((l, i) => {
        const n = i + 1;
        const state = n < current ? "done" : n === current ? "cur" : "";
        const inner = (
          <>
            <span className="n">{n}</span>
            <span className="stlabel">{l}</span>
          </>
        );
        return (
          <li key={l} className="contents">
            {i > 0 && <span className={cn("au-line", n <= current && "done")} aria-hidden="true" />}
            {state === "done" && onGo ? (
              <button type="button" className="au-st done" onClick={() => onGo(n)} aria-label={`Step ${n}, ${l}, done. Go back`}>
                {inner}
              </button>
            ) : (
              <span className={cn("au-st", state)} aria-current={state === "cur" ? "step" : undefined} aria-label={`Step ${n}, ${l}${state === "done" ? ", done" : ""}`}>
                {inner}
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

const SEGMENT_COLOR = ["", "var(--red-600)", "var(--amber)", "var(--green)", "var(--green)"];
/** The 4-part strength meter under a new password (Student-Signup). */
export function PasswordMeter({ password }: { password: string }) {
  const { score } = passwordStrength(password);
  return (
    <div className="au-meter" aria-hidden="true">
      {[1, 2, 3, 4].map((seg) => (
        <i key={seg} style={score >= seg ? { background: SEGMENT_COLOR[score] } : undefined} />
      ))}
    </div>
  );
}
