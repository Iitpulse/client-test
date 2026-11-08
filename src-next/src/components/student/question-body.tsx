"use client";

import "katex/dist/katex.min.css"; // equations (MathText)
import { MathText } from "@iitpulse/ui";
import type { ReviewQuestion } from "@/types/m2-student";
import { reviewExtras } from "@/types/m6-review";
import { markingRule, MatrixReview, NumericalAnswer, ownType, pick, type Lang } from "./review-parts";
import { LibrarySource } from "./library-source";

export type { Lang } from "./review-parts";

/**
 * Stem and answer of a reviewed question (Student-Review pane, Phone-Review). Equations: KaTeX (MathText).
 * By type (M6 `ReviewQuestionExtras`, read per response): options with the board's tags (multiple correct: "Your pick ·
 * correct", "Correct · you missed it"), the marking rule line (multiple correct, matrix; desktop), the numerical answer
 * boxes with the accepted range, the matrix grid. The passage of a paragraph set is drawn by the caller, above.
 */
export function QuestionBody({ q, lang, compact }: { q: ReviewQuestion; lang: Lang; compact?: boolean }) {
  const x = reviewExtras(q);
  const type = ownType(q);
  const rule = compact ? null : markingRule(x.matrix ? "matrix" : type, x.marking);
  const yours = new Set(q.yourAnswer.optionIds);
  const multi = type === "multiple";
  return (
    <>
      <MathText html as="div" className={compact ? "q-stem card fade px-4 py-3.5" : "q-stem"} text={pick(q.stem, lang)} />
      {rule && <span className="xs muted">{rule}</span>}
      {x.matrix ? (
        <MatrixReview matrix={x.matrix} marking={x.marking} lang={lang} compact={compact} />
      ) : q.options.length > 0 ? (
        <div className={compact ? "col gap-2" : "col gap-2.5"} role="list" aria-label="Options">
          {q.options.map((o, i) => {
            const mine = yours.has(o.id) || o.isYours;
            const cls = o.isCorrect ? "opt correct" : mine ? "opt wrong" : "opt";
            const t = optionTag(o.isCorrect, mine, multi, !!compact);
            return (
              <div key={o.id} role="listitem" className={`${cls} rise items-center${compact ? " px-3 py-2.5" : ""}`} style={{ "--i": i } as React.CSSProperties}>
                <span className="key">{o.key}</span>
                <MathText html as="div" className="q-stem grow min-w-0" text={pick(o.text, lang)} />
                {t && <span className={`badge flex-none ${t.cls}`}>{t.text}</span>}
              </div>
            );
          })}
        </div>
      ) : (
        <NumericalAnswer q={q} compact={compact} />
      )}
      <LibrarySource source={q.librarySource} />
    </>
  );
}

/** The board's option tags: desktop in full, phone short ("Yours · right", "Answer", "Missed", "Yours"). */
function optionTag(correct: boolean, mine: boolean, multi: boolean, short: boolean): { text: string; cls: string } | null {
  if (correct && mine) return { text: short ? "Yours · right" : multi ? "Your pick · correct" : "Your answer · correct", cls: "b-green" };
  if (correct) return multi ? { text: short ? "Missed" : "Correct · you missed it", cls: "b-amber" } : { text: short ? "Answer" : "Correct answer", cls: "b-green" };
  if (mine) return { text: short ? "Yours" : "Your answer", cls: "b-wrong" };
  return null;
}

/** The institute's worked solution (not AI): "Official solution" under the question (desktop), a card (phone). */
export function Solution({ q, lang, className, flat }: { q: ReviewQuestion; lang: Lang; className?: string; flat?: boolean }) {
  const text = pick(q.solution, lang);
  if (!text) return null;
  if (flat)
    return (
      <section className={`sol ${className ?? ""}`} aria-label="Official solution">
        <span className="sm font-semibold">Official solution</span>
        <MathText html as="div" className="q-stem" text={text} />
      </section>
    );
  return (
    <section className={`card col fade gap-2 p-4 ${className ?? ""}`} aria-label="Solution">
      <span className="eyebrow">Official solution</span>
      <MathText html as="div" className="q-stem" text={text} />
    </section>
  );
}

const hasHindi = (q: ReviewQuestion) => !!q.stem.hi;

/** "हिंदी / English" switch, shown only when the question has Hindi text (phone). */
export function LangToggle({ q, lang, onChange }: { q: ReviewQuestion; lang: Lang; onChange: (l: Lang) => void }) {
  if (!hasHindi(q)) return null;
  return (
    <button type="button" className="btn btn-ghost btn-sm" onClick={() => onChange(lang === "hi" ? "en" : "hi")} aria-pressed={lang === "hi"}>
      {lang === "hi" ? "English" : <span lang="hi">हिंदी</span>}
    </button>
  );
}

/** The board's "EN | हि" segmented switch (desktop), shown only when the question has Hindi text. */
export function LangSeg({ q, lang, onChange }: { q: ReviewQuestion; lang: Lang; onChange: (l: Lang) => void }) {
  if (!hasHindi(q)) return null;
  return (
    <span className="seg" role="radiogroup" aria-label="Question language">
      <button type="button" className={lang === "en" ? "tab on" : "tab"} role="radio" aria-checked={lang === "en"} onClick={() => onChange("en")}>
        EN
      </button>
      <button type="button" className={lang === "hi" ? "tab on" : "tab"} role="radio" aria-checked={lang === "hi"} onClick={() => onChange("hi")} lang="hi">
        हि
      </button>
    </span>
  );
}
