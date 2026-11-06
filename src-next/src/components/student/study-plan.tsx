"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MathText, Tape, TypingDots } from "@iitpulse/ui";
import { isAiDown } from "@/lib/ai-api";
import { m4Api, m4Keys, useStudyPlan, useTickItem } from "@/lib/m4-api";
import type { PlanFixture } from "@/lib/progress-fixtures";
import { StudentApiError } from "@/lib/student-api";
import { dowDayMonth, ist, resetsAt } from "@/lib/time";
import type { StudyPlan, StudyPlanItem, StudyPlanResponse } from "@/types/m4";
import { Spinner } from "@/components/shell/icons";
import { cn } from "@/lib/utils";
import { Skel } from "./common";
import { sentence } from "./labels";
import { istTime } from "./states";

/**
 * "This week's plan" (Student-Progress) and "Today" (Phone-Progress), from GET /ai/student/study-plan, with the
 * batch 5 plan states: generating (and slow after 60 s), rebuilding (the old plan dimmed under the new one being
 * made), paused (AI_PAUSED), locked (AI_NOT_AVAILABLE_YET), no plan yet (AI_UNAVAILABLE / not_applicable: "Make my
 * plan" asks again), rebuild limit (rebuild used today) and offline (buttons wait). Items are ticked with PATCH
 * …/items/:id; "Make it lighter" / "Rebuild plan" are each once a day (PLAN_ACTION_LIMIT carries nextAt).
 * A `fx` (lib/progress-fixtures.ts) replaces the API for the state boards.
 */

const WEEKDAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const MONS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** An IST calendar date (YYYY-MM-DD) as its parts, without a time zone shift. */
function dateParts(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y!, m! - 1, d!));
  return { dow: WEEKDAYS[dt.getUTCDay()]!, day: d!, mon: MONS[m! - 1]! };
}

/** "1h 15m", "45m" */
export function hm(min: number): string {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return h ? (m ? `${h}h ${m}m` : `${h}h`) : `${m}m`;
}

function itemText(i: StudyPlanItem): string {
  return i.minutes ? `${i.title} · ${i.minutes}m` : i.title;
}

type PlanState =
  | { kind: "loading" }
  | { kind: "hidden" }
  | { kind: "error"; retry: () => void }
  | { kind: "generating"; late: boolean }
  | { kind: "locked" }
  | { kind: "none" }
  | { kind: "paused" }
  /** rebuilding: a lighter / rebuild (or a new result) is being made; `plan` is still the previous one */
  | { kind: "ready"; r: StudyPlanResponse; plan: StudyPlan; rebuilding: boolean; late: boolean };

function planState(r: StudyPlanResponse | undefined | null, error: unknown, late: boolean, retry: () => void): PlanState {
  const e = error instanceof StudentApiError ? error : null;
  if (!r && error) {
    if (e?.code === "AI_PAUSED") return { kind: "paused" };
    if (e?.code === "AI_NOT_AVAILABLE_YET") return { kind: "locked" };
    if (e && isAiDown(e)) return { kind: "none" };
    if (e && e.status >= 400 && e.status < 500) return { kind: "hidden" };
    return { kind: "error", retry };
  }
  if (!r) return { kind: "loading" };
  if (r.status === "generating" && !r.plan) return { kind: "generating", late };
  if (r.status === "not_applicable" || !r.plan) return { kind: "none" };
  return { kind: "ready", r, plan: r.plan, rebuilding: r.status === "generating", late };
}

/** Everything a plan card needs, from the API or a fixture. */
interface PlanSource {
  st: PlanState;
  /** "Make my plan": ask again */
  make: () => void;
  act: (a: "lighter" | "rebuild") => void;
  acting: boolean;
  actionError: unknown;
  tick: (id: string, done: boolean) => void;
  tickError: boolean;
}

/** "Make it lighter" / "Rebuild plan": each once a day; the answer is a generating plan, polled like the first one. */
function usePlanAction(onStarted: () => void) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (action: "lighter" | "rebuild") => m4Api.planAction(action),
    onSuccess: (res) => {
      client.setQueryData(m4Keys.plan, res);
      onStarted();
    },
  });
}

