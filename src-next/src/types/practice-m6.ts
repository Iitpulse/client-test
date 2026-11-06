// Practice question shapes for the batch 5 answer types (Student-Practice / Phone-Practice: passage, matrix match).
// The tests service sends only single / multiple / integer practice questions today (services/practice.ts); these
// additions mirror api-ai contracts/m6.ts ReviewQuestionExtras (`set` with the passage, `matrix` rows and columns) so
// the screens can switch to the real payload when it carries them. Until then they come from lib/practice-fixtures.ts.
import type { PracticeCheck, PracticeQuestion, PracticeSet, RichText } from "./m4";

/** { rowId: columnIds } (contracts/m6.ts MatrixAnswer) */
export type MatrixAnswer = Record<string, string[]>;

export interface PracticePassage {
  setId: string;
  /** 0-based place of this question in the passage's questions */
  index: number;
  count: number;
  /** the set's first and last question numbers in this practice set ("Passage for Q6 to Q8") */
  nFrom: number;
  nTo: number;
  passage: { en: RichText; hi: RichText | null };
}

export interface PracticeMatrix {
  rows: Array<{ id: string; en: RichText; hi: RichText | null }>;
  columns: Array<{ id: string; en: RichText; hi: RichText | null }>;
}

export interface PracticeCheckM6 extends PracticeCheck {
  yourAnswer: PracticeCheck["yourAnswer"] & { matrix?: MatrixAnswer };
  correctAnswer: PracticeCheck["correctAnswer"] & { matrix?: MatrixAnswer };
}

export interface PracticeQuestionM6 extends PracticeQuestion {
  set?: PracticePassage | null;
  matrix?: PracticeMatrix | null;
  checked: PracticeCheckM6 | null;
}

export interface PracticeSetM6 extends PracticeSet {
  questions: PracticeQuestionM6[];
}

/** The answer being written, before Check. */
export type PracticeAnswer = { optionIds: string[]; value: string; matrix: MatrixAnswer };
