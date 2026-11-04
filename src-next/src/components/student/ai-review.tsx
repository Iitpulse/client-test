"use client";

import { AiMark, InkArrow, MathText, Note, SparkleIcon, TypingDots } from "@iitpulse/ui";
import { isAiDown, useAiExplanation, useAiFeedback, useAiSummary } from "@/lib/ai-api";
import { StudentApiError } from "@/lib/student-api";
import { relativeDayTime } from "@/lib/time";
import type { QuestionCell, QuestionOutcome, ReviewQuestion, StudentResult } from "@/types/m2-student";
import type { Explanation, Leak, SummaryResponse } from "@/types/m3-ai";
import { Skel } from "./common";
import { LockIcon } from "./icons";
import { num, sentence } from "./labels";

/**
 * M3: the AI parts of Student-Result ("Your 3 biggest leaks"), Phone-Result ("Where N marks went") and the
 * "Why this happened" panel (desktop question pane, Phone-Review), with "Was this helpful?".
 * From api-ai (lib/ai-api.ts). Shown only where M2 shows the question review (review.available); the API's own
 * gate (AI_NOT_AVAILABLE_YET) is the backstop and looks like M2's "Answers aren't open yet".
 * When the AI is paused, failing or rate limited, the card says so in one calm line; the result and the official
 * solution are untouched. Every AI block carries its label: the summary's caption, "AI explanation" per question.
 *
 * Not in M3 (M4): "Ask a doubt" and the AI tutor chat, the daily question counter, "Add to revision list", the study plan.
 */

const SUMMARY_LABEL = "AI summary · check anything unclear with your teacher";

/** "−10" with a true minus sign */
const lost = (n: number) => `−${num(Math.abs(n))}`;

// ---------------------------------------------------------------------------------------------
// Summary (Student-Result leaks card, Phone-Result "Where N marks went")
// ---------------------------------------------------------------------------------------------

export type SummaryState =
  | { kind: "hidden" }
  | { kind: "loading" }
  | { kind: "late" }
  | { kind: "locked"; message: string; at: string | null }
  | { kind: "quiet"; message: string; retry?: () => void }
  | { kind: "ready"; s: SummaryResponse };

/** The summary's state for both layouts (call once per page: the desktop and phone cards share it). */
export function useSummaryState(data: StudentResult): SummaryState {
  const enabled = data.review.available;
  const { query, late, waiting } = useAiSummary(data.test.id, enabled);
  if (!enabled) return { kind: "hidden" };
  const s = query.data;
  const e = query.error instanceof StudentApiError ? query.error : null;
  if (!s && query.isError) {
    if (e?.code === "AI_NOT_AVAILABLE_YET") return { kind: "locked", message: e.message, at: typeof e.details?.availableAt === "string" ? e.details.availableAt : null };
    if (e && isAiDown(e)) return { kind: "quiet", message: e.message || "AI help is paused right now. Your result and solutions are still here." };
    // Not this student's result any more, or not a student: the page itself says so; the AI card stays out of it.
    if (e && e.status >= 400 && e.status < 500) return { kind: "hidden" };
    return { kind: "quiet", message: "Couldn't load the AI summary.", retry: () => query.refetch() };
  }
  if (!s || waiting) return { kind: "loading" };
  if (s.status === "generating") return late ? { kind: "late" } : { kind: "loading" };
  // Full marks, or no question has an official solution to compare against: nothing to say.
  if (s.status === "not_applicable" || (s.leaks.length === 0 && !s.other)) return { kind: "hidden" };
  return { kind: "ready", s };
}

function leaksHeading(s: SummaryResponse): string {
  const n = s.leaks.length;
  const which = n === 1 ? "Your biggest leak" : `Your ${n} biggest leaks`;
  const part = s.marksExplained >= s.marksLost ? `all ${num(s.marksLost)} marks you lost` : `${num(s.marksExplained)} of the ${num(s.marksLost)} marks you lost`;
  return `${which}: ${part}`;
}

