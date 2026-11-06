// M6 batches 4/5 student types used by the gate, submitted, result-state and PDF screens (copied from
// Iitpulse/api-ai src/contracts/m6.ts; that file is binding). types/m6.ts holds StudentGateResponse.
import type { IsoDateTime } from "./m2-student";

export type AnswerKey = { optionIds?: string[]; from?: number; to?: number; matches?: Record<string, string[]>; [k: string]: unknown };

/** POST /tests/test/submit answer (added fields; Student-Submitted) */
export interface SubmitResponseM6 {
  receiptId: string;
  submittedAt: IsoDateTime;
  answered: number;
  total: number;
  timeUsedSeconds: number;
  autoSubmitted: { reason: "timeUp" | "exitLimit" } | null;
  ignoredLateChanges: number;
  resultVisible: boolean;
  resultHidden: boolean;
  resultAt: IsoDateTime | null;
  rankAt: IsoDateTime | null;
  resultsEmailOn: boolean | null;
}

/** Added to the student result and review question */
export interface StudentKeyCorrectionNote {
  n: number;
  questionId: string;
  correctedAt: IsoDateTime;
  oldKey: AnswerKey;
  newKey: AnswerKey;
  yourMarks: { before: number; after: number };
  mode: "changeKey" | "acceptAlso" | "drop";
  yourScore: { before: number; after: number };
  yourRank: { before: number | null; after: number | null };
}

/** Added to GET /tests/student/results/:testId (Student-ResultStates) */
export interface StudentResultExtras {
  publishedAt: IsoDateTime | null;
  updatedAt: IsoDateTime | null;
  keyCorrections: StudentKeyCorrectionNote[];
  rank: { rank: number; of: number; percentile: number } | null;
  rankPending: { availableAt: IsoDateTime; submittedSoFar: number; assigned: number | null } | null;
  timeUsedSeconds: number;
  durationSeconds: number;
  sections: Array<{ name: string; score: number; maxScore: number; correct: number; partial: number; wrong: number; skipped: number; timeSeconds: number }>;
}

/** details of 403 RESULT_HIDDEN */
export interface ResultHiddenDetails {
  submittedAt: IsoDateTime;
  receiptId: string;
}

/** details of 404 NO_SUBMISSION */
export interface NoSubmissionDetails {
  state: "inProgress" | "upcoming" | "missed";
  opensAt: IsoDateTime | null;
  closesAt: IsoDateTime | null;
  attempt: { answered: number; total: number; secondsLeft: number } | null;
}
