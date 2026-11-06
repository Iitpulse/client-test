// M6 (batches 4/5) additions to the M2 review routes (GET /tests/student/results/:testId/questions[/:n]) for
// Student-Review / Phone-Review. Copied from Iitpulse/api-ai src/contracts/m6.ts (`ReviewQuestionExtras`,
// `StudentKeyCorrectionNote`, `Marking`, `AnswerKey`, `MatrixAnswer`); that file is binding. tests flattens the
// extras into each review question (its `type` is the cell's own `type`). Older servers send none of them, so read
// them through `reviewExtras()`, which checks per response.
import type { IsoDateTime, ReviewQuestion, RichText } from "./m2-student";

/** matrix: row id → column ids */
export type MatrixAnswer = Record<string, string[]>;

export interface AnswerKeyM6 {
  optionIds?: string[];
  range?: { from: number; to: number };
  /** matrix: row id → column ids */
  matches?: Record<string, string[]>;
}

export interface MarkingM6 {
  /** all correct / all rows right */
  correct: number;
  /** ≤ 0; any wrong option / any wrong row / wrong answer */
  incorrect: number;
  partial: Array<{ count: number; marks: number }>;
}

/** "Key corrected for Qn": old → new key, this student's marks and score before → after */
export interface StudentKeyCorrectionNote {
  n: number;
  questionId: string;
  correctedAt: IsoDateTime;
  oldKey: AnswerKeyM6;
  newKey: AnswerKeyM6;
  yourMarks: { before: number; after: number };
  mode: "changeKey" | "acceptAlso" | "drop";
  yourScore: { before: number; after: number };
  /** null while the rank is not final */
  yourRank: { before: number | null; after: number | null };
}

export type MatrixRowOutcome = "right" | "wrong" | "blank";

export interface ReviewSet {
  setId: string;
  /** 0-based place of this question in its set */
  index: number;
  count: number;
  /** paper numbers (n) of the set's first and last question */
  nFrom: number;
  nTo: number;
  passage: { en: RichText; hi: RichText | null };
}

export interface ReviewMatrix {
  rows: Array<{ id: string; en: RichText; hi: RichText | null }>;
  columns: Array<{ id: string; en: RichText; hi: RichText | null }>;
  yours: MatrixAnswer;
  key: MatrixAnswer;
  rowOutcomes: Record<string, MatrixRowOutcome>;
}

/** Review question additions (Student-Review): paragraph set, matrix grid, marking rule, key-corrected note */
export interface ReviewQuestionExtras {
  set: ReviewSet | null;
  matrix: ReviewMatrix | null;
  /** the marking rule line as data */
  marking: MarkingM6;
  keyCorrection: StudentKeyCorrectionNote | null;
}

export type ReviewQuestionM6 = ReviewQuestion & Partial<ReviewQuestionExtras>;

/** The M6 extras of a review question, each one null when this server does not send it yet. */
export function reviewExtras(q: ReviewQuestion): { set: ReviewSet | null; matrix: ReviewMatrix | null; marking: MarkingM6 | null; keyCorrection: StudentKeyCorrectionNote | null } {
  const x = q as ReviewQuestionM6;
  return {
    set: x.set && typeof x.set === "object" && typeof x.set.nFrom === "number" ? x.set : null,
    matrix: x.matrix && Array.isArray(x.matrix.rows) && Array.isArray(x.matrix.columns) ? x.matrix : null,
    marking: x.marking && typeof x.marking.correct === "number" && Array.isArray(x.marking.partial) ? x.marking : null,
    keyCorrection: x.keyCorrection && typeof x.keyCorrection.correctedAt === "string" ? x.keyCorrection : null,
  };
}
