"use client";

import "katex/dist/katex.min.css"; // equations (MathText)
import { useState } from "react";
import { AiMark, MathText, SparkleIcon, TypingDots } from "@iitpulse/ui";
import { useAiExplanation, useAiFeedback } from "@/lib/ai-api";
import { StudentApiError } from "@/lib/student-api";
import { daysFrom, dowDayMonth, timeOf } from "@/lib/time";
import type { QuestionOutcome, ReviewQuestion } from "@/types/m2-student";
import type { Explanation } from "@/types/m3-ai";

/**
 * Student-Review / Phone-Review: "Why this happened" (M3 explanation, GET /ai/student/results/:testId/questions/:n/
 * explanation) in the board's states:
 *   not-asked     no call yet ("Explain my mistake")
 *   generating    status generating (poll 2 s); still generating after 30 s: "taking longer than usual" + Try again
 *   ready         status ready (+ "no official solution" line when the question has none)
 *   failed        503 AI_UNAVAILABLE, a network error or a bare 5xx (Try again; no quota used)
 *   refused       AI_REFUSED (not sent by the explanation route today; ready for when it is)
 *   rate-limited  429 AI_RATE_LIMITED (details.retryAfterSeconds → "at 7:12 PM")
 *   paused        AI_PAUSED (also "credits-out": the API does not tell them apart until M9)
 *   locked        403 AI_NOT_AVAILABLE_YET / REVIEW_NOT_AVAILABLE_YET (details.availableAt)
 *   no-solution   not_applicable NO_OFFICIAL_SOLUTION (no explanation: the M3 line)
 * `n` is the paper number (as the M2 question routes take it), not the number the student saw.
 */

export type WhyFixtureState = "not-asked" | "generating" | "ready" | "failed" | "refused" | "rate-limited" | "paused" | "credits-out" | "locked" | "no-solution";
export const WHY_FIXTURE_STATES: WhyFixtureState[] = ["not-asked", "generating", "ready", "failed", "refused", "rate-limited", "paused", "credits-out", "locked", "no-solution"];

export type WhyState =
  | { kind: "hidden" }
  | { kind: "not-asked" }
  | { kind: "generating" }
  | { kind: "late"; retry: () => void }
  | { kind: "ready"; x: Explanation; id: string | null; mine: "helpful" | "not_helpful" | null; noSolution: boolean }
  | { kind: "no-solution" }
  | { kind: "failed"; retry: () => void; noQuota: boolean }
  | { kind: "refused" }
  | { kind: "rate"; at: number | null }
  | { kind: "paused" }
  | { kind: "locked"; at: string | null };

/** Wrong, partly correct and skipped questions with an official solution get the button (the API answers not_applicable for the rest). */
export function canExplain(outcome: QuestionOutcome, q: Pick<ReviewQuestion, "solution"> | undefined): boolean {
  return outcome !== "correct" && !!q && !!(q.solution.en || q.solution.hi);
}

/** The board's button label: "Explain my mistake", or "Explain the concept" for a skipped question. */
export function explainLabel(outcome: QuestionOutcome): string {
  return outcome === "skipped" ? "Explain the concept" : "Explain my mistake";
}

export function ExplainButton({ outcome, onClick, className }: { outcome: QuestionOutcome; onClick: () => void; className?: string }) {
  return (
    <button type="button" className={className ?? "btn btn-primary"} onClick={onClick}>
      {!className && <SparkleIcon size={15} />}
      {explainLabel(outcome)}
    </button>
  );
}

/** A fixture explanation (`?fixture=` builds only): the board's state with its copy, no call. */
export interface WhyFixture {
  state: WhyFixtureState;
  explanation: Explanation;
  /** rate-limited: "Try again in a few minutes, at 7:12 PM" */
  rateAt: number;
  /** locked: "today at 9:00 PM" */
  lockedAt: string;
}

export function fixtureWhyState(f: WhyFixture, asked: boolean): WhyState {
  const noop = () => {};
  switch (f.state) {
    case "not-asked":
      return asked ? { kind: "ready", x: f.explanation, id: null, mine: null, noSolution: false } : { kind: "not-asked" };
    case "generating":
      return { kind: "generating" };
    case "ready":
      return { kind: "ready", x: f.explanation, id: null, mine: null, noSolution: false };
    case "no-solution":
      return { kind: "ready", x: f.explanation, id: null, mine: null, noSolution: true };
    case "failed":
      return { kind: "failed", retry: noop, noQuota: true };
    case "refused":
      return { kind: "refused" };
    case "rate-limited":
      return { kind: "rate", at: f.rateAt };
    case "paused":
    case "credits-out":
      return { kind: "paused" };
    case "locked":
      return { kind: "locked", at: f.lockedAt };
  }
}

