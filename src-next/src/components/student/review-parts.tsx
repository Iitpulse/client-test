"use client";

import "katex/dist/katex.min.css"; // equations (MathText)
import Link from "next/link";
import { useState } from "react";
import { MathText } from "@iitpulse/ui";
import { dayMonth, dowDayMonth } from "@/lib/time";
import type { QuestionCell, QuestionOutcome, QuestionType, ReviewQuestion } from "@/types/m2-student";
import type { AnswerKeyM6, MarkingM6, ReviewMatrix, ReviewSet, StudentKeyCorrectionNote } from "@/types/m6-review";
import { num, signed } from "./labels";

/**
 * M6 Student-Review / Phone-Review parts: type label, status, marking rule (from `marking`), the "Key corrected" note
 * (from `keyCorrection`), the paragraph passage with its set's questions, the numerical answer boxes with the accepted
 * range and the matrix grid (your matches against the key, ✓ / ✗ per cell, the result per row). Copy from the board.
 */

export type Lang = "en" | "hi";

/** The text in the chosen language, falling back to English where there is no Hindi text. */
export const pick = (t: { en: string | null; hi: string | null }, lang: Lang) => (lang === "hi" && t.hi ? t.hi : t.en) || "";

// ---------------------------------------------------------------------------------------------
// Labels
// ---------------------------------------------------------------------------------------------

type OwnType = Exclude<QuestionType, "paragraph">;

/** The question's own type: a paragraph child (or an older server's "paragraph") is read from its options and key. */
export function ownType(q: Pick<ReviewQuestion, "type" | "options" | "correctAnswer">): OwnType {
  if (q.type !== "paragraph") return q.type;
  if (q.options.length === 0) return "integer";
  return q.correctAnswer.optionIds.length > 1 ? "multiple" : "single";
}

const TYPE_LABEL: Record<OwnType, string> = { single: "Single correct", multiple: "One or more correct", integer: "Numerical answer", matrix: "Match the lists" };

/** "Single correct", "One or more correct", "Numerical answer", "Match the lists", "Passage · single correct" */
export function typeLabel(q: Pick<ReviewQuestion, "type" | "options" | "correctAnswer">, inSet: boolean): string {
  const t = TYPE_LABEL[ownType(q)];
  return inSet || q.type === "paragraph" ? `Passage · ${t.toLowerCase()}` : t;
}

const STATUS: Record<QuestionOutcome, string> = { correct: "Correct", partial: "Partly correct", wrong: "Wrong", skipped: "Skipped" };
const STATUS_BADGE: Record<QuestionOutcome, string> = { correct: "b-green", partial: "b-amber", wrong: "b-wrong", skipped: "b-grey" };
/** Board legend and kid labels: "Partly" */
export const OUTCOME_SHORT: Record<QuestionOutcome, string> = { correct: "Correct", partial: "Partly", wrong: "Wrong", skipped: "Skipped" };

/** "Wrong · −1", "Partly correct · +2", "Correct · +4", "Skipped · 0" */
export function reviewStatus(cell: Pick<QuestionCell, "outcome" | "marks">): string {
  return `${STATUS[cell.outcome]} · ${signed(cell.marks)}`;
}
export function statusBadge(o: QuestionOutcome): string {
  return STATUS_BADGE[o];
}

// ---------------------------------------------------------------------------------------------
// Marking rule (multiple correct, matrix)
// ---------------------------------------------------------------------------------------------

/** Marks per item when the partial levels grow by the same step (1 → +1, 2 → +2, 3 → +3), else null. */
function perItem(m: MarkingM6): number | null {
  if (!m.partial.length) return null;
  const k = m.partial[0]!.marks / m.partial[0]!.count;
  return k > 0 && m.partial.every((p) => Math.abs(p.marks - p.count * k) < 1e-9) ? k : null;
}

function levels(m: MarkingM6, what: string): string {
  return [...m.partial].sort((a, b) => a.count - b.count).map((p) => `${signed(p.marks)} for ${p.count} ${what}${p.count === 1 ? "" : "s"}`).join(", ");
}

