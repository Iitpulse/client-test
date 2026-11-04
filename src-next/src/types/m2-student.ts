// Copied verbatim from Iitpulse/api-tests src/contracts/m2-student.ts (branch feature/migration-fastify-typescript, 8d97c51).
// Do not edit here: change the contract in api-tests and copy it again.

/**
 * M2 student portal API contract (types only, no runtime code, no dependencies).
 *
 * The prose contract, with every rule for when a field is null, is docs/m2-student-api.md.
 * Example responses are docs/m2-fixtures/*.json; src/__tests__/m2-contract.test.ts checks them
 * against the Zod mirror in ./m2-student.schema.ts, and that file fails typecheck if it drifts
 * from these types.
 *
 * The student app (Iitpulse/client-test, a public repo) may copy this file as is.
 *
 * Paths are as the browser calls them through the gateway (`/tests/...`); the tests service itself
 * serves them without the `/tests` prefix (`/student/home`, ...).
 */

/** UTC instant, ISO 8601 with `Z`, e.g. "2026-11-04T13:15:24.000Z". Display in IST on the client. */
export type IsoDateTime = string;

// ---------------------------------------------------------------------------------------------
// Envelope and errors
// ---------------------------------------------------------------------------------------------

export interface ApiOk<T> {
  success: true;
  data: T;
}

/** Machine-readable reason on every 4xx/5xx from the M2 routes (401 from the token check has none). */
export type M2ErrorCode =
  | "STUDENTS_ONLY"
  | "TEST_NOT_FOUND"
  | "NO_SUBMISSION"
  | "RESULT_NOT_AVAILABLE"
  | "REVIEW_NOT_AVAILABLE_YET"
  | "QUESTION_NOT_FOUND"
  | "VALIDATION_ERROR"
  | "BATCH_UNAVAILABLE";