/**
 * The live state. `asked`: the student pressed "Explain my mistake" (desktop), or the phone opened the question
 * (Phone-Review shows the explanation without a button). `hasSolution`: the question carries an official solution.
 */
export function useWhyState(testId: string, n: number, asked: boolean, hasSolution: boolean, fixture?: WhyFixture | null): WhyState {
  const { query, late, retry } = useAiExplanation(testId, n, asked && !fixture);
  if (fixture) return fixtureWhyState(fixture, asked);
  if (!asked) return { kind: "not-asked" };
  const d = query.data;
  const e = query.error instanceof StudentApiError ? query.error : null;
  if (!d && query.isError) {
    const code: string | undefined = e?.code;
    if (code === "AI_NOT_AVAILABLE_YET" || code === "REVIEW_NOT_AVAILABLE_YET") return { kind: "locked", at: typeof e!.details?.availableAt === "string" ? e!.details.availableAt : null };
    if (code === "AI_PAUSED") return { kind: "paused" };
    if (code === "AI_REFUSED") return { kind: "refused" };
    if (code === "AI_RATE_LIMITED") {
      const s = Number(e!.details?.retryAfterSeconds);
      return { kind: "rate", at: Number.isFinite(s) && s > 0 ? query.errorUpdatedAt + s * 1000 : null };
    }
    if (code === "AI_UNAVAILABLE") return { kind: "failed", retry: () => query.refetch(), noQuota: true };
    // Not this student's question, or no AI service behind the gateway yet: the official solution is enough.
    if (e && e.status >= 400 && e.status < 500) return { kind: "hidden" };
    return { kind: "failed", retry: () => query.refetch(), noQuota: false };
  }
  if (!d || d.status === "generating") return late ? { kind: "late", retry } : { kind: "generating" };
  if (d.status === "not_applicable" && !d.explanation) return d.reason === "CORRECT" ? { kind: "hidden" } : { kind: "no-solution" };
  if (!d.explanation) return { kind: "hidden" };
  return { kind: "ready", x: d.explanation, id: d.explanationId, mine: d.myFeedback, noSolution: !hasSolution || d.reason === "NO_OFFICIAL_SOLUTION" };
}

/** "today at 9:00 PM" / "tomorrow at 10:00 AM" / "on Thu 5 Nov at 9:00 PM" */
function opensAt(now: number, at: string): string {
  const d = daysFrom(now, at);
  return d === 0 ? `today at ${timeOf(at)}` : d === 1 ? `tomorrow at ${timeOf(at)}` : `on ${dowDayMonth(at)} at ${timeOf(at)}`;
}

/** The board's note copy per state. */
function noteOf(st: WhyState, now: number | null, hasSolution: boolean) {
  switch (st.kind) {
    case "failed":
      return { cls: "err", role: "alert" as const, title: "Couldn't get an explanation.", text: "It took too long to answer.", sub: st.noQuota ? "This didn't use any of today's AI questions." : null, retry: st.retry };
    case "refused":
      return { cls: "grey", role: "status" as const, title: "AI can't explain this one.", text: hasSolution ? "Read the official solution below, or ask your teacher in class." : "Ask your teacher in class.", sub: "This didn't count against your limit." };
    case "rate":
      return { cls: "warn", role: "status" as const, title: "You've asked for a lot of explanations.", text: st.at ? `Try again in a few minutes, at ${timeOf(st.at)}.` : "Try again in a few minutes." };
    case "paused":
      return { cls: "info", role: "status" as const, title: "AI help is paused right now.", text: hasSolution ? "The official solution is still here." : "" };
    case "locked":
      return st.at && now !== null
        ? { cls: "grey", role: "status" as const, title: "AI review opens when the test closes for everyone,", text: `${opensAt(now, st.at)}. Until then you can see your answers and the key.` }
        : { cls: "grey", role: "status" as const, title: "AI review opens when the test closes for everyone.", text: "Until then you can see your answers and the key." };
    default:
      return null;
  }
}

function InfoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" />
    </svg>
  );
}

/**
 * Renders the state under the question: the typing line, "Why this happened" with "Was this helpful?", or one note.
 * Nothing for not-asked (the caller shows the button) and hidden.
 */