function LockedLine({ message, at, now }: { message: string; at: string | null; now: number }) {
  return (
    <span className="row gap-3">
      <span className="text-muted">
        <LockIcon size={18} />
      </span>
      <span className="sm">
        <b>Answers aren&apos;t open yet.</b> {sentence(message || "Answers and solutions open when the test has closed for everyone")}
        {at ? ` They open ${relativeDayTime(now, at)}.` : ""}
      </span>
    </span>
  );
}

function QuietLine({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <span className="row wrap gap-2">
      <span className="sm muted">{sentence(message)}</span>
      {retry && (
        <button type="button" className="btn btn-ghost btn-sm" onClick={retry}>
          Try again
        </button>
      )}
    </span>
  );
}

/**
 * Student-Result: "Your 3 biggest leaks: 33 of the 52 marks you lost", one column per leak, the first one marked
 * "start here". `onReview` opens a leak's question in the pane below (questionNs are the numbers the student saw).
 */
export function LeaksCard({ st, now, onReview }: { st: SummaryState; now: number; onReview?: (shownAs: number) => void }) {
  if (st.kind === "hidden") return null;
  const style = { "--i": 6 } as React.CSSProperties;
  if (st.kind !== "ready") {
    return (
      <article className="ai pad-lg col rise gap-3.5" style={style} aria-busy={st.kind === "loading"} aria-label="AI summary">
        <div className="row between wrap gap-2">
          <AiMark>Your biggest leaks</AiMark>
          <span className="xs muted">{SUMMARY_LABEL}</span>
        </div>
        <SummaryPlaceholder st={st} now={now} />
      </article>
    );
  }
  const s = st.s;
  return (
    <article className="ai pad-lg col rise gap-3.5" style={style} aria-label="AI summary">
      <div className="row between wrap gap-2">
        <AiMark>{leaksHeading(s)}</AiMark>
        <span className="xs muted">{SUMMARY_LABEL}</span>
      </div>
      <div className="grid grid-cols-3 gap-4 max-lg:grid-cols-1">
        {s.leaks.map((l, i) => (
          <LeakColumn key={`${l.title}-${i}`} leak={l} first={i === 0} onReview={onReview} />
        ))}
      </div>
    </article>
  );
}

function LeakColumn({ leak, first, onReview }: { leak: Leak; first: boolean; onReview?: (shownAs: number) => void }) {
  return (
    <div className="col gap-1.5">
      <div className="row wrap gap-2">
        <MathText className="h3" text={leak.title} />
        <span className="badge b-wrong">{lost(leak.marksLost)} marks</span>
        {first && (
          <>
            <InkArrow delay={1300} style={{ margin: "2px -2px 0 0" }} />
            <Note tone="pen" size="sm" write rotate={-3} delay={1500}>
              start here
            </Note>
          </>
        )}
      </div>
      <MathText className="sm muted" text={leak.note} />
      {onReview && leak.questionNs.length > 0 && (
        <span className="row wrap xs muted gap-x-2 gap-y-1">
          Review
          {leak.questionNs.map((n) => (
            <button key={n} type="button" className="mono font-medium text-primary underline-offset-2 hover:underline" onClick={() => onReview(n)} aria-label={`Review question ${n}`}>
              Q{n}
            </button>
          ))}
        </span>
      )}
    </div>
  );
}

