// Batch 7 (owner, 6 Nov 2026): "Redo the ones you got wrong", the Revision list, practice marks from the source test, and
// under-18 guardian consent. Copied from Iitpulse/api-ai src/contracts/m6.ts ("M6 review additions", "Batch 7 answers",
// "Under-18 guardian consent"); that file is binding.

type IsoDateTime = string;

export interface PracticeMarking {
  correct: number;
  incorrect: number;
  /** partial marks by count (multiple-correct options / matrix rows right), as the pattern says */
  partial: Array<{ count: number; marks: number }>;
}

/** Fields redo / revision sets add to the M4 practice shapes (bank practice sends null or nothing). */
export interface PracticeSetScoreExtras {
  timed?: boolean;
  score?: { marks: number; maxMarks: number; checked: number; total: number } | null;
}
export interface PracticeQuestionMarkingExtras {
  marking?: PracticeMarking | null;
}
export interface PracticeCheckMarksExtras {
  marks?: number | null;
  maxMarks?: number | null;
}

export type RedoInclude = "wrong" | "wrongAndSkipped";

/** POST /tests/student/results/:testId/redo */
export interface RedoRequest {
  include?: RedoInclude;
  /** time from the source test (⌈duration × n ÷ question count⌉ minutes); default untimed */
  timed?: boolean;
}
export interface RedoResponse {
  now: IsoDateTime;
  created: boolean;
  set: { id: string; title: string; createdAt: IsoDateTime; minutes: number | null };
}

export type RevisionOutcome = "correct" | "partial" | "wrong" | "skipped";

export interface RevisionItem {
  id: string;
  questionId: string;
  testId: string;
  test: { name: string; shortName: string };
  /** paper number in that test */
  n: number;
  type: "single" | "multiple" | "integer" | "matrix";
  subject: string | null;
  chapter: string | null;
  topic: string | null;
  outcome: RevisionOutcome;
  /** plain text, ≤ 140 chars */
  stemPreview: string;
  note: string | null;
  addedAt: IsoDateTime;
  marking: PracticeMarking | null;
}

export interface RevisionList {
  now: IsoDateTime;
  items: RevisionItem[];
  total: number;
  page: number;
  pageSize: number;
  facets: { subjects: Array<{ subject: string; count: number }>; chapters: Array<{ subject: string; chapter: string; count: number }> };
}

export interface RevisionAddResponse {
  now: IsoDateTime;
  added: number;
  already: number;
  items: RevisionItem[];
}

export type GuardianConsentState = "notRequired" | "needsDob" | "missing" | "waiting" | "expired" | "confirmed";

/** GET/POST /users/student/me/guardian-consent, POST …/resend */
export interface GuardianConsentStatus {
  now: IsoDateTime;
  required: boolean | null;
  status: GuardianConsentState;
  guardian: { name: string | null; emailMasked: string } | null;
  requestedAt: IsoDateTime | null;
  expiresAt: IsoDateTime | null;
  confirmedAt: IsoDateTime | null;
  lastSentAt: IsoDateTime | null;
  resendAvailableAt: IsoDateTime | null;
}

/** GET /users/public/guardian-consent/:token, POST …/confirm */
export interface GuardianConsentPublic {
  now: IsoDateTime;
  status: "pending" | "confirmed";
  student: { firstName: string };
  institute: { name: string };
  guardian: { name: string | null; emailMasked: string };
  expiresAt: IsoDateTime;
  confirmedAt: IsoDateTime | null;
  versions: { terms: string; privacy: string };
}
