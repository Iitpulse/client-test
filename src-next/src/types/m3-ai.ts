// Copied verbatim from Iitpulse/api-ai src/contracts/m3-ai.ts (branch feature/migration-fastify-typescript, dd2b796).
// Do not edit here: change the contract in api-ai and copy it again. Prose rules: api-ai docs/m3-ai-api.md.

/** M3 student AI API contract (docs/m3-ai-api.md). No dependencies: the student app may copy this file. */

export type AiStatus = "ready" | "generating" | "not_applicable";

export type LeakKind = "concept" | "time" | "skip" | "careless";

export interface Leak {
  title: string;
  marksLost: number;
  note: string;
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
  /** not_applicable: "CORRECT" | "NO_OFFICIAL_SOLUTION" */
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
  | "AI_UNAVAILABLE";
