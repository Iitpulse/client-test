// "Preview as student" (batch 7, Admin-PreviewStudent, canvas v180). The admin app opens /preview/<testId> in a new
// tab; that page asks its opener for the staff token over postMessage (never in the URL, never stored), then shows
// the real NTA exam screens read-only: answers stay on this page, nothing is saved or submitted, the timer does not run,
// no fullscreen, no exam log. The frozen /instructions and /test pages read `usePreview()`; for real students it is
// always inactive, so their behaviour and pixels are unchanged.
import { create } from "zustand";

interface PreviewState {
  active: boolean;
  testId: string | null;
  token: string | null;
  lang: "en" | "hi";
  start: (testId: string, token: string) => void;
  setLang: (lang: "en" | "hi") => void;
  stop: () => void;
}

export const usePreviewStore = create<PreviewState>((set) => ({
  active: false,
  testId: null,
  token: null,
  lang: "en",
  start: (testId, token) => set({ active: true, testId, token }),
  setLang: (lang) => set({ lang }),
  stop: () => set({ active: false, testId: null, token: null }),
}));

/** The preview's test id while previewing, else null (hook for the exam pages). */
export function usePreview(): { testId: string; lang: "en" | "hi" } | null {
  const active = usePreviewStore((s) => s.active);
  const testId = usePreviewStore((s) => s.testId);
  const lang = usePreviewStore((s) => s.lang);
  return active && testId ? { testId, lang } : null;
}

/** Outside React (the exam store, the exam log). */
export function previewActive(): boolean {
  return usePreviewStore.getState().active;
}

const API_GATEWAY = process.env.NEXT_PUBLIC_API_GATEWAY || "http://localhost:8000";

/**
 * GET /tests/admin/tests/:id/student-preview with the staff token, mapped to the student start's response shape
 * ({ data: test, attempt, template, progress, fullscreenExits }) so the exam store reads it unchanged.
 */
export async function fetchPreviewStart(testId: string): Promise<Record<string, unknown>> {
  const { token } = usePreviewStore.getState();
  const res = await fetch(`${API_GATEWAY}/tests/admin/tests/${encodeURIComponent(testId)}/student-preview`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    cache: "no-store",
  });
  const json = (await res.json().catch(() => null)) as { success?: boolean; message?: string; data?: Record<string, unknown> } | null;
  if (!res.ok || !json?.success || !json.data) {
    const err = new Error(json?.message || (res.status === 401 || res.status === 403 ? "Your staff sign-in can't open this preview. Open it again from the test builder." : "The preview didn't load."));
    (err as Error & { response?: unknown }).response = { data: { message: err.message } };
    throw err;
  }
  const d = json.data;
  return { data: d.test, attempt: d.attempt, template: d.template, progress: null, fullscreenExits: 0, noteForStudents: d.noteForStudents };
}

/**
 * The admin app's origin for a student-app origin (tests.iitpulse.in → app.iitpulse.in, staging-tests → staging-app,
 * localhost:3001 → localhost:3000), or NEXT_PUBLIC_ADMIN_APP_URI when set. Only messages from it are accepted.
 */
export function adminOrigin(): string | null {
  if (process.env.NEXT_PUBLIC_ADMIN_APP_URI) return new URL(process.env.NEXT_PUBLIC_ADMIN_APP_URI).origin;
  if (typeof window === "undefined") return null;
  const u = new URL(window.location.href);
  if (u.hostname === "localhost" || u.hostname === "127.0.0.1") return `${u.protocol}//${u.hostname}:${u.port === "3001" ? "3000" : u.port}`;
  const host = u.hostname.replace(/^tests\./, "app.").replace(/^staging-tests\./, "staging-app.");
  return host === u.hostname ? null : `${u.protocol}//${host}`;
}