function LivePlan({ render }: { render: (s: PlanSource) => React.ReactNode }) {
  const { query, late, retry, restartPolling } = useStudyPlan();
  const tick = useTickItem();
  const m = usePlanAction(restartPolling);
  const src: PlanSource = {
    st: planState(query.data, query.data ? null : query.error, late, retry),
    make: retry,
    act: (a) => m.mutate(a),
    acting: m.isPending,
    actionError: m.error,
    tick: tick.toggle,
    tickError: tick.isError,
  };
  return <>{render(src)}</>;
}

function FixturePlan({ fx, render }: { fx: PlanFixture; render: (s: PlanSource) => React.ReactNode }) {
  const [r, setR] = useState(fx.r);
  const src: PlanSource = {
    st: planState(r, fx.error, fx.late, () => {}),
    make: () => {},
    act: () => {},
    acting: false,
    actionError: fx.actionError,
    tick: (id, done) =>
      setR((cur) => (cur?.plan ? { ...cur, plan: { ...cur.plan, days: cur.plan.days.map((d) => ({ ...d, items: d.items.map((i) => (i.id === id ? { ...i, done } : i)) })) } } : cur)),
    tickError: false,
  };
  return <>{render(src)}</>;
}

function WithPlan({ fx, render }: { fx?: PlanFixture | null; render: (s: PlanSource) => React.ReactNode }) {
  return fx ? <FixturePlan fx={fx} render={render} /> : <LivePlan render={render} />;
}

/** The card's mode once a plan is there: the board states that keep the week visible. */
type Mode = "ready" | "rebuilding" | "paused" | "limit" | "offline";

function modeOf(st: Extract<PlanState, { kind: "ready" }>, actionError: unknown, offline: boolean): { mode: Mode; nextAt: string | null } {
  const e = actionError instanceof StudentApiError ? actionError : null;
  if (st.rebuilding) return { mode: "rebuilding", nextAt: null };
  if (e?.code === "AI_PAUSED") return { mode: "paused", nextAt: null };
  const errAt = e?.code === "PLAN_ACTION_LIMIT" && typeof e.details?.nextAt === "string" ? e.details.nextAt : null;
  if (!st.r.actions.rebuild.available || errAt) return { mode: "limit", nextAt: st.r.actions.rebuild.nextAt ?? errAt };
  if (offline) return { mode: "offline", nextAt: null };
  return { mode: "ready", nextAt: null };
}

/** A failed action other than the board states (a lighter used today, a network error). */
function actionProblem(err: unknown, now: number): string | null {
  const e = err instanceof StudentApiError ? err : null;
  if (!err || e?.code === "AI_PAUSED") return null;
  if (e?.code === "PLAN_ACTION_LIMIT") {
    const at = typeof e.details?.nextAt === "string" ? e.details.nextAt : null;
    return `You've already changed your plan today.${at ? ` You can change it again ${resetsAt(now, at)}.` : ""}`;
  }
  if (e && isAiDown(e)) return sentence(e.message || "The AI is paused right now, so the plan can't change. Your current plan stays");
  return sentence(e?.message || "Couldn't change the plan. Please try again");
}

/** "your last 3 tests", "your first test" */
function basedOnText(plan: StudyPlan, testsCount: number): string {
  if (testsCount === 1) return "your first test";
  const n = plan.basedOn.length;
  return n === 1 ? "your last test" : `your last ${n} tests`;
}

function RebuildIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" focusable="false">
      <path d="M3 12a9 9 0 0 1 15.5-6.2L21 8M21 3v5h-5M21 12a9 9 0 0 1-15.5 6.2L3 16M3 21v-5h5" />
    </svg>
  );
}
function PauseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="9" />
      <path d="M10 9v6M14 9v6" />
    </svg>
  );
}
function ClockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}
function LockTile() {
  return (
    <span className="st-ico grey" aria-hidden="true">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" focusable="false">
        <rect x="5" y="11" width="14" height="10" rx="2" />
        <path d="M8 11V8a4 4 0 0 1 8 0v3" />
      </svg>
    </span>
  );
}
function SparkTile() {
  return (
    <span className="st-ico navy" aria-hidden="true">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true" focusable="false">
        <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />
      </svg>
    </span>
  );
}