/**
 * The board's rule line under the stem, built from `marking`:
 * "Marking: +4 if you pick every correct option and nothing wrong · +1 for each correct option you pick, if none of
 * your picks is wrong · −2 if any pick is wrong." / "Each row is marked on its own in this test: +1 for a right row,
 * 0 for a wrong or empty one." Single and numerical questions have none.
 */
export function markingRule(type: OwnType, m: MarkingM6 | null): string | null {
  if (!m || m.correct <= 0) return null;
  const k = perItem(m);
  if (type === "multiple") {
    const parts = [`${signed(m.correct)} if you pick every correct option and nothing wrong`];
    if (m.partial.length) parts.push(k !== null ? `${signed(k)} for each correct option you pick, if none of your picks is wrong` : `${levels(m, "correct option")}, if none of your picks is wrong`);
    if (m.incorrect < 0) parts.push(`${signed(m.incorrect)} if any pick is wrong`);
    return `Marking: ${parts.join(" · ")}.`;
  }
  if (type === "matrix") {
    if (k !== null && m.incorrect === 0) return `Each row is marked on its own in this test: ${signed(k)} for a right row, 0 for a wrong or empty one.`;
    const parts = [`${signed(m.correct)} if every row is right`];
    if (m.partial.length) parts.push(k !== null ? `${signed(k)} for each right row, if no row is wrong` : `${levels(m, "right row")}, if no row is wrong`);
    if (m.incorrect < 0) parts.push(`${signed(m.incorrect)} if any row is wrong`);
    return `Marking: ${parts.join(" · ")}.`;
  }
  return null;
}

// ---------------------------------------------------------------------------------------------
// Key corrected
// ---------------------------------------------------------------------------------------------