export interface ApiError {
  success: false;
  /** HTTP reason phrase or error class, e.g. "Not Found" */
  error: string;
  /** Sentence a student can read */
  message: string;
  code?: M2ErrorCode;
  details?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------------------------
// Shared pieces
// ---------------------------------------------------------------------------------------------

/** The test's kind column. On create it defaults from the subjects (2+ = full, 1 = sectional, else custom). */
export type TestKind = "full" | "sectional" | "custom";

/**
 * The student's state on one test.
 * upcoming: before opensAt. live: open, not started. in_progress: started, not submitted, time left.
 * submitted: a submission exists (manual or auto). ended: closed and never submitted.
 */
export type StudentTestState = "upcoming" | "live" | "in_progress" | "submitted" | "ended";

/** published: score visible now. pending: will become visible. hidden: the institute does not share it. */
export type ResultStatus = "published" | "pending" | "hidden";

/** The admin's Result Publish Type ("hidden" = the test's hideResult flag). */
export type ResultMode = "immediately" | "atTheEndOfTest" | "autoAfterXDays" | "manual" | "hidden";

export type QuestionType = "single" | "multiple" | "integer" | "paragraph" | "matrix";

/** correct: full marks. partial: some marks on a multiple-correct question. wrong: answered, not correct. skipped: no answer. */
export type QuestionOutcome = "correct" | "partial" | "wrong" | "skipped";

export interface ExamRef {
  id: string;
  name: string;
}

export interface BatchRef {
  id: string;
  /** null when the name could not be resolved (no test of the batch carries it) */
  name: string | null;
}

/** What every test card and result header shows about a test. */
export interface TestSummary {
  id: string;
  name: string;
  kind: TestKind;
  /**
   * Short label for chart axes and tight spaces, at most 8 characters: the admin's stored label, else derived
   * from the kind and the last number in the name ("JEE Main Mock 11" -> "M11", "Physics Sectional 4" -> "PS4",
   * no number -> initials, "Full Syllabus Test" -> "FST"). Always present.
   */
  shortName: string;
  exam: ExamRef | null;
  /**
   * Section subjects in paper order, as the boards print them: "Physics", "Chemistry", "Maths" (not
   * "Mathematics"); CAT: "VARC", "DILR", "QA". Every subject field in this contract uses these display names.
   */
  subjects: string[];
  totalQuestions: number;
  durationMinutes: number;
  maxScore: number;
  opensAt: IsoDateTime;
  closesAt: IsoDateTime;
}

/** Present only while state is in_progress. */
export interface AttemptInfo {
  startedAt: IsoDateTime;
  expiresAt: IsoDateTime;
  remainingSeconds: number;
}

export interface ResultVisibilityInfo {
  status: ResultStatus;
  mode: ResultMode;
  /** pending with a known date (atTheEndOfTest, autoAfterXDays); otherwise null */
  availableAt: IsoDateTime | null;
  /** published only: when the result became visible to students */
  publishedAt: IsoDateTime | null;
  /** pending and hidden only: a sentence for the student */
  reason: string | null;
}

/** Rank among everyone who submitted this test (same tenant), "among N students who took this test". Only once the test has settled. */
export interface Rank {
  /** Competition ranking by score: equal scores share a position (1, 2, 2, 4) */
  position: number;
  of: number;
  /** floor(100 × (of − position) / of); "93rd percentile" */
  percentile: number;
  /** ceil(100 × position / of); "Top 7%" */
  topPercent: number;
}

/** Change against the student's previous visible result on a test of the same pattern. */
export interface ScoreDelta {
  marks: number;
  vsTestId: string;
  vsTestName: string;
}

/** The numbers a published result shows on cards and the result header. */
export interface ResultHeadline {
  score: number;
  maxScore: number;
  /** round(100 × score / maxScore); can be negative */
  percent: number;
  /** null until the test has settled (no attempt can still be running); then rankAvailableAt is null */
  rank: Rank | null;
  /** when rank is null: when it will appear (settlesAt = closesAt + duration + auto-submit grace); otherwise null */
  rankAvailableAt: IsoDateTime | null;
  /** null when there is no earlier visible result on the same pattern */
  delta: ScoreDelta | null;
  /** true when the student has 2+ published results on this pattern and none scores higher (ties: all true) */
  isPersonalBest: boolean;
}

export interface CardResult {
  visibility: ResultVisibilityInfo;
  /** non-null iff visibility.status === "published" */
  headline: ResultHeadline | null;
}

export interface TestCard extends TestSummary {
  state: StudentTestState;
  /** in_progress only */
  attempt: AttemptInfo | null;
  /** submitted only */
  submittedAt: IsoDateTime | null;
  /** submitted only */
  result: CardResult | null;
}

// ---------------------------------------------------------------------------------------------
// GET /tests/student/home
// ---------------------------------------------------------------------------------------------

export interface LastResult {
  test: TestSummary;
  submittedAt: IsoDateTime;
  visibility: ResultVisibilityInfo;
  headline: ResultHeadline;
}

export interface PendingResult {
  test: TestSummary;
  submittedAt: IsoDateTime;
  visibility: ResultVisibilityInfo;
}

export interface TrendPoint {
  testId: string;
  testName: string;
  submittedAt: IsoDateTime;
  score: number;
  maxScore: number;
  percent: number;
  /** round(100 × correct / answered); null when nothing was answered */
  accuracyPercent: number | null;
  /** null until that test has settled */
  rank: { position: number; of: number } | null;
}

export interface StudentHome {
  /** Server time; use it for every countdown */
  now: IsoDateTime;
  student: {
    id: string;
    name: string | null;
    /** null when no batch is linked to the account (then every list is empty) */
    batch: BatchRef | null;
  };
  /** The test to act on now: in_progress first (Resume), else the live test that closes soonest */
  live: TestCard | null;
  /** Tests in state live or in_progress */
  liveCount: number;
  /** The most recent submission whose result is published */
  lastResult: LastResult | null;
  /** The most recent submission still pending, if it is newer than lastResult */
  latestPending: PendingResult | null;
  /** Up to 6 published results on lastResult's pattern, oldest first, ending with lastResult */
  trend: TrendPoint[];
  /** Next 3 upcoming tests, soonest first */
  upcoming: TestCard[];
  /** M4 (student_topic_stats). Always null in M2: render nothing. */
  weakTopics: null;
  /** M4 (study_plans). Always null in M2: render nothing. */
  studyPlan: null;
}

// ---------------------------------------------------------------------------------------------
// GET /tests/student/tests
// ---------------------------------------------------------------------------------------------

export type TestsTab = "live" | "upcoming" | "completed";

export interface StudentTestsPage {
  now: IsoDateTime;
  batch: BatchRef | null;
  tab: TestsTab;
  /** Unfiltered counts per tab (ignore subject and q), for the tab badges */
  counts: { live: number; upcoming: number; completed: number };
  /** Subjects across all of the batch's tests, for the filter chips */
  subjects: string[];
  /** live: closesAt asc. upcoming: opensAt asc. completed: submittedAt (or closesAt if never submitted) desc */
  items: TestCard[];
  /** completed only; pass back as ?cursor= for older tests. null = no more */
  nextCursor: string | null;
  /** completed only: how many older tests the cursor would still return (for "Show 6 older tests") */
  remaining: number;
}

// ---------------------------------------------------------------------------------------------
// GET /tests/student/results/:testId
// ---------------------------------------------------------------------------------------------

export interface SubmissionInfo {
  /** Stable per (tenant, test, student), shown as the receipt, e.g. "TR-7F3A-21C9" */
  receiptId: string;
  submittedAt: IsoDateTime;
  autoSubmitted: boolean;
  /** Questions with an answer */
  attemptedCount: number;
  totalQuestions: number;
  /** submittedAt − startedAt, capped at the duration */
  timeUsedSeconds: number;
  durationMinutes: number;
}

/** Whether the answer key, solutions and per-question review may be shown. */
export interface ReviewAvailability {
  available: boolean;
  /** when not available but it will be (settlesAt); otherwise null */
  availableAt: IsoDateTime | null;
  reason: string | null;
}

export interface SectionResult {
  id: string;
  name: string;
  subject: string | null;
  score: number;
  maxScore: number;
  correct: number;
  partial: number;
  wrong: number;
  skipped: number;
  questionCount: number;
  /** Sum of the student's per-question time in this section */
  timeSeconds: number;
}

/**
 * One cell of the question grid. n is the paper's own numbering (authored order), 1-based, and is the key
 * of the review routes. shownAs is the number this student saw in the exam (their shuffled order, shuffled
 * within each sub-section, so sections stay together): label cells with shownAs first, n second (decision 4).
 * shownAs is safe to send while the answer key is held.
 */
export interface QuestionCell {
  n: number;
  shownAs: number;
  questionId: string;
  sectionId: string;
  subject: string | null;
  type: QuestionType;
  outcome: QuestionOutcome;
  marks: number;
  maxMarks: number;
  timeSeconds: number;
}

export interface PublishedResult extends ResultHeadline {
  counts: { correct: number; partial: number; wrong: number; skipped: number; total: number };
  sections: SectionResult[];
  /** Every question, in the student's order: shownAs ascending */
  questions: QuestionCell[];
}

export interface StudentResult {
  now: IsoDateTime;
  test: TestSummary;
  submission: SubmissionInfo;
  visibility: ResultVisibilityInfo;
  review: ReviewAvailability;
  /** non-null iff visibility.status === "published" */
  result: PublishedResult | null;
}

// ---------------------------------------------------------------------------------------------
// GET /tests/student/results/:testId/questions and /questions/:n
// ---------------------------------------------------------------------------------------------

/** review = wrong + partial + skipped (Phone-Review's "Reviewing 2 of 11") */
export type ReviewFilter = "all" | "correct" | "wrong" | "skipped" | "review";

/** HTML with inline LaTeX in $…$ / $$…$$, rendered with MathText (KaTeX) */
export type RichText = string;

export interface ReviewOption {
  id: string;
  /** Letter in the paper's authored order: A, B, C, ... */
  key: string;
  text: { en: RichText; hi: RichText | null };
  isCorrect: boolean;
  isYours: boolean;
}

export interface ReviewQuestion extends QuestionCell {
  stem: { en: RichText; hi: RichText | null };
  /** Empty for integer questions */
  options: ReviewOption[];
  yourAnswer: { optionIds: string[]; value: number | null };
  correctAnswer: { optionIds: string[]; range: { from: number; to: number } | null };
  solution: { en: RichText | null; hi: RichText | null };
  /** Mean time of everyone who answered it; null when fewer than 5 did */
  averageTimeSeconds: number | null;
  /** Share of submissions that got it fully right; null when fewer than 5 submissions */
  correctPercent: number | null;
}

export interface ReviewList {
  /** Server time */
  now: IsoDateTime;
  filter: ReviewFilter;
  total: number;
  /** In the student's order: shownAs ascending */
  items: ReviewQuestion[];
}

export interface ReviewItem {
  /** Server time */
  now: IsoDateTime;
  filter: ReviewFilter;
  /** 1-based index of this question within the filter, in the student's order (shownAs), e.g. { index: 2, of: 11 } */
  position: { index: number; of: number };
  /** Paper numbers (n, the route key) of the neighbours within the filter in the student's order; null at the ends */
  prevN: number | null;
  nextN: number | null;
  item: ReviewQuestion;
}

// ---------------------------------------------------------------------------------------------
// POST /tests/test/submit (unchanged; M2 adds fields, removes none)
// ---------------------------------------------------------------------------------------------

export interface SubmitResponseData {
  /** Present only when the result is visible right now (unchanged) */
  totalMarks?: number;
  totalTimeTakenInSeconds: number;
  resultVisible: boolean;
  resultReason?: string;
  resultAvailableAt?: string;
  /** M2: the submitted test, for /result to forward to /results/:testId */
  testId: string;
  /** M2 */
  receiptId: string;
  /** M2 */
  resultStatus: ResultStatus;
}
