"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(min-width: 768px)";

function subscribe(cb: () => void) {
  const m = window.matchMedia(QUERY);
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
}

/**
 * true at 768px and up (the student app's desktop layout), false on phones, null while server rendering and
 * hydrating. Used to fetch what only one layout shows (the desktop review pane's full question list).
 */
export function useIsDesktop(): boolean | null {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => null
  );
}