/** The AI box with typing dots (generating, slow, rebuilding) */
function Working({ text, className }: { text: string; className?: string }) {
  return (
    <div className={cn("ai row pl-work", className)} role="status">
      <TypingDots label="Working on your plan" />
      <span className="sm">{text}</span>
    </div>
  );
}

function PausedNote({ phone }: { phone?: boolean }) {
  return (
    <div className="nt warn pl-nt" role="status">
      <PauseIcon />
      <span>
        <b>AI help is paused right now.</b> {phone ? "Your last plan stays here." : "Your last plan stays here. You can rebuild it when AI help is back."}
      </span>
    </div>
  );
}
function LimitNote({ now, nextAt }: { now: number; nextAt: string | null }) {
  return (
    <div className="nt grey pl-nt" role="status">
      <ClockIcon />
      <span>You can rebuild your plan again {nextAt ? resetsAt(now, nextAt) : "tomorrow"}.</span>
    </div>
  );
}

function ErrorLine({ retry }: { retry: () => void }) {
  return (
    <span className="row wrap gap-2">
      <span className="sm muted">Couldn&apos;t load your study plan.</span>
      <button type="button" className="btn btn-ghost btn-sm" onClick={retry}>
        Try again
      </button>
    </span>
  );
}

type CardProps = {
  now: number;
  /** the latest test's short name ("Mock 11"), for "Making your plan from your Mock 11 result" */
  latest: string | null;
  testsCount: number;
  offline: boolean;
  fx?: PlanFixture | null;
};

/** Student-Progress: the week, one column per day, today tinted; tick an item to strike it through. */
export function PlanWeekCard(props: CardProps) {
  return <WithPlan fx={props.fx} render={(s) => <WeekView s={s} {...props} />} />;
}

