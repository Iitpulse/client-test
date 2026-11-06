"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { AiMark, Bar, Doodle, InkArrow, InkUnderline, Note } from "@iitpulse/ui";
import { fixtureParam } from "@/lib/fixtures";
import { m4Api, m4Keys } from "@/lib/m4-api";
import { progressFixture, type PlanFixture, type ProgressFixture } from "@/lib/progress-fixtures";
import { useServerClock } from "@/lib/server-clock";
import { StudentApiError } from "@/lib/student-api";
import { useOnline } from "@/lib/use-online";
import { longDay, mmss } from "@/lib/time";
import type { ProgressRange, ProgressResponse, WeakTopic } from "@/types/m4";
import { PhoneTitleBar } from "@/components/shell/phone-title-bar";
import { Skel } from "./common";
import { ArrowDownIcon, ArrowUpIcon } from "./icons";
import { num, shortPair } from "./labels";
import { PracticeButton } from "./practice-button";
import { OfflineBanner, istTime, supportCode } from "./states";
import { PlanTodayCard, PlanWeekCard } from "./study-plan";

/**
 * /progress: Student-Progress (desktop) and Phone-Progress (phone), from GET /tests/student/progress?range=.
 * Desktop: headline tiles, chapter mastery heatmap, "What's holding you back" (the first one "start here"),
 * "This week's plan" (study-plan.tsx), strengths and the score trend. Phone: the score trend, "Focus on these" and
 * today's part of the plan. Batch 5 states: loading, error (support code), offline (banner; plan changes wait),
 * no tests yet, one test (single-point chart, "Weak topics from Mock 1"), and the plan states (study-plan.tsx).
 * `?fixture=` (lib/progress-fixtures.ts, dev and staging only) replaces the API for the state boards.
 * Charts are plain SVG. Exam, subject and chapter names are data.
 */

const RANGES: ProgressRange[] = ["30d", "90d", "all"];

function rangeChip(r: ProgressRange): string {
  return r === "30d" ? "30 days" : r === "all" ? "All time" : "90 days";
}
/** "in 90 days" for deltas */
function rangeSince(r: ProgressRange): string {
  return r === "30d" ? "in 30 days" : r === "all" ? "in all" : "in 90 days";
}
/** "last 90 days" for captions */
function rangeLast(r: ProgressRange): string {
  return r === "30d" ? "last 30 days" : r === "all" ? "all time" : "last 90 days";
}

export function ProgressView() {
  const [range, setRange] = useState<ProgressRange>("90d");
  // undefined until the URL is read (after mount): no API call before we know there is no fixture
  const [fx, setFx] = useState<ProgressFixture | null | undefined>(undefined);
  useEffect(() => setFx(progressFixture(fixtureParam())), []);
  const q = useQuery({
    queryKey: m4Keys.progress(range),
    queryFn: ({ signal }) => m4Api.progress(range, signal),
    placeholderData: keepPreviousData,
    enabled: fx === null,
  });
  const [fxAt] = useState(() => Date.now());
  const online = useOnline();
  const fxData = fx && typeof fx.progress === "object" ? fx.progress : undefined;
  const d = fx ? fxData : q.data;
  const updatedAt = fx ? fxAt : q.dataUpdatedAt;
  const isError = fx ? fx.progress === "error" : q.isError;
  const error = fx ? new StudentApiError(500, "Fixture") : q.error;
  const retry = () => (fx ? undefined : q.refetch());
  const now = useServerClock(d?.now, updatedAt, false);
  const ready = !!d && !Number.isNaN(now);
  const planFx: PlanFixture | null | undefined = fx === undefined ? undefined : fx?.plan ?? null;
  const latest = d?.scoreTrend.length ? d.scoreTrend[d.scoreTrend.length - 1]!.shortName : null;
  const kind = !d ? (isError ? "error" : "loading") : d.testsCount === 0 ? (range === "30d" ? "none30" : "empty") : d.testsCount === 1 ? "one" : "full";
  const sub = kind === "empty" ? "Nothing to show yet" : kind === "one" ? "1 test so far" : ready && d ? countLine(d, range) : "";
  const tabs = kind === "full" || kind === "one" || kind === "loading" || kind === "none30";
  const plan = { now, latest, testsCount: d?.testsCount ?? 0, offline: !online, fx: planFx };

  return (
    <>
      <PhoneTitleBar title="Progress" doodle="parabola" />
      {!online && (
        <OfflineBanner className="pg-bnr">
          <span className="max-md:hidden">Showing what loaded at {istTime(updatedAt || Date.now())}. Practice and plan changes wait until you&apos;re back.</span>
          <span className="md:hidden">Showing what loaded at {istTime(updatedAt || Date.now())}.</span>
        </OfflineBanner>
      )}
      <div className="col gap-6 md:pt-1 max-md:gap-2 max-md:px-4 max-md:pt-2.5">
        <Doodle name="pendulum" slot="gl" style={{ top: 520 }} />
        <Doodle name="sine" slot="gr" style={{ top: 1140 }} />
        <header className="row between wrap gap-3 max-md:hidden">
          <div className="col gap-0.5">
            {ready ? (
              <Note size="sm" write rotate={-1.5} delay={150} className="self-start">
                {longDay(now)}
              </Note>
            ) : (
              <span className="h-6" />
            )}
            <h1 className="h1">
              <InkUnderline delay={450}>Progress</InkUnderline>
            </h1>
            {kind === "loading" ? <Skel className="mt-2.5 h-3.5 w-[180px]" /> : kind !== "error" && <span className="sm muted mt-2 min-h-5">{sub}</span>}
          </div>
          {tabs && (
            <div className="seg" role="tablist" aria-label="Range">
              {RANGES.map((r) => (
                <button key={r} type="button" role="tab" aria-selected={range === r} className={range === r ? "tab on" : "tab"} onClick={() => setRange(r)}>
                  {rangeChip(r)}
                </button>
              ))}
            </div>
          )}
        </header>

        {kind === "error" ? (
          <ProgressError error={error} onRetry={retry} />
        ) : kind === "loading" || !d ? (
          <ProgressSkeleton />
        ) : kind === "none30" ? (
          <NoneInRange />
        ) : kind === "empty" ? (
          <EmptyProgress />
        ) : kind === "one" ? (
          <>
            <OneDesktop d={d} now={now} plan={plan} />
            <OnePhone d={d} now={now} plan={plan} />
          </>
        ) : (
          <div className={q.isPlaceholderData && !fx ? "col gap-6 opacity-60 transition-opacity max-md:gap-2" : "col gap-6 max-md:gap-2"} aria-busy={(q.isPlaceholderData && !fx) || undefined}>
            <Desktop d={d} now={now} range={range} plan={plan} />
            <Phone d={d} now={now} range={range} plan={plan} />
          </div>
        )}
      </div>
    </>
  );
}

