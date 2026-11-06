// Terms and privacy acceptance (owner, 6 Nov 2026; board Student-Legal). Contract: Iitpulse/api-ai docs/m6-api.md
// "Terms and privacy acceptance": GET /users/public/legal, POST /users/me/legal-acceptance, `legal` on /users/student/me.
import { request } from "./student-api";

export interface LegalVersions {
  terms: string;
  privacy: string;
}
export interface LegalStatus {
  current: LegalVersions;
  accepted: (LegalVersions & { acceptedAt: string }) | null;
  needsAcceptance: boolean;
}

export const legalApi = {
  /** the versions the sign-up checkbox shows (public) */
  current: (signal?: AbortSignal) => request<{ now: string; current: LegalVersions }>("users", "/public/legal", undefined, signal).then((d) => d.current),
  /** this student's status (the `legal` beside the profile) */
  status: (signal?: AbortSignal) => request<{ legal: LegalStatus | null }>("users", "/student/me", undefined, signal).then((d) => d.legal),
  /** 409 LEGAL_VERSION_CHANGED {current} when the versions moved on meanwhile */
  accept: (v: LegalVersions) => request<{ now: string; legal: LegalStatus }>("users", "/me/legal-acceptance", undefined, undefined, v).then((d) => d.legal),
};

/** "What changed" per terms version, shown in the re-accept dialog; none for the first version */
export const LEGAL_CHANGES: Record<string, string[]> = {};

// The re-accept dialog goes first: other sign-in prompts (Complete your profile) wait until it is settled.
let settled = false;
const waiting = new Set<() => void>();
export function legalSettled(): Promise<void> {
  return settled ? Promise.resolve() : new Promise((r) => waiting.add(r));
}
export function markLegalSettled() {
  settled = true;
  for (const r of waiting) r();
  waiting.clear();
}
