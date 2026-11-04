"use client";

import { useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import { greeting, longDay, shortDay } from "@/lib/time";
import { qk, studentApi } from "@/lib/student-api";
import { useAuthStore } from "@/stores/auth.store";

// The client parts of Home's greeting: the words that depend on the time and the student. The frame around them
// (the date note, the ink underline, the doodles) is rendered by app/(student)/(shell)/page.tsx, a server
// component, so it costs no JavaScript.  The page stays static (prerendered at build):
// the time comes from the Home response's server clock once it is in, from the device clock until then.

function useHomeData() {
  return useQuery({ queryKey: qk.home, queryFn: ({ signal }) => studentApi.home(signal) }).data;
}

/** The first name, from the session (the same source as the nav and avatar); Home's own copy fills a gap. */
function useFirstName(): string | undefined {
  const stored = useAuthStore((s) => s.currentUser?.name);
  const home = useHomeData();
  return (stored || home?.student.name || "").trim().split(/\s+/)[0] || undefined;
}

const noop = () => () => {};
/** The server's `now` from the Home response; until it arrives, the device clock (and nothing while server rendering). */
function useNow(): number | null {
  const serverNow = useHomeData()?.now;
  // Minute precision keeps the snapshot stable between renders.
  const device = useSyncExternalStore(noop, () => Math.floor(Date.now() / 60_000) * 60_000, () => null);
  return serverNow ? Date.parse(serverNow) : device;
}

/** "Good evening" */
export function GreetingWord() {
  const now = useNow();
  return now === null ? "\u00a0" : greeting(now); // a space keeps the line's height until the time is known
}

/** "Wednesday, 4 November" on desktop, "Wed, 4 Nov" on phones */
export function HomeDate() {
  const now = useNow();
  // Nothing (not even a space) until the time is known: any text here would make the browser fetch the
  // handwriting font before the first paint. The note keeps its height with min-h (page.tsx).
  if (now === null) return null;
  return (
    <>
      <span className="max-md:hidden">{longDay(now)}</span>
      <span className="md:hidden">{shortDay(now)}</span>
    </>
  );
}

export function GreetingComma() {
  return useFirstName() ? ", " : null;
}

export function GreetingName() {
  return useFirstName() ?? null;
}

export function BatchBadge() {
  const batch = useHomeData()?.student.batch?.name;
  return batch ? <span className="badge b-navy max-md:hidden">Batch: {batch}</span> : null;
}