type PlanProps = React.ComponentProps<typeof PlanWeekCard>;

function countLine(d: ProgressResponse, range: ProgressRange): string {
  const n = `${d.testsCount} ${d.testsCount === 1 ? "test" : "tests"}`;
  if (range === "all" || !d.from) return `${n} in all`;
  return `${n} in the ${rangeLast(range)}`;
}

function ErrIcon() {
  return (
    <span className="st-ico red" aria-hidden="true">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" focusable="false">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7.5v5.5M12 16.5h.01" />
      </svg>
    </span>
  );
}

/** Student-Progress / Phone-Progress "Error": what failed, what is safe, Try again and a support code. */
function ProgressError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const code = `Code ${supportCode(error)}`;
  return (
    <>
      <section className="card pad-lg col items-center gap-2.5 px-6 py-[72px] text-center max-md:hidden" role="alert">
        <ErrIcon />
        <span className="h3">Couldn&apos;t load your progress</span>
        <span className="sm muted max-w-[420px]">Your results and your plan are safe. Try again in a moment.</span>
        <button type="button" className="btn btn-primary mt-1.5" onClick={onRetry}>
          Try again
        </button>
        <span className="xs muted mono">{code}</span>
      </section>
      <section className="col min-h-[calc(100dvh-220px)] items-center justify-center gap-2.5 px-2 text-center md:hidden" role="alert">
        <ErrIcon />
        <span className="h3">Couldn&apos;t load your progress</span>
        <span className="sm muted">Your results and your plan are safe.</span>
        <button type="button" className="btn btn-primary mt-1.5 h-11 w-full" onClick={onRetry}>
          Try again
        </button>
        <span className="xs muted mono">{code}</span>
      </section>
    </>
  );
}

/** 30 days with no result (older results exist in a longer range): not a board state, kept from M4. */
function NoneInRange() {
  return (
    <div className="card col fade items-center gap-2 p-12 text-center max-md:p-8">
      <span className="h3">No results in the last 30 days</span>
      <span className="sm muted max-w-[440px]">Results from the last 30 days show up here. Try a longer range, or take a test.</span>
      <Link href="/tests" className="btn btn-primary mt-2">
        Go to your tests
      </Link>
    </div>
  );
}

function QuestionRing({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" aria-hidden="true" focusable="false" className="flex-none">
      <circle cx="60" cy="60" r="48" fill="none" stroke="#D3D6E2" strokeWidth="10" strokeDasharray="6 8" />
      <text x="60" y="68" textAnchor="middle" fontFamily="Geist, system-ui, sans-serif" fontSize="24" fontWeight="600" fill="#A9ACC4">
        ?
      </text>
    </svg>
  );
}

