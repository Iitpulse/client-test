// Copied verbatim from Iitpulse/api-ai src/contracts/m3-ai.ts (branch feature/migration-fastify-typescript, f013227).
// Do not edit here: change the contract in api-ai and copy it again. Prose rules: api-ai docs/m3-ai-api.md.

/** M3 student AI API contract (docs/m3-ai-api.md). No dependencies: the student app may copy this file. */

export type AiStatus = "ready" | "generating" | "not_applicable";

export type LeakKind = "concept" | "time" | "skip" | "careless";

export interface Leak {
  title: string;
  marksLost: number;
  note: string;
  /** Paper numbers (the M2 review routes' n), in the student's order */
  questionNs: number[];
  kind: LeakKind;
}

export interface SummaryResponse {
  now: string;
  status: AiStatus;
  /** not_applicable: "NO_MARKS_LOST" | "NO_SOLUTIONS" */
  reason: string | null;
  marksLost: number;
  marksExplained: number;
  leaks: Leak[];
  other: { marksLost: number; note: string } | null;
  generatedAt: string | null;
  /** Batch 8 (Review-NotGenerated): the review card; null when not applicable */
  review: ReviewCard | null;
}

/** Batch 8 Review-NotGenerated (src/features/review-card.ts) */
export type ReviewState = "not_opened" | "queued" | "generating" | "failed" | "failed_final" | "stale_after_key_fix" | "ready";

export interface ReviewCard {
  state: ReviewState;
  triesPerDay: number;
  /** Student "Try again" tries left today (IST); the first open counts as a try */
  triesLeft: number;
  /** When the overnight retry runs (failed / failed_final), else null */
  nextAutomaticRetryAt: string | null;
  /** On failed / failed_final: "E-XXXX", shown to the student and to staff for support */
  supportCode: string | null;
  lastFailedAt: string | null;
  /** queued: when, and how many reviews of this institute are ahead (null otherwise) */
  queuedAt: string | null;
  queueAhead: number | null;
  /** stale_after_key_fix: the student's score the old review was written for and the score now */
  stale: { scoreBefore: number | null; scoreAfter: number } | null;
  generatedAt: string | null;
}

export type MistakeType = "concept" | "calculation" | "misread" | "time_pressure" | "guess" | "skipped";

export interface Explanation {
  mistakeType: MistakeType;
  why: string;
  steps: string[];
  keyIdea: string;
  trap: string;
}

export interface ExplanationResponse {
  now: string;
  status: AiStatus;
  /** not_applicable: "CORRECT" | "NO_OFFICIAL_SOLUTION" | "NO_ANSWER_KEY" (added 4 Nov: the key names no option) */
  reason: string | null;
  explanation: Explanation | null;
  explanationId: string | null;
  myFeedback: "helpful" | "not_helpful" | null;
}

export interface FeedbackRequest {
  helpful: boolean;
}

export interface FeedbackResponse {
  now: string;
  myFeedback: "helpful" | "not_helpful";
}

export type AiErrorCode =
  | "STUDENTS_ONLY"
  | "AI_NOT_AVAILABLE_YET"
  | "TEST_NOT_FOUND"
  | "NO_SUBMISSION"
  | "QUESTION_NOT_FOUND"
  | "AI_RATE_LIMITED"
  | "AI_PAUSED"
  | "AI_UNAVAILABLE"
  /** added 4 Nov: 400 bad n / feedback body */
  | "VALIDATION_ERROR"
  /** added 4 Nov: feedback for an explanation this student was never shown */
  | "EXPLANATION_NOT_FOUND";