export function WhyView({
  st,
  testId,
  n,
  now,
  hasSolution,
  compact,
  fixture,
}: {
  st: WhyState;
  testId: string;
  n: number;
  now: number | null;
  hasSolution: boolean;
  compact?: boolean;
  fixture?: boolean;
}) {
  if (st.kind === "hidden" || st.kind === "not-asked") return null;
  if (st.kind === "generating")
    return (
      <div className={compact ? "ai row rise gap-2.5 p-3.5" : "ai fade row gap-2.5 p-4"} role="status" aria-live="polite">
        <TypingDots label={compact ? "Working it out" : "Comparing your answer with the solution"} />
        <span className="sm muted">{compact ? "Working it out…" : "Comparing your answer with the solution…"}</span>
      </div>
    );
  if (st.kind === "late")
    return (
      <section className={compact ? "ai pad col rise gap-2" : "ai fade col gap-2.5 p-[18px]"} aria-label="Why this happened" aria-live="polite">
        <AiMark iconSize={13}>Why this happened</AiMark>
        <span className="row wrap gap-2">
          <span className="sm muted">This one is taking longer than usual.</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={st.retry}>
            Try again
          </button>
        </span>
      </section>
    );
  if (st.kind === "no-solution")
    return (
      <section className={compact ? "ai pad col rise gap-2" : "ai fade col gap-2.5 p-[18px]"} aria-label="Why this happened">
        <AiMark iconSize={13}>Why this happened</AiMark>
        <span className="sm muted">There&apos;s no official solution to compare with yet, so there&apos;s no AI explanation. Ask your teacher.</span>
      </section>
    );
  if (st.kind === "ready")
    return (
      <section className={compact ? "ai col rise gap-2 p-3.5" : "ai fade col gap-2.5 p-[18px]"} aria-label="Why this happened">
        {compact ? (
          <AiMark iconSize={13}>Why this happened</AiMark>
        ) : (
          <div className="row between wrap gap-2">
            <AiMark iconSize={13}>Why this happened</AiMark>
            <span className="xs muted">AI · check anything unclear with your teacher</span>
          </div>
        )}
        <ExplanationBody x={st.x} compact={compact} />
        {st.noSolution && <span className="xs font-semibold text-[#5C3600]">There&apos;s no official solution for this question, so this was checked against the answer key only.</span>}
        {fixture ? <Helpful local /> : st.id ? <Helpful testId={testId} n={n} id={st.id} mine={st.mine} /> : null}
      </section>
    );
  const note = noteOf(st, now, hasSolution);
  if (!note) return null;
  const retry = "retry" in note ? note.retry : undefined;
  if (compact)
    return (
      <div className={`nt ${note.cls}`} role={note.role}>
        <span className="col grow gap-2">
          <span>
            <b>{note.title}</b> {note.text}
          </span>
          {retry && (
            <button type="button" className="btn btn-secondary min-h-11" onClick={retry}>
              Try again
            </button>
          )}
        </span>
      </div>
    );
  return (
    <div className={`nt ${note.cls}`} role={note.role}>
      <InfoIcon />
      <span className="col gap-1">
        <span>
          <b>{note.title}</b> {note.text}
        </span>
        {"sub" in note && note.sub && <span className="xs opacity-85">{note.sub}</span>}
      </span>
      {retry && (
        <button type="button" className="btn btn-secondary btn-sm ml-auto flex-none" onClick={retry}>
          Try again
        </button>
      )}
    </div>
  );
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

type HelpfulProps = { local: true } | { local?: false; testId: string; n: number; id: string; mine: "helpful" | "not_helpful" | null };

/** "Was this helpful? Yes / No" (the last answer wins). `local`: fixtures, no call. */
function Helpful(p: HelpfulProps) {
  return p.local ? <HelpfulButtons mine={null} send={null} /> : <HelpfulLive {...p} />;
}

function HelpfulLive({ testId, n, id, mine }: { testId: string; n: number; id: string; mine: "helpful" | "not_helpful" | null }) {
  const m = useAiFeedback(testId, n);
  return <HelpfulButtons mine={mine} send={(helpful) => m.mutate({ id, helpful })} error={m.isError} />;
}

function HelpfulButtons({ mine: mineProp, send, error }: { mine: "helpful" | "not_helpful" | null; send: ((helpful: boolean) => void) | null; error?: boolean }) {
  const [own, setOwn] = useState<"helpful" | "not_helpful" | null>(null);
  const mine = send ? mineProp : own;
  const click = (helpful: boolean) => (send ? send(helpful) : setOwn(helpful ? "helpful" : "not_helpful"));
  const cls = (on: boolean) => (on ? "btn btn-secondary btn-sm" : "btn btn-ghost btn-sm");
  return (
    <div className="row wrap fade gap-2">
      <span className="xs muted">Was this helpful?</span>
      <button type="button" className={cls(mine === "helpful")} aria-label="Helpful" aria-pressed={mine === "helpful"} onClick={() => click(true)}>
        Yes
      </button>
      <button type="button" className={cls(mine === "not_helpful")} aria-label="Not helpful" aria-pressed={mine === "not_helpful"} onClick={() => click(false)}>
        No
      </button>
      {error ? <span className="xs muted">Couldn&apos;t save that. Try again.</span> : mine ? <span className="xs muted">Thanks, noted.</span> : null}
    </div>
  );
}
