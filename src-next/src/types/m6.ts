// M6 student additions (copied from Iitpulse/api-ai src/contracts/m6.ts; that file is binding).
import type { IsoDateTime } from "./m2-student";

export interface GateRef {
  id: string;
  name: string;
}

export interface FullscreenPolicy {
  enabled: boolean;
  /** exits allowed (1–10) */
  maxExits: number;
  action: "warn" | "submit";
}

export type GateState = "ready" | "opensSoon" | "closed" | "submitted" | "notAssigned" | "resume" | "notFound";

/** GET /tests/student/tests/:testId/gate (Student-TestGate). link-expired / link-used come from login-with-key. */
export interface StudentGateResponse {
  now: IsoDateTime;
  state: GateState;
  test: { testId: string; name: string; questions: number; durationMinutes: number; maxMarks: number; subjects: string[]; opensAt: IsoDateTime | null; closesAt: IsoDateTime | null } | null;
  /** notAssigned: the test's batches vs yours */
  batches: { test: GateRef[]; yours: GateRef | null } | null;
  /** resume */
  attempt: { startedAt: IsoDateTime; expiresAt: IsoDateTime; answered: number; total: number; lastSavedAt: IsoDateTime | null; fullscreenExits: number; exitsAllowed: number | null } | null;
  /** submitted */
  submission: { submittedAt: IsoDateTime; receiptId: string; resultVisible: boolean; resultAt: IsoDateTime | null; resultHidden: boolean } | null;
  fullscreenPolicy: FullscreenPolicy;
  reminderEmailOn: boolean;
}
