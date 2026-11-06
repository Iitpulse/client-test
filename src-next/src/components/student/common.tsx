"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import { StudentApiError } from "@/lib/student-api";
import { m4Api, m4Keys } from "@/lib/m4-api";
import { fixtureParam } from "@/lib/fixtures";
import { cn } from "@/lib/utils";
import { StateIco } from "./states";
import { StateIcon } from "./state-icons";
import { gateHref, useStartTestGate } from "./start-link";

/** The test gate (Student-TestGate): every Start / Resume / Test details on Home and Tests goes here first. */
export { gateHref };

/**
 * Start or resume a test: open its gate (/tests/:id/start), which checks the test's state and then opens the frozen
 * NTA flow (/instructions) itself.
 */
export const useStartTest = useStartTestGate;

/** A loading block (.skel shimmers only while loading; reduced motion holds it still). */
export function Skel({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <span className={cn("skel block", className)} style={style} aria-hidden="true" />;
}

/** A failed load: the API's own sentence, and Retry when a second try can help. */
export function ErrorCard({ error, onRetry, className }: { error: unknown; onRetry?: () => void; className?: string }) {
  const e = error instanceof StudentApiError ? error : null;
  const retryable = !e || e.status === 0 || e.status >= 500;
  return (
    <div className={cn("card col items-start gap-3 p-6", className)} role="alert">
      <span className="h3">{e?.code === "STUDENTS_ONLY" ? "This page is for students" : "Couldn't load this"}</span>
      <span className="sm muted">{e?.message || "Something went wrong. Please try again."}</span>
      {retryable && onRetry && (
        <button type="button" className="btn btn-secondary btn-sm" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

const NO_BATCH = {
  home: {
    title: ["You're not in a batch yet", "You're not in a batch yet"],
    body: [
      "Tests, results and your study plan all come through your batch. Your institute adds you, usually within a day of joining.",
      "Tests and results come through your batch. Your institute adds you, usually within a day.",
    ],
    foot: "Signed up with a promo code? It should have added you. If not, tell your institute.",
  },
  tests: {
    title: ["No tests yet: you're not in a batch", "You're not in a batch yet"],
    body: [
      "Your institute assigns tests to batches. Once they add you to one, its tests show up here and we email you.",
      "Tests come through your batch. Your institute adds you.",
    ],
    foot: null,
  },
} as const;

/**
 * The account has no batch yet (contract: student.batch null, every list empty): Student-Home / Student-Tests
 * "no-batch" and their phone boards. "Check your details" opens the profile.
 */
export function NoBatchCard({ where = "tests", className }: { where?: "home" | "tests"; className?: string }) {
  const c = NO_BATCH[where];
  return (
    <section className={cn("card st-card rise", className)}>
      <StateIco tone="navy" icon="people" />
      <h2 className="h2 m-0 max-md:hidden">{c.title[0]}</h2>
      <h2 className="h3 m-0 md:hidden">{c.title[1]}</h2>
      <p className="body muted m-0 max-w-[520px] max-md:hidden">{c.body[0]}</p>
      <p className="sm muted m-0 md:hidden">{c.body[1]}</p>
      <Link prefetch={false} href="/profile" className="btn btn-primary max-md:w-full">
        Check your details
      </Link>
      {c.foot && <span className="xs muted max-md:hidden">{c.foot}</span>}
    </section>
  );
}

/**
 * Kit-States "Offline" as the batch 5 boards word it per screen: the desktop sentence and the shorter phone one.
 * On phones the strip runs edge to edge under the header (`.bnr-ph`).
 */
export function OfflineStrip({ desktop, phone, className }: { desktop: React.ReactNode; phone: React.ReactNode; className?: string }) {
  return (
    <div className={cn("bnr warn bnr-ph", className)} role="status">
      <StateIcon name="wifi" size={16} />
      <span className="max-md:hidden">
        <b>You&apos;re offline.</b> {desktop}
      </span>
      <span className="md:hidden">
        <b>Offline.</b> {phone}
      </span>
    </div>
  );
}

// ── Fixtures (batch 5 state props): `?fixture=<state>` on dev / staging only (lib/fixtures.ts). ──

const noop = () => () => {};
/** The `?fixture=` state, or null (always null on the server and in production). */
export function useFixture(): string | null {
  return useSyncExternalStore(noop, fixtureParam, () => null);
}

/** A query key under the fixture's own namespace, so fixture data never mixes with the real cache. */
export function fxKey<K extends readonly unknown[]>(fx: string | null, key: K): readonly unknown[] {
  return fx ? ["fixture", fx, ...key] : key;
}

/** Loads one fixture (the module is only fetched when a fixture is asked for). */
export async function loadFixture<T>(fx: string, name: string, arg?: unknown): Promise<T> {
  const m = await import("./b5-fixtures");
  return m.fixture(fx, name, arg) as Promise<T>;
}

/**
 * Whether the 1-hour email reminder is on (PATCH /users/student/me preferences.testReminders): Home's "Coming up"
 * line and the Tests cards' "Email reminder at …". null until the profile is in (the line is left out until then).
 */
export function useReminderPref(): boolean | null {
  const fx = useFixture();
  const q = useQuery({
    queryKey: fxKey(fx, m4Keys.me),
    queryFn: fx ? () => loadFixture<Awaited<ReturnType<typeof m4Api.me>>>(fx, "profile") : ({ signal }) => m4Api.me(signal),
    staleTime: 5 * 60_000,
    retry: false,
  });
  return q.data ? q.data.profile.preferences.testReminders : null;
}
