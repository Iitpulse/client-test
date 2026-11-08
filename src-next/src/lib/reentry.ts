/**
 * Re-entry per test (api-tests docs/reentry-api.md): this browser's device key and this tab's sitting.
 *
 * - Device key: a random id in localStorage (IITP_DEVICE_KEY), made the first time a test starts. The server keeps only
 *   a hash of it; it tells "same device and browser" apart from a new device when a student comes back.
 * - Sitting: POST /test/student/:id/start answers `sitting.id`; this tab keeps it in sessionStorage (a refresh keeps it,
 *   a new tab or a reopened browser does not) and sends it with every save and the submit. Only the open sitting may
 *   write; a closed one (the test moved to another device or tab, or Sign out) answers 409 SITTING_CLOSED.
 * Storage blocked (private mode): no key, so the server treats every open as a new device (staff decide).
 */
const DEVICE_KEY = "IITP_DEVICE_KEY";
const sittingKey = (testId: string) => `IITP_SITTING_${testId}`;

function randomKey(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return `dk_${crypto.randomUUID().replace(/-/g, "")}`;
    const b = new Uint8Array(16);
    crypto.getRandomValues(b);
    return `dk_${Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("")}`;
  } catch {
    return `dk_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 14)}`;
  }
}

/** This browser's device key (made on first use); null when storage is blocked. */
export function deviceKey(): string | null {
  if (typeof window === "undefined") return null;
  try {
    let k = localStorage.getItem(DEVICE_KEY);
    if (!k || !/^[A-Za-z0-9_-]{16,64}$/.test(k)) {
      k = randomKey();
      localStorage.setItem(DEVICE_KEY, k);
    }
    return k;
  } catch {
    return null;
  }
}

export function sittingOf(testId: string): string | null {
  if (typeof window === "undefined" || !testId) return null;
  try {
    return sessionStorage.getItem(sittingKey(testId));
  } catch {
    return null;
  }
}

export function rememberSitting(testId: string, id: string | null | undefined): void {
  if (typeof window === "undefined" || !testId || !id) return;
  try {
    sessionStorage.setItem(sittingKey(testId), id);
  } catch {
    // storage blocked: the next open of this tab counts as coming back
  }
}

/**
 * Tests are written on a laptop or desktop only (owner, 8 Nov 2026, design-gaps E6). This device's form factor: a phone
 * or tablet by its user agent (an iPad asking for the desktop site: a Mac with touch), else "small" when the screen
 * is too small for the NTA layout (its long side under 1024 CSS px). Touchscreen laptops are not blocked. The server checks the
 * user agent too (POST start: 403 DEVICE_NOT_ALLOWED).
 */
export type FormFactor = "desktop" | "tablet" | "phone" | "small";
export function formFactor(): FormFactor {
  if (typeof window === "undefined") return "desktop";
  const ua = navigator.userAgent;
  if (/iPhone|iPod|Android.*Mobile|Mobi/.test(ua)) return "phone";
  if (/iPad|Tablet|Android/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return "tablet";
  const w = window.screen?.width || window.innerWidth;
  const h = window.screen?.height || window.innerHeight;
  if (Math.max(w, h) < 1024) return "small";
  return "desktop";
}

/** The fields every start, save and submit carries (and the gate's query) */
export function sittingFields(testId: string): { device?: string; sittingId?: string; formFactor: FormFactor } {
  const device = deviceKey();
  const sittingId = sittingOf(testId);
  return { ...(device ? { device } : {}), ...(sittingId ? { sittingId } : {}), formFactor: formFactor() };
}

/** 409 answers that mean "this tab may not write the test now": go to the gate, which says why */
export const REENTRY_CODES = new Set(["REENTRY_REQUIRED", "SITTING_CLOSED", "DEVICE_NOT_ALLOWED"]);

export function gateUrl(testId: string, moved = false): string {
  return `/tests/${encodeURIComponent(testId)}/start${moved ? "?moved=1" : ""}`;
}

/** The error code of an axios or fetch error body */
export function errorCode(error: unknown): string | null {
  const data = (error as { response?: { data?: { code?: unknown } } })?.response?.data;
  return typeof data?.code === "string" ? data.code : null;
}