/** "A", "A and C", "A, B and D" */
function list(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

function lettersOf(ids: string[] | undefined, q: ReviewQuestion): string[] {
  return (ids ?? []).map((id) => q.options.find((o) => o.id === id)?.key ?? "?").sort();
}

const rangeText = (r: { from: number; to: number }, dash = false) => (r.from === r.to ? num(r.from) : dash ? `${num(r.from)}–${num(r.to)}` : `${num(r.from)} to ${num(r.to)}`);

function changedRows(oldKey: AnswerKeyM6, newKey: AnswerKeyM6): Array<[string, string[]]> {
  const o = oldKey.matches ?? {};
  const n = newKey.matches ?? {};
  const rows = [...new Set([...Object.keys(o), ...Object.keys(n)])].sort();
  const same = (a: string[] = [], b: string[] = []) => a.length === b.length && [...a].sort().join() === [...b].sort().join();
  return rows.filter((r) => !same(o[r], n[r])).map((r) => [r, [...(n[r] ?? [])].sort()]);
}

/** What changed in the key, long ("The answer is A, not C as first marked.") or short ("Answer is A, not C."). */
function keySentence(note: StudentKeyCorrectionNote, q: ReviewQuestion, short: boolean): string {
  const { oldKey, newKey } = note;
  if (note.mode === "drop") return short ? "Question dropped." : "This question was dropped from the paper.";
  if (newKey.matches) {
    const rows = changedRows(oldKey, newKey);
    if (!rows.length) return short ? "Key corrected." : "The answer key for this question was corrected.";
    if (short) return `${rows.length === 1 ? "Row" : "Rows"} ${list(rows.map(([r]) => r))} re-keyed.`;
    return `${rows.map(([r, cols]) => `Row ${r} was re-keyed to ${cols.length ? list(cols) : "no match"}`).join("; ")}.`;
  }
  if (newKey.range) {
    const o = oldKey.range;
    const n = newKey.range;
    if (o && n.from <= o.from && n.to >= o.to) return short ? `Range widened to ${rangeText(n, true)}.` : `The accepted range was widened to ${rangeText(n)}.`;
    return short ? `Answer is ${rangeText(n, true)}${o ? `, not ${rangeText(o, true)}` : ""}.` : `The accepted answer is now ${rangeText(n)}${o ? `, not ${rangeText(o)} as first marked` : ""}.`;
  }
  const oldL = lettersOf(oldKey.optionIds, q);
  const newL = lettersOf(newKey.optionIds, q);
  const added = newL.filter((l) => !oldL.includes(l));
  const removed = oldL.filter((l) => !newL.includes(l));
  if (added.length && (note.mode === "acceptAlso" || !removed.length)) {
    if (short) return `${list(added)} ${added.length === 1 ? "was" : "were"} added to the key.`;
    return `${added.length === 1 ? "Option" : "Options"} ${list(added)} ${added.length === 1 ? "was" : "were"} added to the key.`;
  }
  if (!newL.length) return short ? "Key corrected." : "The answer key for this question was corrected.";
  return short ? `Answer is ${list(newL)}, not ${list(oldL)}.` : `The answer is ${list(newL)}, not ${list(oldL)} as first marked.`;
}

/** The board's long note: what changed, this question's marks before → after, the score (and rank) before → after. */
export function keyCorrectionText(note: StudentKeyCorrectionNote, q: ReviewQuestion): string {
  const parts = [keySentence(note, q, false)];
  const { before, after } = note.yourMarks;
  if (before !== after) {
    const yours = lettersOf(q.yourAnswer.optionIds, q);
    parts.push(
      yours.length && q.options.length
        ? `You answered ${list(yours)}, so this question now gives you ${signed(after)} instead of ${signed(before)}.`
        : `This question now gives you ${signed(after)} instead of ${signed(before)}.`
    );
  } else parts.push(`Your marks for this question were recalculated: still ${signed(after)}.`);
  const s = note.yourScore;
  if (s.before !== s.after) {
    const r = note.yourRank;
    const rank = r.before !== null && r.after !== null && r.before !== r.after ? ` and your rank from ${r.before} to ${r.after}` : "";
    parts.push(`Your score went from ${num(s.before)} to ${num(s.after)}${rank}.`);
  }
  return parts.join(" ");
}

/** The phone's short note: "Answer is A, not C. You get +4 now; score 243 → 248." */
export function keyCorrectionShort(note: StudentKeyCorrectionNote, q: ReviewQuestion): string {
  const { before, after } = note.yourMarks;
  const marks = before !== after ? `You get ${signed(after)} now` : `Your marks stay ${signed(after)}`;
  const s = note.yourScore;
  return `${keySentence(note, q, true)} ${marks}${s.before !== s.after ? `; score ${num(s.before)} → ${num(s.after)}` : ""}.`;
}

function PenIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00007E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="mt-0.5 flex-none">
      <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
    </svg>
  );
}

