"use client";

import { useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import { greeting, longDay, shortDay } from "@/lib/time";
import { qk, studentApi } from "@/lib/student-api";
import { useOnline } from "@/lib/use-online";
import { useAuthStore } from "@/stores/auth.store";
import type { StudentHome } from "@/types/m2-student";
import { fxKey, loadFixture, OfflineStrip, useFixture } from "./common";
import { istTime } from "./states";

// The client parts of Home's greeting: the words that depend on the time and the student. The frame around them
// (the date note, the ink underline, the doodles) is rendered by app/(student)/(shell)/page.tsx, a server
// component, so it costs no JavaScript.  The page stays static (prerendered at build):
// the time comes from the Home response's server clock once it is in, from the device clock until then.

/** GET /tests/student/home (or its fixture with `?fixture=<state>` on dev / staging). Home's one query. */
export function useHomeQuery() {
  const fx = useFixture();
  return useQuery({
    queryKey: fxKey(fx, qk.home),
    queryFn: fx ? () => loadFixture<StudentHome>(fx, "home") : ({ signal }) => studentApi.home(signal),
    retry: fx ? false : undefined,
  });
}

/** Kit-States offline on Home: what loaded stays, with the time it loaded. */
export function useHomeOffline(): boolean {
  const online = useOnline();
  const fx = useFixture();
  return !online || fx === "offline";
}

function useHomeData() {
  return useHomeQuery().data;
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
  return now === null ? " " : greeting(now); // a space keeps the line's height until the time is known
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

/** "Batch: JEE 2027 · Indore A"; "No batch yet" (amber) when the account has none (desktop only, as the boards). */
export function BatchBadge() {
  const data = useHomeData();
  if (!data) return null;
  const batch = data.student.batch;
  if (!batch) return <span className="badge b-amber max-md:hidden">No batch yet</span>;
  return batch.name ? <span className="badge b-navy max-md:hidden">Batch: {batch.name}</span> : null;
}

/** Student-Home / Phone-Home "offline": a strip over the page (edge to edge under the phone header). */
export function HomeOffline() {
  const q = useHomeQuery();
  const offline = useHomeOffline();
  if (!offline) return null;
  const at = q.dataUpdatedAt ? istTime(q.dataUpdatedAt) : null;
  return (
    <OfflineStrip
      className="rise max-md:-mx-4 max-md:-mt-4"
      desktop={`${at ? `Showing what loaded at ${at}. ` : ""}A live test still starts, and your answers are kept on this device until you're back.`}
      phone={`${at ? `Showing ${at}. ` : ""}A live test still starts.`}
    />
  );
}
