// Copied verbatim from Iitpulse/api-ai src/contracts/m4.ts (branch feature/migration-fastify-typescript, e9f5702).
// Do not edit here: change the contract in api-ai and copy it again. Prose rules: api-ai docs/m4-api.md.

/**
 * M4 contract (progress, practice, profile, study plan, doubt chat). Binding shapes; see docs/m4-api.md.
 * No dependencies: the student app may copy this file. Implementers may ADD fields, never rename or remove.
 *
 * Owners: tests service = Progress + Practice + internal ai endpoints; users service = Profile + internal notify;
 * ai service = StudyPlan + Doubts. All routes go through the gateway (`apiTests`, `apiUsers`, `apiAi`).
 */

export type IsoDateTime = string; // UTC ISO with Z
export type IsoDate = string; // YYYY-MM-DD, IST calendar date
/** Plain text or HTML with inline LaTeX ($…$). Render with MathText. AI-written fields are plain text (no HTML). */
export type RichText = string;

/* ───────────────────────── tests: GET /tests/student/progress?range= ───────────────────────── */

export type ProgressRange = "30d" | "90d" | "all";

export interface ProgressResponse {
  now: IsoDateTime;
  range: ProgressRange;
  /** Start of the range (null for "all"). The client labels the range chip and "since …" from this. */
  from: IsoDateTime | null;
  /** Submitted tests with a visible result in the range */
  testsCount: number;
  /** Tests whose result counts but whose review is still held back are included in scores, never in chapter data */
  headline: {
    /** Average over full mocks (kind "full") when the range has any, else over all tests */
    average: { score: number; maxScore: number; basis: "fullMocks" | "allTests"; deltaSinceFrom: number | null } | null;
    accuracy: { percent: number; deltaPoints: number | null } | null;
    /** targetSeconds = the most-used pattern's duration / question count; label from the exam's name (data, never hardcoded) */
    timePerQuestion: { seconds: number; targetSeconds: number | null; targetLabel: string | null } | null;
    bestRank: { rank: number; of: number; testId: string; testShortName: string } | null;
  };
  /** Up to 12 most recent tests in the range, oldest first (chart). Full mocks only when basis is "fullMocks". */
  scoreTrend: Array<{ testId: string; shortName: string; name: string; submittedAt: IsoDateTime; score: number; maxScore: number; percent: number }>;
  /** Share of questions correct per chapter over the last 6 tests in the range (heatmap) */
  chapterMastery: {
    tests: Array<{ testId: string; shortName: string }>;
    rows: Array<{ subject: string; chapter: string; overallPercent: number; cells: Array<{ testId: string; percent: number | null }> }>;
  };
  /** 0–3 weakest chapters/topics, biggest first ("start here" on the first). No LLM: template text from stats. */
  weakTopics: WeakTopic[];
  /** Up to 4 chapters with the best accuracy (min 8 questions attempted) */
  strengths: Array<{ subject: string; chapter: string; percent: number }>;
  /** Added by tests: tests in the range that count in scores only (review not open yet or held back); chapter data leaves them out */
  heldBackCount: number;
}

export interface WeakTopic {
  subject: string;
  chapter: string;
  topic: string | null;
  percent: number;
  attempted: number;
  correct: number;
  skipped: number;
  /** "skipping": attempt rate far below overall; "timePressure": wrong mostly in the last 15 min; "accuracy": otherwise */
  insight: { kind: "skipping" | "timePressure" | "accuracy"; text: string };
  action: { kind: "practice" | "timedDrill"; label: string; practice: PracticeRequest };
}

/* ───────────────────────── tests: practice ───────────────────────── */

/** Body of POST /tests/student/practice */
export interface PracticeRequest {
  subject?: string;
  chapter: string;
  topic?: string | null;
  /** 1–20 */
  count: number;
  /** Timed drill: minutes shown as a countdown on the client; null = untimed */
  minutes?: number | null;
  /** Where the student came from (analytics only) */
  source?: { kind: "progress" | "studyPlan" | "doubt"; id?: string };
}