/** Phone-Result: "Where 52 marks went", one line per leak and "Other slips". */
export function MarksWentCard({ st, now }: { st: SummaryState; now: number }) {
  if (st.kind === "hidden") return null;
  const style = { "--i": 2 } as React.CSSProperties;
  if (st.kind !== "ready") {
    return (
      <section className="ai pad col rise gap-2" style={style} aria-busy={st.kind === "loading"} aria-label="AI summary">
        <AiMark iconSize={13}>Where your marks went</AiMark>
        <SummaryPlaceholder st={st} now={now} compact />
      </section>
    );
  }
  const s = st.s;
  return (
    <section className="ai pad col rise gap-2" style={style} aria-label="AI summary">
      <AiMark iconSize={13}>Where {num(s.marksLost)} marks went</AiMark>
      {s.leaks.map((l, i) => (
        <span key={`${l.title}-${i}`} className="sm">
          <b>
            <MathText text={l.title} /> {lost(l.marksLost)}.
          </b>{" "}
          <MathText text={l.note} />
        </span>
      ))}
      {s.other && s.other.marksLost > 0 && (
        <span className="sm">
          <b>Other slips {lost(s.other.marksLost)}.</b> <MathText text={s.other.note} />
        </span>
      )}
      <span className="xs muted">{SUMMARY_LABEL}</span>
    </section>
  );
}

