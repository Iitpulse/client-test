"use client";

// Student-ErrorPages (batch 8): the calm full-page states for a page that failed (error.tsx, inside the app frame),
// the whole app failing (global-error.tsx), and links that lead nowhere (not-found.tsx, global-not-found.tsx).
// Never on the frozen exam screens: /instructions and /test live in the (exam) root layout, which has none of these.
// Desktop shows the long body, the support line and the note; phones the short body and full-width buttons.

import Link from "next/link";
import { StudentApiError } from "@/lib/student-api";
import { dayMonth } from "@/lib/time";

export type ErrorAction = { label: string; href?: string; onClick?: () => void; /** a full page load, not the client router */ hard?: boolean };

function Act({ a, kind }: { a: ErrorAction; kind: "primary" | "ghost" }) {
  const cls = `btn btn-lg btn-${kind} max-md:w-full`;
  if (a.onClick) {
    return (
      <button type="button" className={cls} onClick={a.onClick}>
        {a.label}
      </button>
    );
  }
  if (a.hard) {
    // a full page load on purpose: the app's router may be what failed
    return (
      <a href={a.href ?? "/"} className={cls}>
        {a.label}
      </a>
    );
  }
  return (
    <Link prefetch={false} href={a.href ?? "/"} className={cls}>
      {a.label}
    </Link>
  );
}

export function ErrorScreen({
  mark,
  tone = "grey",
  role = "status",
  title,
  body,
  bodyShort,
  primary,
  secondary,
  code,
  note,
  doodle = false,
  className,
}: {
  /** "404": the big number (not found); otherwise the tinted icon tile */
  mark?: "404";
  tone?: "red" | "grey";
  role?: "alert" | "status";
  title: string;
  body: string;
  /** the phone copy (defaults to `body`) */
  bodyShort?: string;
  primary: ErrorAction;
  secondary?: ErrorAction;
  /** support code, "E-7F3A" */
  code?: string;
  note?: string;
  /** the pencil doodle in the left gutter (desktop, inside the app frame) */
  doodle?: boolean;
  className?: string;
}) {
  return (
    <div className={`err-page relative flex flex-1 items-center justify-center px-4 py-16 max-md:items-start max-md:py-10 ${className ?? ""}`}>
      {doodle && (
        <span className="cl-doodle max-md:hidden" aria-hidden="true" style={{ left: "8%", top: 24 }}>
          <svg width="84" height="84" viewBox="0 0 84 84">
            <path d="M14 66 42 14l28 52z" />
            <path d="M42 36v14M42 58v1" />
          </svg>
        </span>
      )}
      <div className="err-ctr rise" role={role}>
        {mark === "404" ? (
          <span className="err-big num" aria-hidden="true">
            404
          </span>
        ) : (
          <span className={`st-ico ${tone}`} aria-hidden="true">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7.5v5.5M12 16.5h.01" />
            </svg>
          </span>
        )}
        <h1 className="h2 m-0 max-md:text-[22px]">{title}</h1>
        <p className="body muted m-0 max-md:hidden">{body}</p>
        <p className="sm muted m-0 md:hidden">{bodyShort ?? body}</p>
        <div className="st-acts">
          <Act a={primary} kind="primary" />
          {secondary && <Act a={secondary} kind="ghost" />}
        </div>
        {code && (
          <span className="err-code">
            Code {code}
            <span className="max-md:hidden"> · share it if you ask for help</span>
          </span>
        )}
        {note && <span className="xs muted max-w-[420px] max-md:hidden">{note}</span>}
      </div>
    </div>
  );
}

/** "E-7F3A" from Next's error digest (the same failure, the same code), or a stable fallback. */
export function errorCode(error: Error & { digest?: string }): string {
  const seed = error.digest || `${error.name}:${error.message}`;
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `E-${((h >>> 0) & 0xffff).toString(16).toUpperCase().padStart(4, "0")}`;
}

/**
 * Student-ErrorPages "Test removed" and "Not yours" (batch 8), inside the app frame: api-tests answers 404
 * TEST_REMOVED { name, removedAt } (the institute deleted a test that was this student's) or NOT_YOUR_TEST (another
 * batch's test or another student's link; no details, so nothing about the test leaks) on the result and paper
 * routes. Null for any other error.
 */
export function testGoneScreen(error: unknown, institute: string): React.ReactNode {
  const e = error instanceof StudentApiError ? error : null;
  if (e?.code === "TEST_REMOVED") {
    const d = (e.details ?? {}) as { name?: string; removedAt?: string };
    const when = d.removedAt ? ` on ${dayMonth(d.removedAt)}` : "";
    return (
      <ErrorScreen
        title="This test was removed"
        body={`${institute} removed ${d.name ? `"${d.name}"` : "this test"}${when}. If you wrote it, your score is still on Progress.`}
        bodyShort={`Your institute removed this test${when}. Any score you had stays on Progress.`}
        primary={{ label: "See your tests", href: "/tests" }}
        secondary={{ label: "Open Progress", href: "/progress" }}
      />
    );
  }
  if (e?.code === "NOT_YOUR_TEST") {
    return (
      <ErrorScreen
        title="This page isn't available to you"
        body="It belongs to another student or another batch, so it can't be shown. If a friend sent you this link, open your own result from Tests."
        bodyShort="It belongs to another student or batch. Open your own from Tests."
        primary={{ label: "See your tests", href: "/tests" }}
        secondary={{ label: "Go to Home", href: "/" }}
      />
    );
  }
  return null;
}