export interface PracticeSet {
  id: string;
  title: string; // "Rotational motion · 12 questions"
  createdAt: IsoDateTime;
  minutes: number | null;
  questions: PracticeQuestion[];
}

export interface PracticeQuestion {
  n: number;
  questionId: string;
  type: "single" | "multiple" | "integer" | "paragraph" | "matrix";
  stem: { en: RichText; hi: RichText | null };
  /** Authored order; no correctness here */
  options: Array<{ id: string; key: string; en: RichText; hi: RichText | null }>;
  /** Filled once the student has checked this question */
  checked: PracticeCheck | null;
}

/** POST /tests/student/practice/:setId/questions/:n/check, body { optionIds?: string[]; value?: number } */
export interface PracticeCheck {
  outcome: "correct" | "partial" | "wrong";
  yourAnswer: { optionIds?: string[]; value?: number };
  correctAnswer: { optionIds?: string[]; range?: { min: number; max: number } };
  solution: { en: RichText; hi: RichText | null } | null;
}

/* ───────────────────────── users: GET/PATCH /users/student/me ───────────────────────── */

export interface StudentProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  rollNo: string | null;
  phone: string | null;
  city: string | null;
  /** The tenant's cities (constant ["Indore"] until the platform service exists). City is a select, never free text. */
  cityOptions: string[];
  parentPhone: string | null;
  /** "JEE 2027" style label built from data (exam name + target year), null if unknown */
  targetLabel: string | null;
  batch: { id: string; name: string } | null;
  institute: { name: string } | null;
  preferences: StudentPreferences;
}

export interface StudentPreferences {
  questionLanguage: "en" | "hi";
  emailResults: boolean;
  testReminders: boolean;
  rebuildPlanAfterResult: boolean;
}

/** PATCH /users/student/me (any subset). Email, roll no., batch are read-only. */
export interface StudentProfilePatch {
  firstName?: string;
  lastName?: string;
  phone?: string | null;
  city?: string | null; // must be one of cityOptions
  parentPhone?: string | null;
  preferences?: Partial<StudentPreferences>;
}

/** POST /users/student/me/password { currentPassword, newPassword } → { now, changed: true } */
export interface PasswordChange {
  currentPassword: string;
  newPassword: string;
}

/* ───────────────────────── ai: study plan ───────────────────────── */

export interface StudyPlanResponse {
  now: IsoDateTime;
  status: "ready" | "generating" | "not_applicable";
  /** not_applicable: "NO_RESULTS" (no visible result yet) */
  reason: string | null;
  plan: StudyPlan | null;
  actions: {
    lighter: { available: boolean; nextAt: IsoDateTime | null };
    rebuild: { available: boolean; nextAt: IsoDateTime | null };
  };
}

export interface StudyPlan {
  id: string;
  /** Monday of the plan's week (IST) */
  weekStart: IsoDate;
  generatedAt: IsoDateTime;
  basedOn: Array<{ testId: string; shortName: string }>;
  minutesPerDay: number;
  days: Array<{ date: IsoDate; isToday: boolean; minutes: number; items: StudyPlanItem[] }>;
}

export interface StudyPlanItem {
  id: string;
  kind: "read" | "practice" | "drill" | "redo" | "rest" | "mockPrep";
  /** Plain text with inline LaTeX ("Torque about an axis") */
  title: string;
  minutes: number | null;
  done: boolean;
  /** kind practice | drill: the client calls POST /tests/student/practice with this */
  practice: PracticeRequest | null;
  /** kind redo: links to /results/:testId/q/:n (the M2 review) */
  redo: { testId: string; testShortName: string; questions: Array<{ n: number; shownAs: number }> } | null;
}

/* ───────────────────────── ai: doubt chat ───────────────────────── */

export interface DoubtQuota {
  /** Student messages left today (IST day), 20 a day */
  leftToday: number;
  perDay: number;
  /** Turns left in this thread, 15 per thread (null outside a thread) */
  leftInThread: number | null;
  resetsAt: IsoDateTime;
}