function WeekView({ s, now, latest, testsCount, offline }: CardProps & { s: PlanSource }) {
  const st = s.st;
  if (st.kind === "hidden") return null;
  const ready = st.kind === "ready" ? st : null;
  const plan = ready?.plan ?? null;
  const { mode, nextAt } = ready ? modeOf(ready, s.actionError, offline) : { mode: null, nextAt: null };
  const from = plan ? basedOnText(plan, testsCount) : "";
  const result = latest ? `Your ${latest} result is in` : "Your result is in";
  const sub =
    st.kind === "generating"
      ? result
      : st.kind === "locked"
        ? "Waiting for your last test"
        : st.kind === "none" || st.kind === "paused"
          ? "Not made yet"
          : st.kind === "ready"
            ? mode === "rebuilding"
              ? `Made by AI from ${from}`
              : mode === "paused"
                ? `Made by AI from ${from} · made on ${dowDayMonth(plan!.generatedAt)}`
                : mode === "limit"
                  ? `Rebuilt today at ${istTime(plan!.generatedAt)} · from ${from}`
                  : `Made by AI from ${from} · about ${hm(plan!.minutesPerDay)} a day · adjust anything`
            : "Made by AI from your last tests · adjust anything";
  const r = ready?.r;
  const problem = actionProblem(s.actionError, now);
  return (
    <section className="card pad-lg col rise relative gap-4" style={{ "--i": 6 } as React.CSSProperties} aria-labelledby="plan-h">
      <Tape rotate={-2} delay={900} />
      <div className="row between wrap gap-3">
        <div className="col gap-0.5">
          <h2 id="plan-h" className="h3">
            This week&apos;s plan
          </h2>
          <span className="xs muted">{sub}</span>
        </div>
        {r && mode === "rebuilding" && (
          <button type="button" className="btn btn-secondary btn-sm" disabled>
            <Spinner size={14} />
            Rebuilding…
          </button>
        )}
        {r && mode !== "rebuilding" && (
          <div className="row gap-2">
            <button type="button" className="btn btn-ghost btn-sm" disabled={mode !== "ready" && mode !== "limit" ? true : s.acting || !r.actions.lighter.available} onClick={() => s.act("lighter")}>
              Make it lighter
            </button>
            <button type="button" className="btn btn-secondary btn-sm" disabled={mode !== "ready" || s.acting} onClick={() => s.act("rebuild")}>
              {s.acting ? <Spinner size={14} /> : <RebuildIcon />}
              {mode === "offline" ? "Offline · rebuild waits" : "Rebuild plan"}
            </button>
          </div>
        )}
      </div>
      {st.kind === "generating" && <Working text={st.late ? "This is taking longer than usual. You can leave this page; your plan will be here when it's ready." : `Making your plan from your ${latest ?? "latest"} result. This takes about a minute.`} />}
      {mode === "rebuilding" && <Working text={`Rebuilding your plan from ${from}. Your current plan stays until the new one is ready.`} />}
      {(mode === "paused" || st.kind === "paused") && <PausedNote />}
      {mode === "limit" && <LimitNote now={now} nextAt={nextAt} />}
      {st.kind === "locked" && (
        <div className="pl-quiet">
          <LockTile />
          <span className="h3">Your plan appears once answers for your last test are open</span>
          <span className="sm muted max-w-[480px]">Your institute opens them after the test closes for everyone. Practice sets work in the meantime.</span>
        </div>
      )}
      {st.kind === "none" && (
        <div className="pl-quiet">
          <SparkTile />
          <span className="h3">No plan yet</span>
          <span className="sm muted max-w-[480px]">A week of short daily tasks, made from your results. About an hour a day, and you can change any of it.</span>
          <button type="button" className="btn btn-primary mt-1" disabled={offline} onClick={s.make}>
            Make my plan
          </button>
        </div>
      )}
      {st.kind === "error" && <ErrorLine retry={st.retry} />}
      {(st.kind === "generating" || st.kind === "loading") && (
        <div className="wk" aria-hidden="true">
          {[0, 1, 2, 3, 4, 5, 6].map((k) => (
            <Skel key={k} className="h-[150px] rounded-[14px]" />
          ))}
        </div>
      )}
      {plan && (
        <div className={mode === "rebuilding" ? "wk dim" : "wk"} aria-busy={mode === "rebuilding" || undefined}>
          {plan.days.map((d) => {
            const p = dateParts(d.date);
            return (
              <div key={d.date} className={d.isToday ? "day today" : "day"}>
                <span className={d.isToday ? "xs font-bold text-primary" : "xs muted font-semibold"}>
                  {p.dow} {p.day}
                  {d.isToday ? " · TODAY" : ""}
                </span>
                {d.items.length === 0 && <span className="xs muted">Nothing planned</span>}
                {d.items.map((i) => (
                  <button key={i.id} type="button" className={i.done ? "task cl-done" : "task"} aria-pressed={i.done} title={i.done ? "Done · tap to undo" : "Tap when done"} onClick={() => s.tick(i.id, !i.done)}>
                    <MathText text={itemText(i)} />
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      )}
      {problem && (
        <span className="xs muted" role="status">
          {problem}
        </span>
      )}
      {s.tickError && <span className="xs muted">Couldn&apos;t save that tick. Try again.</span>}
    </section>
  );
}

/** "Today · Mon 2 Nov" from a time (IST) */
function todayTitle(now: number): string {
  if (Number.isNaN(now)) return "Today's plan";
  const p = ist(now);
  return `Today · ${p.dow} ${p.day} ${p.mon}`;
}

/** Phone-Progress: "Today · Mon 2 Nov", about how long is left, one row per item. */
export function PlanTodayCard(props: CardProps) {
  return <WithPlan fx={props.fx} render={(s) => <TodayView s={s} {...props} />} />;
}

function TodayView({ s, now, latest, offline }: CardProps & { s: PlanSource }) {
  const st = s.st;
  if (st.kind === "hidden") return null;
  const ready = st.kind === "ready" ? st : null;
  const { mode, nextAt } = ready ? modeOf(ready, s.actionError, offline) : { mode: null, nextAt: null };
  const r = ready?.r;
  const day = ready ? (ready.plan.days.find((d) => d.isToday) ?? null) : null;
  const left = day ? day.items.filter((i) => !i.done).reduce((a, i) => a + (i.minutes ?? 0), 0) : 0;
  const p = day ? dateParts(day.date) : null;
  const title = p ? `Today · ${p.dow[0]}${p.dow.slice(1).toLowerCase()} ${p.day} ${p.mon}` : todayTitle(now);
  const problem = actionProblem(s.actionError, now);
  return (
    <section className="card pad col rise gap-0" style={{ "--i": 2 } as React.CSSProperties} aria-labelledby="today-h">
      <div className="row between gap-2">
        <h2 id="today-h" className="h3">
          {title}
        </h2>
        {day && left > 0 && <span className="xs muted">~{left} min left</span>}
      </div>
      {st.kind === "generating" && <Working className="mt-2 p-3" text={st.late ? "Taking longer than usual. You can leave; your plan will be here when it's ready." : `Making your plan from your ${latest ?? "latest"} result. About a minute.`} />}
      {mode === "rebuilding" && <Working className="mt-2 mb-1 p-3" text="Rebuilding your plan. Today's tasks stay until it's ready." />}
      {(mode === "paused" || st.kind === "paused") && <PausedNote phone />}
      {mode === "limit" && <LimitNote now={now} nextAt={nextAt} />}
      {st.kind === "locked" && (
        <div className="pl-quiet ph">
          <LockTile />
          <span className="sm font-semibold">Your plan appears once answers for your last test are open</span>
          <span className="xs muted">Practice sets work in the meantime.</span>
        </div>
      )}
      {st.kind === "none" && (
        <div className="pl-quiet ph">
          <SparkTile />
          <span className="sm font-semibold">No plan yet</span>
          <span className="xs muted">Short daily tasks made from your results. You can change any of it.</span>
          <button type="button" className="btn btn-primary mt-1 h-11 w-full" disabled={offline} onClick={s.make}>
            Make my plan
          </button>
        </div>
      )}
      {st.kind === "error" && (
        <div className="pt-2">
          <ErrorLine retry={st.retry} />
        </div>
      )}
      {(st.kind === "generating" || st.kind === "loading") && (
        <div className="col mt-3 gap-2.5" aria-hidden="true">
          <Skel className="h-[22px] w-[86%]" />
          <Skel className="h-[22px] w-[70%]" />
          <Skel className="h-[22px] w-[78%]" />
        </div>
      )}
      {ready && (
        <div className={mode === "rebuilding" ? "col pl-tasks dim" : "col pl-tasks"} aria-busy={mode === "rebuilding" || undefined}>
          {!day || day.items.length === 0 ? (
            <span className="sm muted pt-2">Nothing planned for today. Rest, or redo a question you got wrong.</span>
          ) : (
            day.items.map((i) => (
              <label key={i.id} className="row plan min-w-0">
                <input type="checkbox" className="check" checked={i.done} onChange={(e) => s.tick(i.id, e.target.checked)} />
                <MathText className="sm plan-t min-w-0" text={itemText(i)} />
              </label>
            ))
          )}
        </div>
      )}
      {r && mode === "rebuilding" && (
        <button type="button" className="btn btn-secondary btn-sm mt-2 h-11 w-full" disabled>
          <Spinner size={14} />
          Rebuilding…
        </button>
      )}
      {r && mode !== "rebuilding" && (
        <div className="row mt-2 gap-2">
          <button type="button" className="btn btn-ghost btn-sm h-11 flex-1" disabled={mode !== "ready" && mode !== "limit" ? true : s.acting || !r.actions.lighter.available} onClick={() => s.act("lighter")}>
            Make it lighter
          </button>
          <button type="button" className="btn btn-secondary btn-sm h-11 flex-1" disabled={mode !== "ready" || s.acting} onClick={() => s.act("rebuild")}>
            {s.acting ? <Spinner size={14} /> : <RebuildIcon />}
            {mode === "offline" ? "Offline" : "Rebuild plan"}
          </button>
        </div>
      )}
      {problem && (
        <span className="xs muted mt-1.5" role="status">
          {problem}
        </span>
      )}
      {s.tickError && <span className="xs muted">Couldn&apos;t save that tick. Try again.</span>}
    </section>
  );
}
