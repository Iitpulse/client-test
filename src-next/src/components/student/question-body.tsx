"use client";

import { MathText } from "@iitpulse/ui";
import type { QuestionCell, ReviewQuestion } from "@/types/m2-student";
import { num } from "./labels";

export type Lang = "en" | "hi";

/**
 * The number a student knows a question by: the position they saw it at in the exam (`shownAs`), else the paper's.
 * QuestionCell has no shownAs in the M2 contract; when the API adds it, it is used without a change here.
 */
export function shownNumber(cell: QuestionCell & { shownAs?: number | null }, known?: Map<number, number>): number {
  return cell.shownAs ?? known?.get(cell.n) ?? cell.n;
}

/** n -> shownAs from loaded review questions */
export function numberingFrom(items: ReviewQuestion[] | undefined): Map<number, number> {
  const m = new Map<number, number>();
  for (const q of items ?? []) if (q.shownAs != null) m.set(q.n, q.shownAs);
  return m;
}

/** The question in the chosen language, falling back to English where there is no Hindi text. */
const pick = (t: { en: string | null; hi: string | null }, lang: Lang) => (lang === "hi" && t.hi ? t.hi : t.en) || "";

/** Stem and answer options of a reviewed question (Student-Result pane, Phone-Review). Equations: KaTeX. */
export function QuestionBody({ q, lang, compact }: { q: ReviewQuestion; lang: Lang; compact?: boolean }) {
  const yours = new Set(q.yourAnswer.optionIds);
  return (
    <>
      <MathText html as="div" className={compact ? "q-stem card fade px-4 py-3.5" : "q-stem"} text={pick(q.stem, lang)} />
      {q.options.length > 0 ? (
        <div className={compact ? "col gap-3" : "col gap-2.5"} role="list" aria-label="Options">
          {q.options.map((o, i) => {
            const mine = yours.has(o.id) || o.isYours;
            const cls = o.isCorrect ? "opt correct" : mine ? "opt wrong" : "opt";
            const tag = o.isCorrect ? (mine ? "Your answer · correct" : compact ? "Correct" : "Correct answer") : mine ? (compact ? "You" : "Your answer") : null;
            return (
              <div key={o.id} role="listitem" className={`${cls} rise items-center${compact ? " px-3 py-2.5" : ""}`} style={{ "--i": i } as React.CSSProperties}>
                <span className="key">{o.key}</span>
                <MathText html as="div" className="q-stem grow min-w-0" text={pick(o.text, lang)} />
                {tag && <span className={`badge ${o.isCorrect ? "b-green" : "b-wrong"}`}>{tag}</span>}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="col gap-2.5">
          <div className={`opt ${q.outcome === "correct" ? "correct" : q.yourAnswer.value === null ? "" : "wrong"} items-center`}>
            <span className="sm grow">Your answer</span>
            <span className="num font-semibold">{q.yourAnswer.value === null ? "Not answered" : num(q.yourAnswer.value)}</span>
          </div>
          {q.correctAnswer.range && (
            <div className="opt correct items-center">
              <span className="sm grow">Correct answer</span>
              <span className="num font-semibold">
                {q.correctAnswer.range.from === q.correctAnswer.range.to
                  ? num(q.correctAnswer.range.from)
                  : `${num(q.correctAnswer.range.from)} to ${num(q.correctAnswer.range.to)}`}
              </span>
            </div>
          )}
        </div>
      )}
    </>
  );
}

/** The institute's worked solution (not AI). */
export function Solution({ q, lang, className }: { q: ReviewQuestion; lang: Lang; className?: string }) {
  const text = pick(q.solution, lang);
  if (!text) return null;
  return (
    <section className={`card col fade gap-2 p-4 ${className ?? ""}`} aria-label="Solution">
      <span className="eyebrow">Solution</span>
      <MathText html as="div" className="q-stem" text={text} />
    </section>
  );
}

/** "हिंदी / English" switch, shown only when the question has Hindi text. */
export function LangToggle({ q, lang, onChange }: { q: ReviewQuestion; lang: Lang; onChange: (l: Lang) => void }) {
  if (!q.stem.hi) return null;
  return (
    <button type="button" className="btn btn-ghost btn-sm" onClick={() => onChange(lang === "hi" ? "en" : "hi")} aria-pressed={lang === "hi"}>
      {lang === "hi" ? "English" : <span lang="hi">हिंदी</span>}
    </button>
  );
}