/** Student-Progress / Phone-Progress "No tests yet". */
function EmptyProgress() {
  return (
    <>
      <div className="col gap-6 max-md:hidden">
        <section className="card pad-lg row wrap rise items-center gap-6">
          <QuestionRing size={96} />
          <div className="col grow gap-1.5" style={{ flex: "1 1 360px" }}>
            <span className="h3">Your progress starts with your first test</span>
            <span className="sm muted max-w-[560px]">After your first result, this page shows your score and accuracy, the chapters that cost you marks, and a study plan for the week.</span>
          </div>
          <Link href="/tests" className="btn btn-primary btn-lg">
            See your tests
          </Link>
        </section>
        <section className="grid grid-cols-3 gap-5 max-lg:grid-cols-1">
          <article className="card pad-lg col rise col-span-2 gap-3.5 max-lg:col-span-1" style={{ "--i": 1 } as React.CSSProperties}>
            <div className="col gap-0.5">
              <h2 className="h3">Score trend</h2>
              <span className="sm muted">Starts after 2 full tests</span>
            </div>
            <div className="pg-dash h-[200px]">
              <span className="sm muted">Your scores draw a line here, test by test.</span>
            </div>
          </article>
          <article className="ai pad-lg col rise gap-3" style={{ "--i": 2 } as React.CSSProperties}>
            <AiMark iconSize={14}>Weak topics</AiMark>
            <p className="body m-0">After your first result, AI picks the topics that cost you the most marks and tells you where to start.</p>
            <span className="xs muted">Nothing here yet.</span>
          </article>
        </section>
        <section className="card pad-lg col rise gap-1.5" style={{ "--i": 3 } as React.CSSProperties}>
          <h2 className="h3">This week&apos;s plan</h2>
          <span className="sm muted">Your study plan is made from your first result. It shows here a few minutes after the result opens.</span>
        </section>
      </div>
      <div className="col gap-2 md:hidden">
        <section className="card pad col rise gap-3">
          <div className="row gap-3.5">
            <QuestionRing size={72} />
            <div className="col gap-1">
              <span className="h3">Starts with your first test</span>
              <span className="sm muted">Then you see your score, weak chapters and a plan for the week.</span>
            </div>
          </div>
          <Link href="/tests" className="btn btn-primary h-11 w-full">
            See your tests
          </Link>
        </section>
        <section className="card pad col rise gap-2" style={{ "--i": 1 } as React.CSSProperties}>
          <div className="row between">
            <h2 className="h3">Score trend</h2>
            <span className="xs muted">After 2 full tests</span>
          </div>
          <div className="pg-dash h-24 px-3 text-center">
            <span className="sm muted">Your scores draw a line here, test by test.</span>
          </div>
        </section>
        <section className="ai pad col rise gap-2" style={{ "--i": 2 } as React.CSSProperties}>
          <AiMark iconSize={14}>Weak topics</AiMark>
          <span className="sm">After your first result, AI picks the topics that cost you the most marks.</span>
          <span className="xs muted">Nothing here yet.</span>
        </section>
        <section className="card pad col rise gap-1" style={{ "--i": 3 } as React.CSSProperties}>
          <h2 className="h3">Today&apos;s plan</h2>
          <span className="sm muted">Made from your first result. Until then, a practice set is a good start.</span>
        </section>
      </div>
    </>
  );
}

