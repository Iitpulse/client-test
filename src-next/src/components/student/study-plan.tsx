"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MathText, Tape, TypingDots } from "@iitpulse/ui";
import { isAiDown } from "@/lib/ai-api";
import { m4Api, m4Keys, useStudyPlan, useTickItem } from "@/lib/m4-api";
import { StudentApiError } from "@/lib/student-api";
import { resetsAt } from "@/lib/time";
import type { StudyPlan, StudyPlanItem, StudyPlanResponse } from "@/types/m4";
import { Skel } from "./common";
import { sentence } from "./labels";

/**
 * "This week's plan" (Student-Progress) and "Today" (Phone-Progress), from GET /ai/student/study-plan.
 * The plan is made by AI (the caption says so); items are ticked with PATCH …/items/:id, "Make it lighter" and
 * "Rebuild plan" are each once a day (PLAN_ACTION_LIMIT carries nextAt). A generating plan is polled every 3 s
 * for up to 60 s. When the AI is paused or failing, one calm line; the rest of Progress is untouched.
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
  | { kind: "quiet"; message: string; retry?: () => void }
  | { kind: "generating"; late: boolean; retry: () => void }
  | { kind: "none" }
  /** rebuilding: a lighter / rebuild (or a new result) is being made; `plan` is still the previous one */
  | { kind: "ready"; r: StudyPlanResponse; plan: StudyPlan; rebuilding: boolean; late: boolean };

function usePlanState(): { st: PlanState; restart: () => void } {
  const { query, late, retry, restartPolling } = useStudyPlan();
  return { st: planState(query, late, retry), restart: restartPolling };
}

function planState(query: ReturnType<typeof useStudyPlan>["query"], late: boolean, retry: () => void): PlanState {
  const r = query.data;
  const e = query.error instanceof StudentApiError ? query.error : null;
  if (!r && query.isError) {
    if (e && isAiDown(e)) return { kind: "quiet", message: e.message || "Your study plan is paused right now. Everything else on Progress is up to date." };
    if (e?.code === "AI_NOT_AVAILABLE_YET") return { kind: "quiet", message: e.message || "Your plan appears once answers for your last test are open" };
    if (e && e.status >= 400 && e.status < 500) return { kind: "hidden" };
    return { kind: "quiet", message: "Couldn't load your study plan.", retry: () => query.refetch() };
  }
  if (!r) return { kind: "loading" };
  if (r.status === "generating" && !r.plan) return { kind: "generating", late, retry };
  if (r.status === "not_applicable" || !r.plan) return { kind: "none" };
  return { kind: "ready", r, plan: r.plan, rebuilding: r.status === "generating", late };
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

function actionProblem(err: unknown, now: number): string {
  const e = err instanceof StudentApiError ? err : null;
  if (e?.code === "PLAN_ACTION_LIMIT") {
    const at = typeof e.details?.nextAt === "string" ? e.details.nextAt : null;
    return `You've already changed your plan today.${at ? ` You can change it again ${resetsAt(now, at)}.` : ""}`;
  }
  if (e && isAiDown(e)) return sentence(e.message || "The AI is paused right now, so the plan can't change. Your current plan stays");
  return sentence(e?.message || "Couldn't change the plan. Please try again");
}

function PlanActions({ r, now, restart, compact }: { r: StudyPlanResponse; now: number; restart: () => void; compact?: boolean }) {
  const m = usePlanAction(restart);
  const busy = m.isPending || r.status === "generating";
  const later = (a: { available: boolean; nextAt: string | null }) => (!a.available && a.nextAt ? `You can do this again ${resetsAt(now, a.nextAt)}` : undefined);
  return (
    <div className={compact ? "col gap-1.5" : "col items-end gap-1.5"}>
      <div className="row gap-2">
        <button type="button" className={compact ? "btn btn-ghost btn-sm h-11 flex-1" : "btn btn-ghost btn-sm"} disabled={busy || !r.actions.lighter.available} title={later(r.actions.lighter)} onClick={() => m.mutate("lighter")}>
          Make it lighter
        </button>
        <button type="button" className={compact ? "btn btn-secondary btn-sm h-11 flex-1" : "btn btn-secondary btn-sm"} disabled={busy || !r.actions.rebuild.available} title={later(r.actions.rebuild)} onClick={() => m.mutate("rebuild")}>
          <RebuildIcon />
          Rebuild plan
        </button>
      </div>
      {m.isError && (
        <span className="xs muted" role="status">
          {actionProblem(m.error, now)}
        </span>
      )}
    </div>
  );
}

function RebuildIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" focusable="false">
      <path d="M3 12a9 9 0 0 1 15.5-6.2L21 8M21 3v5h-5M21 12a9 9 0 0 1-15.5 6.2L3 16M3 21v-5h5" />
    </svg>
  );
}

