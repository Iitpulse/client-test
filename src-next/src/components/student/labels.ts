// Board wording for the M2 screens, derived from the contract's fields (types/m2-student.ts).
import type { QuestionCell, QuestionOutcome, TestCard, TestKind, TestSummary } from "@/types/m2-student";
import { dayMonth, daysFrom, relativeDayTime } from "@/lib/time";

/** The boards write "Maths" for the "Mathematics" section. */
export function subjectLabel(subject: string): string {
  return subject === "Mathematics" ? "Maths" : subject;
}

export function kindLabel(kind: TestKind): string {
  return kind === "full_mock" ? "Full mock" : kind === "sectional" ? "Sectional" : "";
}

/** Marks may be fractional; show at most 2 decimals. */
export function num(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100);
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

/** A short axis label for a trend point: "JEE Main Mock 11" -> "M11"; no number -> the first word. */
export function axisLabel(name: string): string {
  const m = name.match(/(\p{L})\p{L}*\s+(\d+)\s*$/u);
  return m ? `${m[1]!.toUpperCase()}${m[2]}` : name.split(/\s+/)[0]!.slice(0, 6);
}

export const OUTCOME_LABEL: Record<QuestionOutcome, string> = { correct: "Correct", partial: "Partial", wrong: "Wrong", skipped: "Skipped" };
export const OUTCOME_BADGE: Record<QuestionOutcome, string> = { correct: "b-green", partial: "b-amber", wrong: "b-wrong", skipped: "b-grey" };

/** "Wrong · −1", "Correct · +4", "Skipped · 0" */
export function outcomeText(cell: Pick<QuestionCell, "outcome" | "marks">): string {
  return `${OUTCOME_LABEL[cell.outcome]} · ${signed(cell.marks)}`;
}

/** The status badge of a test card (Student-Tests and Phone-Tests). */
export function cardBadge(t: TestCard, now: number, phone = false): { text: string; cls: string } {
  switch (t.state) {
    case "live":
      return { text: "Live now", cls: "b-live" };
    case "in_progress":
      return { text: "In progress", cls: "b-live" };
    case "upcoming": {
      const d = daysFrom(now, t.opensAt);
      if (phone) return { text: d === 0 ? "Today" : d === 1 ? "Tomorrow" : dayMonth(t.opensAt), cls: "b-navy" };
      return { text: d === 0 ? "Opens today" : d === 1 ? "Tomorrow" : `In ${d} days`, cls: "b-navy" };
    }
    case "ended":
      return { text: "Missed", cls: "b-grey" };
    case "submitted": {
      const v = t.result?.visibility;
      const h = t.result?.headline;
      if (v?.status === "published" && h) return { text: phone ? `${num(h.score)}/${num(h.maxScore)}` : "Result out", cls: "b-green" };
      if (v?.status === "pending")
        return v.availableAt ? { text: `Result ${phone ? "" : "on "}${dayMonth(v.availableAt)}`, cls: "b-amber" } : { text: "Result pending", cls: "b-amber" };
      return { text: "Result not shared", cls: "b-grey" };
    }
  }
}

/** "Ends today, 9:00 PM" / "Sun 15 Nov, 10:00 AM" / "Taken 1 Nov" */
export function cardWhen(t: TestCard, now: number): string {
  if (t.state === "live") return `Ends ${relativeDayTime(now, t.closesAt)}`;
  if (t.state === "in_progress" && t.attempt) return `Time up ${relativeDayTime(now, t.attempt.expiresAt)}`;
  if (t.state === "upcoming") {
    const s = relativeDayTime(now, t.opensAt);
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  if (t.state === "submitted" && t.submittedAt) return `Taken ${dayMonth(t.submittedAt)}`;
  return `Closed ${dayMonth(t.closesAt)}`;
}