/** Student-Progress "Loading" (desktop) and Phone-Progress "Loading". */
function ProgressSkeleton() {
  return (
    <div className="col gap-6 max-md:gap-2" aria-busy="true" aria-label="Loading your progress">
      <div className="grid grid-cols-4 gap-4 max-lg:grid-cols-2 max-md:hidden">
        {[0, 1, 2, 3].map((k) => (
          <Skel key={k} className="h-[118px] rounded-card" />
        ))}
      </div>
      <div className="grid grid-cols-5 gap-5 max-md:hidden">
        <Skel className="col-span-3 h-[440px] rounded-card" />
        <Skel className="col-span-2 h-[440px] rounded-card" />
      </div>
      <section className="card pad-lg col gap-4 max-md:hidden">
        <Skel className="h-[18px] w-[200px]" />
        <div className="wk">
          {[0, 1, 2, 3, 4, 5, 6].map((k) => (
            <Skel key={k} className="h-[150px] rounded-[14px]" />
          ))}
        </div>
      </section>
      <div className="grid grid-cols-2 gap-5 max-md:hidden">
        <Skel className="h-[230px] rounded-card" />
        <Skel className="h-[230px] rounded-card" />
      </div>
      <Skel className="h-[158px] rounded-card md:hidden" />
      <Skel className="h-[300px] rounded-card md:hidden" />
      <Skel className="h-[250px] rounded-card md:hidden" />
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// One test (Student-Progress / Phone-Progress "One test")
// ---------------------------------------------------------------------------------------------

function oneModel(d: ProgressResponse) {
  const p = d.scoreTrend[d.scoreTrend.length - 1] ?? null;
  const full = d.headline.average?.basis !== "allTests";
  const score = d.headline.average?.score ?? p?.score ?? null;
  const max = d.headline.average?.maxScore ?? p?.maxScore ?? null;
  const short = p?.shortName ?? d.headline.bestRank?.testShortName ?? "";
  return { p, full, score, max, short };
}

/** The one point and a dashed "Next" ghost (Student-Progress "One test"), with a 3-line scale around the score. */
function OneChart({ d, phone }: { d: ProgressResponse; phone?: boolean }) {
  const m = oneModel(d);
  if (m.score === null) return null;
  const label = `One ${m.full ? "full mock" : "test"} so far: ${m.short}, ${num(m.score)} out of ${num(m.max ?? 0)}. The trend line starts after your second test.`;
  const font = "Geist, system-ui, sans-serif";
  if (phone)
    return (
      <svg viewBox="0 0 320 96" style={{ width: "100%", height: 96 }} role="img" aria-label={label}>
        <path d="M4 76H316" stroke="#EEF0F5" strokeWidth="1" />
        <circle cx="24" cy="46" r="6" fill="#00007E" />
        <text x="36" y="40" fontFamily={font} fontSize="12" fontWeight="600" fill="#0D0F2B">
          {num(m.score)}
        </text>
        <path d="M32 46H98" stroke="#C3C6EF" strokeWidth="2" strokeDasharray="4 5" />
        <circle cx="106" cy="46" r="6" fill="none" stroke="#A9ACC4" strokeWidth="1.5" strokeDasharray="3 3" />
        <g fontFamily={font} fontSize="11" fill="#575C75">
          <text x="24" y="92" textAnchor="middle">
            {m.short}
          </text>
          <text x="106" y="92" textAnchor="middle">
            Next
          </text>
        </g>
      </svg>
    );
  const step = STEPS.find((s) => s >= (m.max ?? m.score!) / 6) ?? 500;
  const min = Math.floor(m.score / step) * step;
  const TOP = 31, BOT = 140;
  const y = BOT - ((m.score - min) / (2 * step)) * (BOT - TOP);
  return (
    <svg viewBox="0 0 520 172" style={{ width: "100%", height: 172 }} role="img" aria-label={label}>
      <g stroke="#EEF0F5" strokeWidth="1">
        <path d={`M44 ${TOP}H512M44 ${(TOP + BOT) / 2}H512M44 ${BOT}H512`} />
      </g>
      <circle cx="44" cy={y} r="6" fill="#00007E" />
      <text x="56" y={y - 4.8} fontFamily={font} fontSize="12" fontWeight="600" fill="#0D0F2B">
        {num(m.score)}
      </text>
      <circle cx="135" cy={y} r="6" fill="none" stroke="#A9ACC4" strokeWidth="1.5" strokeDasharray="3 3" />
      <path d={`M52 ${y}H127`} stroke="#C3C6EF" strokeWidth="2" strokeDasharray="4 5" />
      <g fontFamily={font} fontSize="11" fill="#575C75">
        <text x="0" y={TOP + 4}>
          {min + 2 * step}
        </text>
        <text x="0" y={(TOP + BOT) / 2 + 4}>
          {min + step}
        </text>
        <text x="0" y={BOT + 4}>
          {min}
        </text>
        <text x="44" y="164" textAnchor="middle">
          {m.short}
        </text>
        <text x="135" y="164" textAnchor="middle">
          Next
        </text>
      </g>
    </svg>
  );
}

function OneDesktop({ d, now, plan }: { d: ProgressResponse; now: number; plan: PlanProps }) {
  const m = oneModel(d);
  const h = d.headline;
  const tile = (i: number, label: string, value: React.ReactNode, foot: string) => (
    <article className="card pad col cl-lift rise gap-1.5" style={{ "--i": i } as React.CSSProperties}>
      <span className="sm muted">{label}</span>
      <span className="num text-[32px] font-[650] leading-tight">{value}</span>
      <span className="xs muted">{foot}</span>
    </article>
  );
  const dash = <span className="muted">–</span>;
  return (
    <div className="col gap-6 max-md:hidden">
      <section className="grid grid-cols-4 gap-4 max-lg:grid-cols-2" aria-label="Headline numbers">
        {tile(
          0,
          "Score",
          m.score !== null ? (
            <>
              {num(m.score)}
              <span className="sm muted">/{num(m.max ?? 0)}</span>
            </>
          ) : (
            dash
          ),
          `${m.short} · your first ${m.full ? "full mock" : "test"}`
        )}
        {tile(1, "Accuracy", h.accuracy ? `${h.accuracy.percent}%` : dash, "From 1 test")}
        {tile(2, "Time per question", h.timePerQuestion ? mmss(h.timePerQuestion.seconds) : dash, "From 1 test")}
        {tile(3, "Rank", h.bestRank ? num(h.bestRank.rank) : dash, h.bestRank ? `${h.bestRank.testShortName} · of ${num(h.bestRank.of)}` : "Ranks appear once a test has closed")}
      </section>
      <section className="grid grid-cols-5 gap-5 max-lg:grid-cols-1">
        <article className="card pad-lg col rise col-span-3 gap-3 max-lg:col-span-1" style={{ "--i": 4 } as React.CSSProperties}>
          <div className="row between wrap items-start gap-2">
            <div className="col gap-0.5">
              <h2 className="h3">{m.full ? "Full mock scores" : "Test scores"}</h2>
              <span className="xs muted">Your trend line starts after 2 tests</span>
            </div>
            {m.score !== null && (
              <span className="row gap-2">
                <span className="num h3">{num(m.score)}</span>
                <span className="badge b-grey">First test</span>
              </span>
            )}
          </div>
          <OneChart d={d} />
        </article>
        <article className="card pad-lg col rise col-span-2 gap-3.5 max-lg:col-span-1" style={{ "--i": 5 } as React.CSSProperties} aria-labelledby="weak-one-h">
          <div className="col gap-0.5">
            <h2 id="weak-one-h" className="h3">
              Weak topics from {m.short}
            </h2>
            <span className="xs muted">From one test, so these can still change</span>
          </div>
          {d.weakTopics.length === 0 && <span className="sm muted">Nothing stands out yet. Chapters with 6 or more questions in this range are compared here.</span>}
          {d.weakTopics.map((w, i) => (
            <div key={`${w.subject}-${w.chapter}-${w.topic ?? ""}`} className="col gap-1.5 border-t border-line-2 pt-3.5">
              <div className="row between gap-2">
                <span className="h3 min-w-0">{topicTitle(w)}</span>
                <span className={`badge ${i === 0 ? "b-wrong" : "b-amber"}`}>{w.percent}%</span>
              </div>
              <span className="sm muted">{w.insight.text}</span>
              <PracticeButton req={{ ...w.action.practice, source: { kind: "progress" } }} label={w.action.label} now={now} />
            </div>
          ))}
        </article>
      </section>
      <PlanWeekCard {...plan} />
    </div>
  );
}

function OnePhone({ d, now, plan }: { d: ProgressResponse; now: number; plan: PlanProps }) {
  const m = oneModel(d);
  return (
    <div className="col gap-2 md:hidden">
      <section className="card pad col rise gap-1" aria-label={m.full ? "Full mock scores" : "Test scores"}>
        <div className="row between gap-2">
          <span className="sm muted">{m.full ? "Full mock scores" : "Test scores"}</span>
          {m.score !== null && (
            <span className="row gap-2">
              <span className="num h3">{num(m.score)}</span>
              <span className="badge b-grey">First test</span>
            </span>
          )}
        </div>
        <OneChart d={d} phone />
        <span className="xs muted">Your trend line starts after 2 tests</span>
      </section>
      <section className="card pad col rise gap-2" style={{ "--i": 1 } as React.CSSProperties} aria-labelledby="weak-one-ph">
        <div className="row between gap-2">
          <h2 id="weak-one-ph" className="h3">
            Weak topics
          </h2>
          <span className="xs muted">From {m.short} only</span>
        </div>
        {d.weakTopics.length === 0 && <span className="sm muted">Nothing stands out yet. Keep taking tests.</span>}
        {d.weakTopics.map((w) => (
          <WeakRow key={`${w.subject}-${w.chapter}-${w.topic ?? ""}`} w={w} now={now} />
        ))}
      </section>
      <PlanTodayCard {...plan} />
    </div>
  );
}

/** Phone-Progress: one weak topic with its bar, the reason and the practice button. */
function WeakRow({ w, now, first }: { w: WeakTopic; now: number; first?: boolean }) {
  return (
    <div className="col gap-[5px]">
      <div className="row sm gap-1.5">
        <b className="min-w-0">{topicTitle(w)}</b>
        {first && (
          <>
            <InkArrow delay={1300} style={{ marginTop: 2 }} />
            <Note tone="pen" size="sm" write rotate={-3} delay={1500}>
              start here
            </Note>
          </>
        )}
        <span className="num muted ml-auto">{w.percent}%</span>
      </div>
      <Bar value={w.percent} max={100} color="var(--navy-500)" style={{ height: 6, background: "var(--navy-100)" }} label={`${topicTitle(w)}: ${w.percent}% correct`} />
      <span className="xs muted">{w.insight.text}</span>
      <PracticeButton req={{ ...w.action.practice, source: { kind: "progress" } }} label={w.action.label} now={now} className="btn btn-secondary btn-sm mt-0.5 h-11" />
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Desktop (Student-Progress)
// ---------------------------------------------------------------------------------------------

function Desktop({ d, now, range, plan }: { d: ProgressResponse; now: number; range: ProgressRange; plan: PlanProps }) {
  return (
    <div className="col gap-6 max-md:hidden">
      <Tiles d={d} range={range} />
      <section className="grid grid-cols-5 gap-5 max-lg:grid-cols-1">
        <Heatmap d={d} />
        <HoldingBack d={d} now={now} />
      </section>
      <PlanWeekCard {...plan} />
      <section className="grid grid-cols-2 gap-5 max-lg:grid-cols-1">
        <article className="card pad-lg col rise gap-3" style={{ "--i": 7 } as React.CSSProperties}>
          <h2 className="h3">Strengths to keep</h2>
          {d.strengths.length ? (
            <div className="row wrap gap-2">
              {d.strengths.map((s) => (
                <span key={`${s.subject}-${s.chapter}`} className="badge b-green" title={s.subject}>
                  {s.chapter} {s.percent}%
                </span>
              ))}
            </div>
          ) : (
            <span className="sm muted">Chapters you get right most of the time (8 or more questions) show up here.</span>
          )}
        </article>
        <ScoresCard d={d} />
      </section>
    </div>
  );
}

/** "Mock 6": the first test's name without the words it shares with the last ("JEE Main"); its short name when that is still long. */
function sinceName(last: { name: string }, first: { name: string; shortName: string }): string {
  const n = shortPair(last.name, first.name)[1];
  return n.split(/\s+/).length > 2 ? first.shortName : n;
}

/** The trend's numbers: marks, or percent of marks when the tests have different totals. */
function trendModel(d: ProgressResponse) {
  const pts = d.scoreTrend;
  const pct = new Set(pts.map((p) => p.maxScore)).size > 1;
  const full = d.headline.average?.basis !== "allTests";
  const first = pts[0];
  const last = pts[pts.length - 1];
  const val = (p: (typeof pts)[number]) => (pct ? p.percent : p.score);
  const fmt = (p: (typeof pts)[number]) => (pct ? `${p.percent}%` : num(p.score));
  const diff = first && last && pts.length > 1 ? val(last) - val(first) : null;
  // "since Mock 6": the first test's name without the words it shares with the last one ("JEE Main")
  const since = first && last ? sinceName(last, first) : "";
  const delta = diff === null ? null : `${diff >= 0 ? "+" : "−"}${num(Math.abs(diff))}${pct ? " points" : ""} since ${since}`;
  return { pts, pct, full, first, last, val, fmt, diff, delta };
}

/** Student-Progress "Full mock scores" (where the board's revision list was): the trend with a 3-line scale. */
function ScoresCard({ d }: { d: ProgressResponse }) {
  const t = trendModel(d);
  const n = t.pts.length;
  const sub = t.pct
    ? "% of marks · these tests have different totals"
    : `Last ${n === 1 ? "" : `${n} `}${t.full ? (n === 1 ? "full mock" : "full mocks") : n === 1 ? "test" : "tests"}${t.last ? ` · out of ${num(t.last.maxScore)}` : ""}`;
  return (
    <article className="card pad-lg col rise gap-2.5" style={{ "--i": 8 } as React.CSSProperties}>
      <div className="row between wrap items-start gap-2">
        <div className="col gap-0.5">
          <h2 className="h3">{t.full ? "Full mock scores" : "Test scores"}</h2>
          <span className="xs muted">{sub}</span>
        </div>
        {t.last && (
          <span className="row gap-2">
            <span className="num h3">{t.fmt(t.last)}</span>
            {t.delta && t.diff !== null && <DeltaPill v={t.diff} text={t.delta} />}
          </span>
        )}
      </div>
      {n < 2 ? (
        <div className="col items-center justify-center gap-1 py-8 text-center">
          <span className="sm font-semibold">{n ? "One test so far" : "No scores yet"}</span>
          <span className="sm muted">Your trend appears after two tests.</span>
        </div>
      ) : (
        <ScaleChart t={t} />
      )}
    </article>
  );
}

const STEPS = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500];
function ScaleChart({ t }: { t: ReturnType<typeof trendModel> }) {
  const vals = t.pts.map(t.val);
  const lo = Math.min(...vals);
  const hi = Math.max(...vals);
  // three gridlines: the smallest step whose two intervals hold every point
  const step = STEPS.find((s) => Math.floor(lo / s) * s + 2 * s >= hi) ?? 500;
  const min = Math.floor(lo / step) * step;
  const max = min + 2 * step;
  const X0 = 44, X1 = 499, TOP = 31, BOT = 140;
  const x = (i: number) => X0 + ((X1 - X0) * i) / (t.pts.length - 1);
  const y = (v: number) => BOT - ((v - min) / (max - min)) * (BOT - TOP);
  const line = t.pts.map((p, i) => `${x(i).toFixed(1)},${y(t.val(p)).toFixed(1)}`).join(" ");
  const every = t.pts.length > 8 ? 2 : 1;
  const label = `${t.full ? "Full mock scores" : "Test scores"} ${t.pct ? "as percent of marks" : `out of ${num(t.last!.maxScore)}`}: ${t.pts.map((p) => `${p.shortName} ${t.fmt(p)}`).join(", ")}`;
  return (
    <svg viewBox="0 0 520 172" style={{ width: "100%", height: 172 }} role="img" aria-label={label}>
      <g stroke="#EEF0F5" strokeWidth="1">
        <path d={`M${X0} ${TOP}H512M${X0} ${(TOP + BOT) / 2}H512M${X0} ${BOT}H512`} />
      </g>
      <path d={`M${line.split(" ").join(" L")} L${X1} ${BOT} L${X0} ${BOT} Z`} fill="#F1F2FC" className="fade" />
      <polyline className="draw-lg" points={line} fill="none" stroke="#00007E" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <g fill="#00007E">
        {t.pts.map((p, i) => (
          <circle key={p.testId} cx={x(i)} cy={y(t.val(p))} r={i === t.pts.length - 1 ? 5 : 3.5}>
            <title>{`${p.name}: ${num(p.score)} of ${num(p.maxScore)}`}</title>
          </circle>
        ))}
      </g>
      <g fontFamily="Geist, system-ui, sans-serif" fontSize="11" fill="#575C75">
        {[max, min + step, min].map((v, k) => (
          <text key={k} x="0" y={[TOP, (TOP + BOT) / 2, BOT][k]! + 4}>
            {t.pct ? `${v}%` : v}
          </text>
        ))}
        {t.pts.map((p, i) =>
          (t.pts.length - 1 - i) % every === 0 ? (
            <text key={p.testId} x={x(i)} y="164" textAnchor="middle">
              {p.shortName}
            </text>
          ) : null
        )}
      </g>
    </svg>
  );
}

function DeltaPill({ v, text }: { v: number; text: string }) {
  const up = v >= 0;
  return (
    <span className={up ? "delta self-start" : "delta down self-start"}>
      {up ? <ArrowUpIcon /> : <ArrowDownIcon />}
      {text}
    </span>
  );
}

function Tiles({ d, range }: { d: ProgressResponse; range: ProgressRange }) {
  const h = d.headline;
  const tile = (i: number, label: string, value: React.ReactNode, foot: React.ReactNode) => (
    <article className="card pad col cl-lift rise gap-1.5" style={{ "--i": i } as React.CSSProperties}>
      <span className="sm muted">{label}</span>
      <span className="num text-[32px] font-[650] leading-tight">{value}</span>
      {foot}
    </article>
  );
  const dash = <span className="muted">–</span>;
  return (
    <section className="grid grid-cols-4 gap-4 max-lg:grid-cols-2" aria-label="Headline numbers">
      {tile(
        0,
        h.average?.basis === "allTests" ? "Average (all tests)" : "Average (full mocks)",
        h.average ? (
          <>
            {num(h.average.score)}
            <span className="sm muted">/{num(h.average.maxScore)}</span>
          </>
        ) : (
          dash
        ),
        h.average?.deltaSinceFrom != null ? (
          <DeltaPill v={h.average.deltaSinceFrom} text={`${h.average.deltaSinceFrom >= 0 ? "+" : "−"}${num(Math.abs(h.average.deltaSinceFrom))} ${rangeSince(range)}`} />
        ) : (
          <span className="xs muted">{h.average ? "" : "No scores yet"}</span>
        )
      )}
      {tile(
        1,
        "Accuracy",
        h.accuracy ? `${h.accuracy.percent}%` : dash,
        h.accuracy?.deltaPoints != null ? (
          <DeltaPill v={h.accuracy.deltaPoints} text={`${h.accuracy.deltaPoints >= 0 ? "+" : "−"}${num(Math.abs(h.accuracy.deltaPoints))} ${Math.abs(h.accuracy.deltaPoints) === 1 ? "point" : "points"}`} />
        ) : (
          <span className="xs muted">{h.accuracy ? "Questions right of those you answered" : "No answers yet"}</span>
        )
      )}
      {tile(
        2,
        "Time per question",
        h.timePerQuestion ? mmss(h.timePerQuestion.seconds) : dash,
        <span className="xs muted">
          {h.timePerQuestion?.targetSeconds != null
            ? `Target ${mmss(h.timePerQuestion.targetSeconds)}${h.timePerQuestion.targetLabel ? ` for ${h.timePerQuestion.targetLabel}` : ""}`
            : h.timePerQuestion
              ? "Average over answered questions"
              : "No timing yet"}
        </span>
      )}
      {tile(
        3,
        "Best rank",
        h.bestRank ? num(h.bestRank.rank) : dash,
        <span className="xs muted">{h.bestRank ? `${h.bestRank.testShortName} · of ${num(h.bestRank.of)}` : "Ranks appear once a test has closed"}</span>
      )}
    </section>
  );
}

/** The board's 4-step navy scale; below 45% also gets the red ring. */
function heat(v: number) {
  const bg = v < 45 ? "#E9EAF8" : v < 65 ? "#B9BCEB" : v < 85 ? "#5A5FD0" : "#00007E";
  return { background: bg, color: v >= 65 ? "#fff" : "#2B2F4A" };
}

function Heatmap({ d }: { d: ProgressResponse }) {
  const { tests, rows } = d.chapterMastery;
  const cols = `minmax(120px, 180px) repeat(${Math.max(1, tests.length)}, minmax(0, 1fr))`;
  return (
    <article className="card pad-lg col rise col-span-3 gap-4 max-lg:col-span-1" style={{ "--i": 4 } as React.CSSProperties} aria-labelledby="mastery-h">
      <div className="row between wrap gap-3">
        <div className="col gap-0.5">
          <h2 id="mastery-h" className="h3">
            Chapter mastery
          </h2>
          <span className="xs muted">Share of questions correct, last {tests.length === 1 ? "test" : `${tests.length} tests`}</span>
        </div>
        <div className="row wrap xs muted justify-end gap-3" aria-hidden="true">
          <span className="row gap-1.5">
            Low
            {["#E9EAF8", "#B9BCEB", "#5A5FD0", "#00007E"].map((c) => (
              <span key={c} className="hm-key" style={{ background: c }} />
            ))}
            High
          </span>
          <span className="row gap-1.5">
            <span className="hm-key" style={{ background: "#E9EAF8", boxShadow: "inset 0 0 0 2px #C40000" }} />
            Below 45%
          </span>
        </div>
      </div>
      {d.heldBackCount > 0 && (
        <span className="xs muted">
          {d.heldBackCount === 1 ? "1 test counts in your scores only until its answers open for everyone." : `${d.heldBackCount} tests count in your scores only until their answers open for everyone.`}
        </span>
      )}
      {rows.length === 0 ? (
        <span className="sm muted py-6">Chapter data appears once answers are open for your tests.</span>
      ) : (
        <div className="col gap-1.5" role="table" aria-label="Chapter mastery by test">
          {rows.map((r) => (
            <div key={`${r.subject}-${r.chapter}`} role="row" className="grid items-center gap-1.5" style={{ gridTemplateColumns: cols }}>
              <span role="rowheader" className="sm truncate font-[550]" title={`${r.chapter} · ${r.subject} · ${r.overallPercent}% overall`}>
                {r.chapter}
              </span>
              {tests.map((t) => {
                const c = r.cells.find((x) => x.testId === t.testId);
                const v = c?.percent ?? null;
                const label = `${r.chapter} ${t.shortName}: ${v === null ? "not in this test" : `${v}%`}`;
                return v === null ? (
                  <span key={t.testId} role="cell" className="hm none" title={label} aria-label={label}>
                    –
                  </span>
                ) : (
                  <span key={t.testId} role="cell" className={v < 45 ? "hm low" : "hm"} style={heat(v)} title={label} aria-label={label}>
                    {v}
                  </span>
                );
              })}
            </div>
          ))}
          <div className="xs muted grid gap-1.5" style={{ gridTemplateColumns: cols }} aria-hidden="true">
            <span />
            {tests.map((t) => (
              <span key={t.testId} className="truncate">
                {t.shortName}
              </span>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}

function topicTitle(w: WeakTopic) {
  return w.topic ? `${w.chapter} · ${w.topic}` : w.chapter;
}

function HoldingBack({ d, now }: { d: ProgressResponse; now: number }) {
  return (
    <article className="card pad-lg col rise col-span-2 gap-3.5 max-lg:col-span-1" style={{ "--i": 5 } as React.CSSProperties} aria-labelledby="holding-h">
      <h2 id="holding-h" className="h3">
        What&apos;s holding you back
      </h2>
      {d.weakTopics.length === 0 && <span className="sm muted">Nothing stands out yet. Chapters with 6 or more questions in this range are compared here.</span>}
      {d.weakTopics.map((w, i) => (
        <div key={`${w.subject}-${w.chapter}-${w.topic ?? ""}`} className="col gap-1.5 border-t border-line-2 pt-3.5">
          <div className="row gap-1.5">
            <span className="h3 min-w-0">{topicTitle(w)}</span>
            {i === 0 && (
              <>
                <InkArrow delay={1300} style={{ marginTop: 2 }} />
                <Note tone="pen" size="sm" write rotate={-3} delay={1500}>
                  start here
                </Note>
              </>
            )}
            <span className={`badge ml-auto ${i === 0 ? "b-wrong" : "b-amber"}`}>{w.percent}%</span>
          </div>
          <span className="sm muted">{w.insight.text}</span>
          <PracticeButton req={{ ...w.action.practice, source: { kind: "progress" } }} label={w.action.label} now={now} />
        </div>
      ))}
    </article>
  );
}

// ---------------------------------------------------------------------------------------------
// Score trend (both layouts), plain SVG
// ---------------------------------------------------------------------------------------------

function TrendSvg({ d, big }: { d: ProgressResponse; big?: boolean }) {
  const pts = d.scoreTrend;
  if (pts.length < 2)
    return (
      <div className="col items-center justify-center gap-1 py-8 text-center">
        <span className="sm font-semibold">{pts.length ? "One test so far" : "No scores yet"}</span>
        <span className="sm muted">Your trend appears after two tests.</span>
      </div>
    );
  const W = big ? 520 : 320;
  const X0 = big ? 24 : 4;
  const X1 = W - X0;
  const TOP = big ? 30 : 22;
  const BOT = big ? 110 : 70;
  const BASE = big ? 128 : 88;
  const LABEL_Y = big ? 150 : 104;
  const H = big ? 160 : 110;
  // Tests with different totals (a 180-mark practice mock next to 300-mark mocks): plot the percent of marks.
  const pct = new Set(pts.map((p) => p.maxScore)).size > 1;
  const val = (p: (typeof pts)[number]) => (pct ? p.percent : p.score);
  const fmt = (p: (typeof pts)[number]) => (pct ? `${p.percent}%` : num(p.score));
  const vals = pts.map(val);
  const lo = Math.min(...vals);
  const hi = Math.max(...vals);
  const x = (i: number) => X0 + ((X1 - X0) * i) / (pts.length - 1);
  const y = (v: number) => (hi === lo ? (TOP + BOT) / 2 : BOT - ((v - lo) / (hi - lo)) * (BOT - TOP));
  const line = pts.map((p, i) => `${x(i).toFixed(1)},${y(val(p)).toFixed(1)}`).join(" ");
  const first = pts[0]!;
  const last = pts[pts.length - 1]!;
  const label = `${pct ? "Percent of marks" : "Scores"} from ${fmt(first)} in ${first.shortName} to ${fmt(last)} in ${last.shortName}`;
  const every = pts.length > 8 ? 2 : 1;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: big ? 190 : 110 }} role="img" aria-label={label}>
      <path d={`M${line.split(" ").join(" L")} L${x(pts.length - 1).toFixed(1)} ${BASE} L${X0} ${BASE} Z`} fill="#F1F2FC" className="fade" />
      <polyline className="draw-sm" points={line} fill="none" stroke="var(--navy)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => (
        <circle key={p.testId} cx={x(i)} cy={y(val(p))} r={i === pts.length - 1 ? 5 : big ? 3.5 : 0} fill={i === pts.length - 1 ? "var(--navy)" : "#fff"} stroke="var(--navy)" strokeWidth={i === pts.length - 1 ? 0 : 2}>
          <title>{`${p.name}: ${num(p.score)} of ${num(p.maxScore)}`}</title>
        </circle>
      ))}
      <g fontFamily="var(--font-sans)" fontSize="11" fill="#575C75">
        <text x={x(0)} y={y(val(first)) - 10} textAnchor="start">
          {fmt(first)}
        </text>
        {big && (
          <text x={x(pts.length - 1)} y={y(val(last)) - 12} textAnchor="end" fontWeight="600" fill="#0D0F2B">
            {fmt(last)}
          </text>
        )}
        {pts.map((p, i) =>
          (pts.length - 1 - i) % every === 0 ? (
            <text key={p.testId} x={x(i)} y={LABEL_Y} textAnchor={i === 0 ? "start" : i === pts.length - 1 ? "end" : "middle"}>
              {p.shortName}
            </text>
          ) : null
        )}
      </g>
    </svg>
  );
}

// ---------------------------------------------------------------------------------------------
// Phone (Phone-Progress)
// ---------------------------------------------------------------------------------------------

function Phone({ d, now, range, plan }: { d: ProgressResponse; now: number; range: ProgressRange; plan: PlanProps }) {
  const t = trendModel(d);
  return (
    <div className="col gap-2 md:hidden">
      <section className="card pad col rise gap-1" aria-label={t.full ? "Full mock scores" : "Test scores"}>
        <div className="row between gap-2">
          <span className="sm muted">{t.full ? "Full mock scores" : "Test scores"}</span>
          {t.last && (
            <span className="row gap-2">
              <span className="num h3">{t.fmt(t.last)}</span>
              {t.diff !== null && t.first && (
                <span className={t.diff >= 0 ? "badge b-green" : "badge b-grey"}>
                  {t.diff >= 0 ? "▲" : "▼"} {num(Math.abs(t.diff))}
                  {t.pct ? " points" : ""} since {sinceName(t.last, t.first)}
                </span>
              )}
            </span>
          )}
        </div>
        <TrendSvg d={d} />
      </section>

      <section className="card pad col rise gap-2" style={{ "--i": 1 } as React.CSSProperties} aria-labelledby="focus-h">
        <div className="row between gap-2">
          <h2 id="focus-h" className="h3">
            Focus on these
          </h2>
          <span className="xs muted">Accuracy, {rangeLast(range)}</span>
        </div>
        {d.weakTopics.length === 0 && <span className="sm muted">Nothing stands out yet. Keep taking tests.</span>}
        {d.weakTopics.map((w, i) => (
          <WeakRow key={`${w.subject}-${w.chapter}-${w.topic ?? ""}`} w={w} now={now} first={i === 0} />
        ))}
      </section>

      <PlanTodayCard {...plan} />
    </div>
  );
}
