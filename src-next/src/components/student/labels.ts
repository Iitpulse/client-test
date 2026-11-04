// Board wording for the M2 screens, derived from the contract's fields (types/m2-student.ts).
import type { QuestionCell, QuestionOutcome, TestKind, TestSummary } from "@/types/m2-student";

export function kindLabel(kind: TestKind): string {
  return kind === "full" ? "Full mock" : kind === "sectional" ? "Sectional" : "";
}

/** Marks may be fractional; show at most 2 decimals. */
/** "155", "2.5", "−13" (a true minus sign, as on the boards) */
export function num(n: number): string {
  const s = Number.isInteger(n) ? String(Math.abs(n)) : String(Math.round(Math.abs(n) * 100) / 100);
  return n < 0 && s !== "0" ? `\u2212${s}` : s;
}

/** "+4", "−1" (a true minus sign), "0" */
export function signed(n: number): string {
  if (n > 0) return `+${num(n)}`;
  if (n < 0) return `−${num(-n)}`;
  return "0";
}

/** "75 questions · 180 min · 300 marks" */
export function testMeta(t: Pick<TestSummary, "totalQuestions" | "durationMinutes" | "maxScore">, short = false): string {
  return short
    ? `${t.totalQuestions} Qs · ${t.durationMinutes} min · ${num(t.maxScore)} marks`
    : `${t.totalQuestions} questions · ${t.durationMinutes} min · ${num(t.maxScore)} marks`;
}

/**
 * Two names without the words they share, keeping the last shared word: "JEE Main Mock 11" and "JEE Main Mock 10"
 * become "Mock 11" and "Mock 10" (the boards' "+24 vs Mock 10").
 */
export function shortPair(a: string, b: string): [string, string] {
  const wa = a.split(/\s+/);
  const wb = b.split(/\s+/);
  let i = 0;
  while (i < wa.length - 1 && i < wb.length - 1 && wa[i] === wb[i]) i++;
  const cut = Math.max(0, i - 1);
  return [wa.slice(cut).join(" "), wb.slice(cut).join(" ")];
}

/** Split a title for the red ink underline: the last word, with the word before it when the last is a number. */
export function underlineSplit(name: string): [string, string] {
  const words = name.trim().split(/\s+/);
  if (words.length < 2) return ["", name];
  const take = /^\d+$/.test(words[words.length - 1]!) && words.length > 2 ? 2 : 1;
  return [words.slice(0, -take).join(" ") + " ", words.slice(-take).join(" ")];
}

/**
 * A short axis label for a trend point. TrendPoint carries no shortName (TestSummary does), so: the shortName
 * of a test we already have (lastResult, upcoming), else the API's own rule for tests without a stored one
 * (docs/m2-student-api.md): prefix M (full) / subject initial + S (sectional) / T, plus the last 1–3 digit
 * number in the name; no number -> initials of the first three words.
 */
export function axisLabel(name: string, kind: TestKind | undefined, subject: string | undefined): string {
  const m = name.match(/(\d{1,3})(?!.*\d)/);
  if (!m) return name.split(/\s+/).slice(0, 3).map((w) => w[0]?.toUpperCase() ?? "").join("");
  const prefix = kind === "full" ? "M" : kind === "sectional" ? `${(subject ?? "")[0]?.toUpperCase() ?? ""}S` : "T";
  return `${prefix}${m[1]}`;
}

export const OUTCOME_LABEL: Record<QuestionOutcome, string> = { correct: "Correct", partial: "Partial", wrong: "Wrong", skipped: "Skipped" };
export const OUTCOME_BADGE: Record<QuestionOutcome, string> = { correct: "b-green", partial: "b-amber", wrong: "b-wrong", skipped: "b-grey" };

/** "Wrong · −1", "Correct · +4", "Skipped · 0" */
export function outcomeText(cell: Pick<QuestionCell, "outcome" | "marks">): string {
  return `${OUTCOME_LABEL[cell.outcome]} · ${signed(cell.marks)}`;
}

/** API sentences may come without a full stop; end them with one before another sentence follows. */
export function sentence(s: string): string {
  const t = s.trim();
  return /[.!?]$/.test(t) ? t : `${t}.`;
}
