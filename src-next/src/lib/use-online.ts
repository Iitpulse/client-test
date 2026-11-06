"use client";

import { useSyncExternalStore } from "react";

// navigator.onLine as a hook (Kit-States "Offline": a banner, not a page). The server render and the first client
// render say online, so the banner never flashes in on load; it appears once the browser reports offline.
function subscribe(cb: () => void) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}

export function useOnline(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true
  );
}