function PlanPlaceholder({ st, compact }: { st: Exclude<PlanState, { kind: "ready" } | { kind: "hidden" }>; compact?: boolean }) {
  if (st.kind === "quiet")
    return (
      <span className="row wrap gap-2">
        <span className="sm muted">{sentence(st.message)}</span>
        {st.retry && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={st.retry}>
            Try again
          </button>
        )}
      </span>
    );
  if (st.kind === "none") return <span className="sm muted">Your plan appears after your first result. It is made from your weak chapters and the questions you got wrong.</span>;
  if (st.kind === "generating")
    return st.late ? (
      <span className="row wrap gap-2">
        <span className="sm muted">Your plan will be ready in a minute.</span>
        <button type="button" className="btn btn-ghost btn-sm" onClick={st.retry}>
          Check again
        </button>
      </span>
    ) : (
      <span className="row gap-2.5" aria-live="polite">
        <TypingDots label="Making your plan" />
        <span className="sm muted">Making your plan from your last tests…</span>
      </span>
    );
  return compact ? (
    <div className="col gap-2.5" aria-hidden="true">
      {[0, 1, 2].map((k) => (
        <Skel key={k} className="h-6 w-full" />
      ))}
    </div>
  ) : (
    <div className="grid grid-cols-7 gap-2.5 max-lg:grid-cols-4" aria-hidden="true">
      {[0, 1, 2, 3, 4, 5, 6].map((k) => (
        <Skel key={k} className="h-32 rounded-[14px]" />
      ))}
    </div>
  );
}

/** Student-Progress: the week, one column per day, today tinted; tick an item to strike it through. */
export function PlanWeekCard({ now }: { now: number }) {
  const { st, restart } = usePlanState();
  const tick = useTickItem();
  if (st.kind === "hidden") return null;
  const r = st.kind === "ready" ? st.r : null;
  const plan = st.kind === "ready" ? st.plan : null;
  return (
    <section className="card pad-lg col rise relative gap-4" style={{ "--i": 6 } as React.CSSProperties} aria-labelledby="plan-h">
      <Tape rotate={-2} delay={900} />
      <div className="row between wrap gap-3">
        <div className="col gap-0.5">
          <h2 id="plan-h" className="h3">
            This week&apos;s plan
          </h2>
          <span className="xs muted">
            {plan
              ? `Made by AI from your last ${plan.basedOn.length === 1 ? "test" : `${plan.basedOn.length} tests`} · about ${hm(plan.minutesPerDay)} a day · adjust anything`
              : "Made by AI from your last tests · adjust anything"}
          </span>
        </div>
        {r && <PlanActions r={r} now={now} restart={restart} />}
      </div>
      {!plan ? (
        <PlanPlaceholder st={st as Exclude<PlanState, { kind: "ready" } | { kind: "hidden" }>} />
      ) : (
        <div className="grid grid-cols-7 gap-2.5 max-lg:grid-cols-4">
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
                  <button key={i.id} type="button" className={i.done ? "task cl-done" : "task"} aria-pressed={i.done} title={i.done ? "Done · tap to undo" : "Tap when done"} onClick={() => tick.toggle(i.id, !i.done)}>
                    <MathText text={itemText(i)} />
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      )}
      {st.kind === "ready" && st.rebuilding && <Rebuilding late={st.late} />}
      {tick.isError && <span className="xs muted">Couldn&apos;t save that tick. Try again.</span>}
    </section>
  );
}

function Rebuilding({ late }: { late: boolean }) {
  return (
    <span className="row gap-2.5" aria-live="polite">
      {!late && <TypingDots label="Rebuilding your plan" />}
      <span className="xs muted">{late ? "Your new plan will be ready in a minute. This one stays until then." : "Making your new plan… this one stays until it's ready."}</span>
    </span>
  );
}

/** Phone-Progress: "Today · Mon 2 Nov", about how long is left, one row per item. */
export function PlanTodayCard({ now }: { now: number }) {
  const { st, restart } = usePlanState();
  const tick = useTickItem();
  if (st.kind === "hidden") return null;
  const r = st.kind === "ready" ? st.r : null;
  const day = st.kind === "ready" ? (st.plan.days.find((d) => d.isToday) ?? null) : null;
  const left = day ? day.items.filter((i) => !i.done).reduce((a, i) => a + (i.minutes ?? 0), 0) : 0;
  const p = day ? dateParts(day.date) : null;
  return (
    <section className="card pad col rise gap-0" style={{ "--i": 2 } as React.CSSProperties} aria-labelledby="today-h">
      <div className="row between gap-2">
        <h2 id="today-h" className="h3">
          {p ? `Today · ${p.dow[0]}${p.dow.slice(1).toLowerCase()} ${p.day} ${p.mon}` : "Today's plan"}
        </h2>
        {day && left > 0 && <span className="xs muted">~{left} min left</span>}
      </div>
      {st.kind !== "ready" ? (
        <div className="pt-2">
          <PlanPlaceholder st={st} compact />
        </div>
      ) : !day || day.items.length === 0 ? (
        <span className="sm muted pt-2">Nothing planned for today. Rest, or redo a question you got wrong.</span>
      ) : (
        day.items.map((i) => (
          <label key={i.id} className="row plan min-w-0">
            <input type="checkbox" className="check" checked={i.done} onChange={(e) => tick.toggle(i.id, e.target.checked)} />
            <MathText className="sm plan-t min-w-0" text={itemText(i)} />
          </label>
        ))
      )}
      {tick.isError && <span className="xs muted">Couldn&apos;t save that tick. Try again.</span>}
      {r && (
        <div className="mt-2">
          <PlanActions r={r} now={now} restart={restart} compact />
        </div>
      )}
      {st.kind === "ready" && st.rebuilding && (
        <span className="mt-2">
          <Rebuilding late={st.late} />
        </span>
      )}
    </section>
  );
}
