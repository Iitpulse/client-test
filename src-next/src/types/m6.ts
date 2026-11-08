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
/* Re-entry per test (api-tests docs/reentry-api.md) */
export type ReentryWhy = "signedOut" | "tooLate" | "newDevice" | "otherDevice" | "onceOnly";
export type DeviceKind = "desktop" | "phone" | "tablet";
export interface ReentryRequestView {
  id: string;
  /** "R7K-42", shown to the invigilator */
  code: string;
  status: "waiting" | "allowed";
  why: ReentryWhy;
  createdAt: IsoDateTime;
  decidedAt: IsoDateTime | null;
  decidedBy: { name: string | null } | null;
  reason: string | null;
  extraMinutes: number;
  allowUntil: IsoDateTime | null;
}
export interface GateReentry {
  policy: "once" | "crash" | "any";
  minutes: number;
  /** continue = this tab's sitting; first = none yet; auto = back by itself; approved = staff said yes; staff = waits */
  decision: "continue" | "first" | "auto" | "approved" | "staff";
  how: "auto" | "takeover" | null;
  newDevice: boolean;
  why: ReentryWhy | null;
  /** this tab's sitting closed because the test moved to another device or tab */
  replacedHere: boolean;
  request: ReentryRequestView | null;
  facts: { lastSaveAt: IsoDateTime | null; minutesSinceSave: number | null; endReason: string | null; leftAt: IsoDateTime | null; deviceKind: DeviceKind | null; previousDeviceKind: DeviceKind | null };
  pollSeconds: number;
}

export interface StudentGateResponse {
  now: IsoDateTime;
  state: GateState;
  test: { testId: string; name: string; questions: number; durationMinutes: number; maxMarks: number; subjects: string[]; opensAt: IsoDateTime | null; closesAt: IsoDateTime | null } | null;
  /** notAssigned: the test's batches vs yours */
  batches: { test: GateRef[]; yours: GateRef | null } | null;
  /** resume */
  attempt: { startedAt: IsoDateTime; expiresAt: IsoDateTime; answered: number; total: number; lastSavedAt: IsoDateTime | null; fullscreenExits: number; exitsAllowed: number | null; extraMinutes?: number; reentry?: GateReentry | null } | null;
  /** submitted; endedBy (re-entry): denied by staff, or time ran out with nobody writing */
  submission: { submittedAt: IsoDateTime; receiptId: string; resultVisible: boolean; resultAt: IsoDateTime | null; resultHidden: boolean; endedBy?: "reentryDenied" | "timeUpAway" | null; answered?: number } | null;
  fullscreenPolicy: FullscreenPolicy;
  reminderEmailOn: boolean;
  /** tests need a laptop or desktop (the server's view of this device; api-tests docs/reentry-api.md) */
  device?: { allowed: boolean; formFactor: "desktop" | "tablet" | "phone" | "small" };
}

/* Exam UI template v2 as the exam app gets it (StudentExamTemplate in api-ai src/contracts/m6.ts) */
export type ExamLang = "en" | "hi";
/** Labels on the frozen NTA screen a template may reword (≤ 32 characters each) */
export type WordingKey = "clear" | "saveNext" | "saveMarkReview" | "markReviewNext" | "submit" | "notAnswered";
export interface InstructionsDoc {
  heading: string;
  /** numbered lines per block; placeholders already filled for this test */
  blocks: Array<{ id: string; title: string; lines: string[] }>;
  declaration: string;
}
export interface ExamTools {
  calculator: "off" | "basic" | "scientific";
  markForReview: boolean;
  viewQuestionPaper: boolean;
  viewInstructions: boolean;
  languageSwitch: boolean;
  roughSheet: boolean;
}
export interface StudentExamTemplate {
  id: string;
  wording: Record<ExamLang, Record<WordingKey, string>>;
  instructions: Record<ExamLang, InstructionsDoc>;
  tools: ExamTools;
}