function SummaryPlaceholder({ st, now, compact }: { st: Exclude<SummaryState, { kind: "hidden" } | { kind: "ready" }>; now: number; compact?: boolean }) {
  if (st.kind === "locked") return <LockedLine message={st.message} at={st.at} now={now} />;
  if (st.kind === "quiet") return <QuietLine message={st.message} retry={st.retry} />;
  if (st.kind === "late") return <span className="sm muted">Your AI summary will be ready in a minute.</span>;
  return compact ? (
    <div className="col gap-2" aria-hidden="true">
      <Skel className="h-4 w-11/12" />
      <Skel className="h-4 w-4/5" />
      <Skel className="h-4 w-3/4" />
    </div>
  ) : (
    <div className="grid grid-cols-3 gap-4 max-lg:grid-cols-1" aria-hidden="true">
      {[0, 1, 2].map((k) => (
        <div key={k} className="col gap-2">
          <Skel className="h-5 w-3/5" />
          <Skel className="h-4 w-full" />
          <Skel className="h-4 w-4/5" />
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// "Why this happened" (desktop question pane, Phone-Review)
// ---------------------------------------------------------------------------------------------

/**
 * Wrong, partly correct and skipped questions with an official solution get an explanation (the contract answers
 * not_applicable for the rest; the button is not offered there).
 */
export function canExplain(outcome: QuestionOutcome, q: Pick<ReviewQuestion, "solution"> | undefined): boolean {
  return outcome !== "correct" && !!q && !!(q.solution.en || q.solution.hi);
}

/** The board's button label: "Explain my mistake", or "Explain the concept" for a skipped question. */
export function explainLabel(outcome: QuestionOutcome): string {
  return outcome === "skipped" ? "Explain the concept" : "Explain my mistake";
}

/** Desktop pane: the primary button that opens the panel. */
export function ExplainButton({ outcome, onClick }: { outcome: QuestionOutcome; onClick: () => void }) {
  return (
    <button type="button" className="btn btn-primary" onClick={onClick}>
      <SparkleIcon size={15} />
      {explainLabel(outcome)}
    </button>
  );
}

/**
 * The panel itself: "Comparing your answer with the solution…" while it loads or is being written, then why,
 * the worked steps, the key idea and the trap, and "Was this helpful?".
 * `n` is the number the student saw (shownAs), as the AI routes take it.
 */
export function WhyPanel({ testId, cell, now, compact }: { testId: string; cell: Pick<QuestionCell, "shownAs">; now: number | null; compact?: boolean }) {
  const n = cell.shownAs;
  const { query, late, retry } = useAiExplanation(testId, n, true);
  const d = query.data;
  const e = query.error instanceof StudentApiError ? query.error : null;
  const box = compact ? "ai pad col rise gap-2" : "ai fade col gap-2.5 p-[18px]";
  const shell = (children: React.ReactNode, busy = false) => (
    <section className={box} aria-label="Why this happened" aria-busy={busy || undefined} aria-live="polite">
      <AiMark iconSize={13}>Why this happened</AiMark>
      {children}
    </section>
  );

  if (!d && query.isError) {
    if (e?.code === "AI_NOT_AVAILABLE_YET") {
      const at = typeof e.details?.availableAt === "string" ? e.details.availableAt : null;
      return (
        <div className="row gap-3 rounded-xl bg-[var(--line-2)] p-4">
          <LockedLine message={e.message} at={now !== null ? at : null} now={now ?? 0} />
        </div>
      );
    }
    if (e && isAiDown(e)) return shell(<span className="sm muted">{sentence(downMessage(e))}</span>);
    // Not this student's question, or no AI service behind the gateway yet: the official solution is enough.
    if (e && e.status >= 400 && e.status < 500) return null;
    return shell(<QuietLine message="Couldn't load the explanation." retry={() => query.refetch()} />);
  }
  if (!d || d.status === "generating") {
    if (late)
      return shell(
        <QuietLine message="This one is taking longer than usual" retry={retry} />
      );
    return (
      <div className={compact ? "ai pad row rise gap-2.5" : "ai fade row gap-2.5 p-4"} aria-live="polite">
        <TypingDots label="Comparing your answer with the solution" />
        <span className="sm muted">Comparing your answer with the solution…</span>
      </div>
    );
  }
  if (d.status === "not_applicable" || !d.explanation) {
    if (d.reason === "CORRECT") return null;
    return shell(<span className="sm muted">There&apos;s no official solution to compare with yet, so there&apos;s no AI explanation. Ask your teacher.</span>);
  }
  return (
    <section className={box} aria-label="Why this happened">
      <div className="row between wrap gap-2">
        <AiMark iconSize={13}>Why this happened</AiMark>
        <span className="xs muted">AI explanation</span>
      </div>
      <ExplanationBody x={d.explanation} compact={compact} />
      {d.explanationId && <Helpful testId={testId} n={n} id={d.explanationId} mine={d.myFeedback} />}
    </section>
  );
}

function downMessage(e: StudentApiError): string {
  if (e.message) return e.message;
  if (e.code === "AI_RATE_LIMITED") return "You have asked for a lot of explanations. Try again in a few minutes";
  if (e.code === "AI_PAUSED") return "AI help is paused right now. The official solution is still here";
  return "Couldn't answer this one, ask your teacher";
}

function ExplanationBody({ x, compact }: { x: Explanation; compact?: boolean }) {
  const text = compact ? "sm m-0 leading-[1.55]" : "body m-0";
  return (
    <>
      <MathText as="p" className={text} text={x.why} />
      {x.steps.length > 0 && (
        <ol className={`${text} col list-decimal gap-1 pl-5`} aria-label="Steps">
          {x.steps.map((s, i) => (
            <MathText key={i} as="li" text={s} />
          ))}
        </ol>
      )}
      {x.keyIdea && (
        <p className="sm m-0">
          <b>Key idea.</b> <MathText text={x.keyIdea} />
        </p>
      )}
      {x.trap && (
        <p className="sm m-0">
          <b>Trap.</b> <MathText text={x.trap} />
        </p>
      )}
    </>
  );
}

function Helpful({ testId, n, id, mine }: { testId: string; n: number; id: string; mine: "helpful" | "not_helpful" | null }) {
  const m = useAiFeedback(testId, n);
  const send = (helpful: boolean) => m.mutate({ id, helpful });
  const cls = (on: boolean) => (on ? "btn btn-secondary btn-sm" : "btn btn-ghost btn-sm");
  return (
    <div className="row wrap fade gap-2">
      <span className="xs muted">Was this helpful?</span>
      <button type="button" className={cls(mine === "helpful")} aria-label="Helpful" aria-pressed={mine === "helpful"} onClick={() => send(true)}>
        Yes
      </button>
      <button type="button" className={cls(mine === "not_helpful")} aria-label="Not helpful" aria-pressed={mine === "not_helpful"} onClick={() => send(false)}>
        No
      </button>
      {m.isError ? <span className="xs muted">Couldn&apos;t save that. Try again.</span> : mine ? <span className="xs muted">Thanks, noted.</span> : null}
    </div>
  );
}