export interface DoubtThreadSummary {
  id: string;
  testId: string;
  testName: string;
  testShortName: string;
  n: number;
  shownAs: number;
  /** First ~140 chars of the stem as plain text with LaTeX */
  questionPreview: string;
  lastMessagePreview: string;
  turns: number;
  updatedAt: IsoDateTime;
}

export interface DoubtMessage {
  id: string;
  role: "student" | "tutor";
  /** text: plain text with inline LaTeX; question: a real bank question (similar-question chip) */
  kind: "text" | "question";
  text: string;
  question: PracticeQuestion | null;
  /** tutor only: "stop" normal; "refused" / "failed" carry the fixed message and did not count against the quota */
  finish: "stop" | "refused" | "failed" | null;
  createdAt: IsoDateTime;
}

export interface DoubtThread {
  summary: DoubtThreadSummary;
  messages: DoubtMessage[];
  quota: DoubtQuota;
  /** Chips under the input: always similar + hindi, plus 0–2 follow-ups from the last answer */
  suggestions: DoubtChip[];
}

export type DoubtChip =
  | { kind: "similar"; label: string } // "Similar question"
  | { kind: "hindi"; label: string } // "हिन्दी में समझाएं"
  | { kind: "followUp"; label: string }; // sent as text

/** POST /ai/student/doubts/:threadId/messages body. Exactly one of text / chip. text ≤ 600 chars. */
export type DoubtSend = { text: string } | { chip: "similar" | "hindi" };

/**
 * The POST above answers `text/event-stream` (or a JSON error before the stream starts). Events, in order:
 *   event: start   data: { studentMessage: DoubtMessage, quota: DoubtQuota }
 *   event: delta   data: { text: string }                 (0..n; append)
 *   event: question data: { message: DoubtMessage }       (similar chip only, instead of deltas)
 *   event: done    data: { message: DoubtMessage, quota: DoubtQuota, suggestions: DoubtChip[] }
 * `ping` comments (": ping") every 15 s keep proxies open. A dropped stream: GET the thread to recover.
 */
export type DoubtStreamEvent =
  | { event: "start"; data: { studentMessage: DoubtMessage; quota: DoubtQuota } }
  | { event: "delta"; data: { text: string } }
  | { event: "question"; data: { message: DoubtMessage } }
  | { event: "done"; data: { message: DoubtMessage; quota: DoubtQuota; suggestions: DoubtChip[] } };

/* ───────────────────────── error codes added in M4 ───────────────────────── */

export type M4ErrorCode =
  | "VALIDATION_ERROR"
  | "STUDENTS_ONLY"
  | "AI_NOT_AVAILABLE_YET"
  | "AI_PAUSED"
  | "AI_UNAVAILABLE"
  | "TEST_NOT_FOUND"
  | "NO_SUBMISSION"
  | "QUESTION_NOT_FOUND"
  | "NO_PRACTICE_QUESTIONS" // 404: nothing left in the bank for that chapter after exclusions
  | "PRACTICE_NOT_FOUND" // 404
  | "PRACTICE_LIMIT" // 429 details { resetsAt }: 30 new sets a day
  | "PRACTICE_QUESTION_HELD" // 403 (added by tests): check refused, the question has since gone into an open test
  | "PRACTICE_UNAVAILABLE" // 503 (added by tests): the question bank could not be reached
  | "NOT_IMPLEMENTED" // 501 (added by tests): progress / practice on TESTS_DB=mongo
  | "DOUBT_DAILY_LIMIT" // 429 details { resetsAt }
  | "THREAD_FULL" // 409: 15 turns used; start a new thread
  | "THREAD_NOT_FOUND" // 404
  | "PLAN_ACTION_LIMIT" // 429 details { nextAt }
  | "INVALID_CITY" // 400
  | "WRONG_PASSWORD" // 400
  | "WEAK_PASSWORD"; // 400