/** "Answer key corrected on Wed 4 Nov. …" (desktop) / "Key corrected on 4 Nov. …" (phone) */
export function KeyCorrectedNote({ note, q, compact }: { note: StudentKeyCorrectionNote; q: ReviewQuestion; compact?: boolean }) {
  return (
    <div className="kc-note" role="note">
      {!compact && <PenIcon />}
      <span>
        <b>{compact ? `Key corrected on ${dayMonth(note.correctedAt)}.` : `Answer key corrected on ${dowDayMonth(note.correctedAt)}.`}</b>{" "}
        {compact ? keyCorrectionShort(note, q) : keyCorrectionText(note, q)}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Paragraph: the passage and its set's questions
// ---------------------------------------------------------------------------------------------

/** The cells of the set (paper numbers nFrom…nTo), in paper order. */
export function setCells(set: ReviewSet, cells: QuestionCell[]): QuestionCell[] {
  return cells.filter((c) => c.n >= set.nFrom && c.n <= set.nTo).sort((a, b) => a.n - b.n);
}

/** "Passage for Q31 to Q33" with Hide passage (desktop); "Passage · Q31 to Q33" (phone). */
export function PassageBlock({ set, lang, labelOf, compact }: { set: ReviewSet; lang: Lang; labelOf: (n: number) => number; compact?: boolean }) {
  const [hidden, setHidden] = useState(false);
  const from = labelOf(set.nFrom);
  const to = labelOf(set.nTo);
  if (compact)
    return (
      <div className="passage px-3 py-2.5">
        <span className="xs font-semibold text-primary">
          Passage · Q{from} to Q{to}
        </span>
        <MathText html as="div" className="q-stem passage-text" text={pick(set.passage, lang)} />
      </div>
    );
  return (
    <div className="passage">
      <div className="row between gap-2">
        <span className="xs font-semibold text-primary">
          Passage for Q{from} to Q{to}
        </span>
        <button type="button" className="btn btn-ghost btn-sm" aria-expanded={!hidden} onClick={() => setHidden((v) => !v)}>
          {hidden ? "Show passage" : "Hide passage"}
        </button>
      </div>
      {!hidden && <MathText html as="div" className="q-stem" text={pick(set.passage, lang)} />}
    </div>
  );
}

/** The set's questions as tabs: "● Q31 · Correct" (desktop, `onPick`) or "● Q31" links (phone, `hrefOf`). */
export function SetKids({
  kids,
  current,
  onPick,
  hrefOf,
}: {
  kids: QuestionCell[];
  current: number;
  onPick?: (n: number) => void;
  hrefOf?: (n: number) => string;
}) {
  if (kids.length < 2) return null;
  return (
    <div className="rv-kids" role="tablist" aria-label="Questions on this passage">
      {kids.map((k) => {
        const on = k.n === current;
        const dot = <span className={`dot ${k.outcome}`} aria-hidden="true" />;
        if (hrefOf)
          return (
            <Link key={k.n} href={hrefOf(k.n)} replace scroll={false} role="tab" aria-selected={on} className={`rv-kid h-11${on ? " on" : ""}`} aria-label={`Question ${k.shownAs}, ${k.outcome}`}>
              {dot}Q{k.shownAs}
            </Link>
          );
        return (
          <button key={k.n} type="button" role="tab" aria-selected={on} className={`rv-kid${on ? " on" : ""}`} onClick={() => onPick?.(k.n)}>
            {dot}Q{k.shownAs} · {OUTCOME_SHORT[k.outcome]}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Numerical: your answer and the accepted range
// ---------------------------------------------------------------------------------------------

export function NumericalAnswer({ q, compact }: { q: ReviewQuestion; compact?: boolean }) {
  const v = q.yourAnswer.value;
  const range = q.correctAnswer.range;
  const right = q.outcome === "correct" || q.outcome === "partial";
  const mine = v === null ? "" : right ? "key" : "mine";
  const color = v === null ? "text-muted" : right ? "text-[var(--green)]" : "text-[var(--red-600)]";
  if (compact)
    return (
      <div className="ansrow">
        <div className={`ansbox ${mine}`}>
          <span className={`xs font-semibold ${color}`}>Your answer · {v === null ? "not answered" : num(v)}</span>
        </div>
        {range && (
          <div className="ansbox key">
            <span className="xs font-semibold text-[var(--green)]">Accepted · {rangeText(range)}</span>
          </div>
        )}
      </div>
    );
  return (
    <div className="ansrow">
      <div className={`ansbox ${mine}`}>
        <span className={`xs font-semibold ${color}`}>Your answer</span>
        {v === null ? <span className="sm muted">Not answered</span> : <span className="num ans-v">{num(v)}</span>}
        {v !== null && !right && range && <span className="xs muted">Outside the accepted range</span>}
      </div>
      {range && (
        <div className="ansbox key">
          <span className="xs font-semibold text-[var(--green)]">Accepted answer</span>
          <span className="num ans-v">{rangeText(range)}</span>
          {range.from !== range.to && (
            <span className="xs muted">
              Anything from {num(range.from)} to {num(range.to)} was marked correct
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Matrix: your matches against the key
// ---------------------------------------------------------------------------------------------

function Tick() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}
function Cross() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

/** The result per row: "+1" / "Wrong · 0" / "Empty · 0" when each row is marked on its own, else Right / Wrong / Empty. */
function rowResult(o: "right" | "wrong" | "blank", m: MarkingM6 | null): { text: string; cls: string } {
  const k = m ? perItem(m) : null;
  const own = k !== null && m!.incorrect === 0;
  if (o === "right") return { text: own ? signed(k!) : "Right", cls: "text-[var(--green)]" };
  if (o === "blank") return { text: own ? "Empty · 0" : "Empty", cls: "text-muted" };
  return { text: own ? "Wrong · 0" : "Wrong", cls: "text-[var(--red-600)]" };
}

export function MatrixReview({ matrix, marking, lang, compact }: { matrix: ReviewMatrix; marking: MarkingM6 | null; lang: Lang; compact?: boolean }) {
  const has = (a: Record<string, string[]>, r: string, c: string) => (a[r] ?? []).includes(c);
  const outcome = (r: string): "right" | "wrong" | "blank" => {
    const o = matrix.rowOutcomes[r];
    if (o) return o;
    const mine = matrix.yours[r] ?? [];
    if (!mine.length) return "blank";
    const key = matrix.key[r] ?? [];
    return mine.length === key.length && mine.every((c) => key.includes(c)) ? "right" : "wrong";
  };
  const table = (
    <table className="rv-mx" aria-label="Your matches against the key">
      <thead>
        <tr>
          <th scope="col" className="rh">
            {compact ? "I \\ II" : "List I"}
          </th>
          {matrix.columns.map((c) => (
            <th key={c.id} scope="col">
              {c.id}
            </th>
          ))}
          {!compact && (
            <th scope="col">
              <span className="sr-only">Result</span>
            </th>
          )}
        </tr>
      </thead>
      <tbody>
        {matrix.rows.map((r) => {
          const res = rowResult(outcome(r.id), marking);
          return (
            <tr key={r.id}>
              <th scope="row" className="rh">
                {compact ? (
                  r.id
                ) : (
                  <span className="row gap-2">
                    <span>{r.id}</span>
                    <MathText html className="rv-mx-label" text={pick(r, lang)} />
                  </span>
                )}
              </th>
              {matrix.columns.map((c) => {
                const isKey = has(matrix.key, r.id, c.id);
                const isMine = has(matrix.yours, r.id, c.id);
                const cls = isKey && isMine ? "hit" : isMine ? "bad" : isKey ? "miss" : "";
                const label = `${c.id}${isKey && isMine ? ": your match, right" : isMine ? ": your match, wrong" : isKey ? ": right match" : ""}`;
                return (
                  <td key={c.id}>
                    <span className={`rv-mc ${cls}`} role="img" aria-label={label}>
                      {isKey && <Tick />}
                      {isMine && !isKey && <Cross />}
                    </span>
                  </td>
                );
              })}
              {!compact && (
                <td>
                  <span className={`rv-rowres ${res.cls}`}>{res.text}</span>
                </td>
              )}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
  if (compact) return <div className="max-w-full overflow-x-auto">{table}</div>;
  return (
    <>
      <div className="row wrap items-start gap-6">
        <div className="col sm min-w-[200px] gap-1">
          <span className="xs muted font-semibold">List II</span>
          {matrix.columns.map((c) => (
            <span key={c.id} className="row gap-2">
              <span className="q-stem">{c.id}</span>
              <MathText html className="q-stem" text={pick(c, lang)} />
            </span>
          ))}
        </div>
        <div className="max-w-full overflow-x-auto">{table}</div>
      </div>
      <div className="row wrap xs muted gap-3.5">
        <span className="row gap-1.5">
          <span className="rv-mc hit rv-mc-key" />
          Your match, right
        </span>
        <span className="row gap-1.5">
          <span className="rv-mc bad rv-mc-key" />
          Your match, wrong
        </span>
        <span className="row gap-1.5">
          <span className="rv-mc miss rv-mc-key" />
          Right match you didn&apos;t mark
        </span>
      </div>
    </>
  );
}
