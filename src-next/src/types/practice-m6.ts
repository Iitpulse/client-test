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

/**
 * Batch 7: redo and revision sets (api-tests) send a paragraph child's passage as `passage {en, hi}` and a matrix key
 * as `correctAnswer.matches`; the screens read `set` (passage with its place) and `correctAnswer.matrix`. This maps
 * one onto the other (consecutive questions with the same passage form one set). Bank sets pass through unchanged.
 */
export function normalizePracticeSet<S extends PracticeSet>(set: S): S {
  const qs = set.questions as Array<PracticeQuestionM6 & { passage?: { en: RichText; hi: RichText | null } | null }>;
  const out = qs.map((q) => ({ ...q, checked: q.checked ? normalizeCheck(q.checked) : q.checked }));
  for (let i = 0; i < out.length; ) {
    const p = out[i]!.passage;
    if (!p || out[i]!.set) {
      i++;
      continue;
    }
    let j = i;
    while (j + 1 < out.length && out[j + 1]!.passage && out[j + 1]!.passage!.en === p.en) j++;
    const setId = `p${out[i]!.n}`;
    for (let k = i; k <= j; k++) out[k] = { ...out[k]!, set: { setId, index: k - i, count: j - i + 1, nFrom: out[i]!.n, nTo: out[j]!.n, passage: p } };
    i = j + 1;
  }
  return { ...set, questions: out };
}

export function normalizeCheck<C extends PracticeCheck>(c: C): C {
  const ca = c.correctAnswer as PracticeCheckM6["correctAnswer"] & { matches?: MatrixAnswer };
  if (ca && ca.matches && !ca.matrix) return { ...c, correctAnswer: { ...ca, matrix: ca.matches } };
  return c;
}
