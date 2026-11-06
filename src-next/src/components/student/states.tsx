"use client";

// Page states for every student route (Kit-States board): error with a support code, offline banner, centred state
// card (empty / no permission / not found / blocked). Loading skeletons stay per page (shaped like the page).
// Phone rules: the frame (tab bar, headers) stays; buttons are full width and 44px.

import Link from "next/link";
import { StudentApiError } from "@/lib/student-api";
import { cn } from "@/lib/utils";
import { StateIcon, type StateIconName } from "./state-icons";

export type StateTone = "navy" | "red" | "amber" | "grey" | "green";

/**
 * A short support code for an error ("Code E-7F3A"): the same failure gives the same code, so a teacher or support
 * can match what a student reads out. Built from the HTTP status and the API code, never from a stack trace.
 */
export function supportCode(err: unknown): string {
  const e = err instanceof StudentApiError ? err : null;
  const seed = e ? `${e.status}:${e.code ?? ""}` : String((err as Error)?.name ?? "x");
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `E-${((h >>> 0) & 0xffff).toString(16).toUpperCase().padStart(4, "0")}`;
}

/** The tinted icon tile of the state boards (48px; 44px on phones). */
export function StateIco({ tone, icon, className }: { tone: StateTone; icon: StateIconName; className?: string }) {
  return (
    <span className={cn("st-ico", tone, className)} aria-hidden="true">
      <StateIcon name={icon} />
    </span>
  );
}

type Action = { label: string; href?: string; onClick?: () => void; disabled?: boolean };

function ActionButton({ a, kind }: { a: Action; kind: "primary" | "secondary" | "ghost" }) {
  const cls = cn("btn btn-lg", `btn-${kind}`, "max-md:w-full");
  if (a.href && !a.disabled)
    return (
      <Link prefetch={false} href={a.href} className={cls}>
        {a.label}
      </Link>
    );
  return (
    <button type="button" className={cls} onClick={a.onClick} disabled={a.disabled}>
      {a.label}
    </button>
  );
}

/**
 * The centred state card (Kit-States "Empty", "No permission", "Not found"; Student-ResultStates blanks; Tests
 * "no batch"). `eyebrow` sits above the title (the test name, or "404").
 */
export function StateCard({
  tone = "navy",
  icon,
  eyebrow,
  title,
  body,
  primary,
  secondary,
  secondaryKind = "ghost",
  code,
  role,
  children,
  className,
  headingLevel = 2,
}: {
  tone?: StateTone;
  icon?: StateIconName;
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  body?: React.ReactNode;
  primary?: Action;
  secondary?: Action;
  secondaryKind?: "ghost" | "secondary";
  code?: string;
  role?: "alert" | "status";
  children?: React.ReactNode;
  className?: string;
  headingLevel?: 1 | 2;
}) {
  const H = headingLevel === 1 ? "h1" : "h2";
  return (
    <section className={cn("card st-card", className)} role={role}>
      {icon && <StateIco tone={tone} icon={icon} />}
      {eyebrow && <span className="xs muted" style={{ fontWeight: 600 }}>{eyebrow}</span>}
      <H className="h2 max-md:text-[22px]" style={{ margin: 0 }}>
        {title}
      </H>
      {body && <p className="body muted max-md:text-[14px]" style={{ margin: 0, maxWidth: 520 }}>{body}</p>}
      {children}
      {(primary || secondary) && (
        <div className="st-acts">
          {primary && <ActionButton a={primary} kind="primary" />}
          {secondary && <ActionButton a={secondary} kind={secondaryKind} />}
        </div>
      )}
      {code && <span className="xs muted mono">Code {code}</span>}
    </section>
  );
}

/**
 * Kit-States "Error · try again": names the thing ("Couldn't load your tests"), says what is safe, one button and a
 * support code. `what` completes "Couldn't load …".
 */
export function PageError({
  what,
  error,
  onRetry,
  safe = "Your answers and results are safe. Try again in a moment.",
  className,
}: {
  what: string;
  error: unknown;
  onRetry?: () => void;
  safe?: string;
  className?: string;
}) {
  const e = error instanceof StudentApiError ? error : null;
  const retryable = !e || e.status === 0 || e.status >= 500;
  // 4xx: the API's own sentence is the useful part (it names the problem); 5xx and offline: the calm default.
  const body = e && !retryable ? e.message : e?.status === 0 ? "You seem to be offline. Check your connection and try again." : safe;
  return (
    <StateCard
      tone="red"
      icon="warn"
      role="alert"
      title={`Couldn't load ${what}`}
      body={body}
      primary={retryable && onRetry ? { label: "Try again", onClick: onRetry } : undefined}
      code={supportCode(error)}
      className={className}
    />
  );
}

const timeFmt = new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" });
/** "6:41 PM" in IST. */
export function istTime(at: number | string | Date): string {
  return timeFmt.format(new Date(at)).replace(/\s?(am|pm)$/i, (m) => ` ${m.trim().toUpperCase()}`);
}

/**
 * Kit-States "Offline": a banner over the page (what loaded stays visible). `asOf` = when the shown data loaded
 * ("Showing your tests as of 6:41 PM"); `children` replaces the default sentence.
 */
export function OfflineBanner({ asOf, what = "what loaded", children, className, tone = "warn" }: { asOf?: number | null; what?: string; children?: React.ReactNode; className?: string; tone?: "warn" }) {
  return (
    <div className={cn("bnr", tone, className)} role="status">
      <StateIcon name="wifi" size={16} />
      <span>
        <b>You&apos;re offline.</b>{" "}
        {children ?? (asOf ? `Showing ${what} as of ${istTime(asOf)}.` : "Showing what loaded before.")}
      </span>
    </div>
  );
}

/** A note line (.nt info / warn / err / grey) with the info icon (Student-TestGate, Student-ResultStates). */
export function Note({ tone = "info", children, role = "note", className, action }: { tone?: "info" | "warn" | "err" | "grey"; children: React.ReactNode; role?: "note" | "status" | "alert"; className?: string; action?: React.ReactNode }) {
  return (
    <div className={cn("nt", tone, className)} role={role}>
      <StateIcon name="info" size={16} />
      <span className="grow">{children}</span>
      {action}
    </div>
  );
}

/** A definition list of facts ("Submitted · Mon 2 Nov, 11:42 AM"). */
export function Facts({ items, className }: { items: Array<{ k: string; v: React.ReactNode }>; className?: string }) {
  if (!items.length) return null;
  return (
    <dl className={cn("facts", className)}>
      {items.map((f) => (
        <div key={f.k} style={{ display: "contents" }}>
          <dt>{f.k}</dt>
          <dd>{f.v}</dd>
        </div>
      ))}
    </dl>
  );
}
