"use client";

import { useEffect, useState } from "react";

/**
 * The server's clock, ticking. `serverNow` is the `now` of the response and `receivedAt` the device time when it
 * arrived (TanStack Query's `dataUpdatedAt`): the device clock only measures the time since then, so a phone
 * with a wrong clock never shows a wrong countdown, and cached data does not restart the clock.
 * Ticks every `everyMs` (default 1 s) while `active`.
 */
export function useServerClock(serverNow: string | undefined, receivedAt: number, active = true, everyMs = 1000): number {
  const serverMs = serverNow ? Date.parse(serverNow) : Number.NaN;
  const [clock, setClock] = useState({ serverMs, receivedAt, now: serverMs });
  // A new response re-anchors the clock (React's render-time update for state derived from props).
  const stale = !Object.is(clock.serverMs, serverMs) || clock.receivedAt !== receivedAt;
  if (stale) setClock({ serverMs, receivedAt, now: serverMs });
  useEffect(() => {
    if (!active || Number.isNaN(serverMs)) return;
    const tick = () => setClock((c) => (Object.is(c.serverMs, serverMs) ? { ...c, now: serverMs + Math.max(0, Date.now() - receivedAt) } : c));
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, everyMs);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [active, everyMs, serverMs, receivedAt]);
  return stale ? serverMs : clock.now;
}
