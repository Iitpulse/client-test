"use client";

import Link from "next/link";
import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { AiMark, Bar, Doodle, InkArrow, InkUnderline, Note } from "@iitpulse/ui";
import { m4Api, m4Keys } from "@/lib/m4-api";
import { useServerClock } from "@/lib/server-clock";
import { dayMonth, ist, longDay, mmss } from "@/lib/time";
import type { ProgressRange, ProgressResponse, WeakTopic } from "@/types/m4";
import { PhoneTitleBar } from "@/components/shell/phone-title-bar";
import { ErrorCard, Skel } from "./common";
import { ArrowDownIcon, ArrowUpIcon } from "./icons";
import { num } from "./labels";
import { PracticeButton } from "./practice-button";
import { PlanTodayCard, PlanWeekCard } from "./study-plan";

/**
 * /progress: Student-Progress (desktop) and Phone-Progress (phone), from GET /tests/student/progress?range=.
 * Desktop: headline tiles, chapter mastery heatmap, "What's holding you back" (the first one "start here"),
 * "This week's plan" (study-plan.tsx), strengths and the score trend (where the board's revision list was: the
 * revision list is not in M4). Phone: the score trend, "Focus on these" and today's part of the plan.
 * Charts are plain SVG. Exam, subject and chapter names are data.
 */

const RANGES: ProgressRange[] = ["30d", "90d", "all"];

function rangeChip(r: ProgressRange, now: number): string {
  if (r === "30d") return "30 days";
  if (r === "all") return "All time";
  const p = ist(now - 90 * 86_400_000);
  return `Since ${p.mon}`;
}
/** "since Sep" / "in 30 days" for deltas and captions */
function rangeSince(r: ProgressRange, now: number): string {
  if (r === "30d") return "in 30 days";
  if (r === "all") return "in all";
  return `since ${ist(now - 90 * 86_400_000).mon}`;
}

export function ProgressView() {
  const [range, setRange] = useState<ProgressRange>("90d");
  const q = useQuery({
    queryKey: m4Keys.progress(range),
    queryFn: ({ signal }) => m4Api.progress(range, signal),
    placeholderData: keepPreviousData,
  });
  const d = q.data;
  const now = useServerClock(d?.now, q.dataUpdatedAt, false);
  const ready = !!d && !Number.isNaN(now);

  return (
    <>
      <PhoneTitleBar title="Progress" />
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
            <span className="sm muted mt-2 min-h-5">{ready ? countLine(d, range) : ""}</span>
          </div>
          <div className="seg" role="tablist" aria-label="Range">
            {RANGES.map((r) => (
              <button key={r} type="button" role="tab" aria-selected={range === r} className={range === r ? "tab on" : "tab"} onClick={() => setRange(r)}>
                {ready ? rangeChip(r, now) : r === "30d" ? "30 days" : r === "all" ? "All time" : "90 days"}
              </button>
            ))}
          </div>
        </header>

        {!d ? (
          q.isError ? (
            <ErrorCard error={q.error} onRetry={() => q.refetch()} />
          ) : (
            <ProgressSkeleton />
          )
        ) : d.testsCount === 0 ? (
          <FirstTestCard range={range} />
        ) : (
          <div className={q.isPlaceholderData ? "col gap-6 opacity-60 transition-opacity max-md:gap-2" : "col gap-6 max-md:gap-2"} aria-busy={q.isPlaceholderData || undefined}>
            <Desktop d={d} now={now} range={range} />
            <Phone d={d} now={now} range={range} />
          </div>
        )}
      </div>
    </>
  );
}

function countLine(d: ProgressResponse, range: ProgressRange): string {
  const n = `${d.testsCount} ${d.testsCount === 1 ? "test" : "tests"}`;
  if (range === "all" || !d.from) return `${n} in all`;
  return `${n} since ${dayMonth(d.from)}`;
}

function FirstTestCard({ range }: { range: ProgressRange }) {
  return (
    <div className="card col fade items-center gap-2 p-12 text-center max-md:p-8">
      <span className="h3">{range === "30d" ? "No results in the last 30 days" : "Take your first test"}</span>
      <span className="sm muted max-w-[440px]">
        {range === "30d"
          ? "Results from the last 30 days show up here. Try a longer range, or take a test."
          : "Your scores, the chapters to work on and a study plan for the week appear here after your first result."}
      </span>
      <Link href="/tests" className="btn btn-primary mt-2">
        Go to your tests
      </Link>
    </div>
  );
}

function ProgressSkeleton() {
  return (
    <div className="col gap-6 max-md:gap-2" aria-busy="true" aria-label="Loading your progress">
      <div className="grid grid-cols-4 gap-4 max-lg:grid-cols-2 max-md:hidden">
        {[0, 1, 2, 3].map((k) => (
          <Skel key={k} className="h-[118px] rounded-card" />
        ))}
      </div>
      <div className="grid grid-cols-5 gap-5 max-md:hidden">
        <Skel className="col-span-3 h-[420px] rounded-card" />
        <Skel className="col-span-2 h-[420px] rounded-card" />
      </div>
      <Skel className="h-[160px] rounded-card md:hidden" />
      <Skel className="h-[200px] rounded-card md:hidden" />
      <Skel className="h-[220px] rounded-card md:hidden" />
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Desktop (Student-Progress)
// ---------------------------------------------------------------------------------------------

function Desktop({ d, now, range }: { d: ProgressResponse; now: number; range: ProgressRange }) {
  return (
    <div className="col gap-6 max-md:hidden">
      <Tiles d={d} now={now} range={range} />
      <section className="grid grid-cols-5 gap-5 max-lg:grid-cols-1">
        <Heatmap d={d} />
        <HoldingBack d={d} now={now} />
      </section>
      <PlanWeekCard now={now} />
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
        <article className="card pad-lg col rise gap-2" style={{ "--i": 8 } as React.CSSProperties}>
          <div className="col gap-0.5">
            <h2 className="h3">Score trend</h2>
            <span className="xs muted">{trendCaption(d)}</span>
          </div>
          <TrendSvg d={d} big />
        </article>
      </section>
    </div>
  );
}

function trendCaption(d: ProgressResponse): string {
  const n = d.scoreTrend.length;
  const full = d.headline.average?.basis === "fullMocks";
  const pct = new Set(d.scoreTrend.map((p) => p.maxScore)).size > 1;
  return `${full ? `Full mocks` : "All tests"}, last ${n === 1 ? "one" : n}${pct ? " · percent of marks" : ""}`;
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

function Tiles({ d, now, range }: { d: ProgressResponse; now: number; range: ProgressRange }) {
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
          <DeltaPill v={h.average.deltaSinceFrom} text={`${h.average.deltaSinceFrom >= 0 ? "+" : "−"}${num(Math.abs(h.average.deltaSinceFrom))} ${rangeSince(range, now)}`} />
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
    <article className="ai pad-lg col rise col-span-2 gap-3.5 max-lg:col-span-1" style={{ "--i": 5 } as React.CSSProperties} aria-label="What's holding you back">
      <AiMark>What&apos;s holding you back</AiMark>
      {d.weakTopics.length === 0 && <span className="sm muted">Nothing stands out yet. Chapters with 6 or more questions in this range are compared here.</span>}
      {d.weakTopics.map((w, i) => (
        <div key={`${w.subject}-${w.chapter}-${w.topic ?? ""}`} className="card pad col gap-1.5">
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

function Phone({ d, now, range }: { d: ProgressResponse; now: number; range: ProgressRange }) {
  const pts = d.scoreTrend;
  const first = pts[0];
  const last = pts[pts.length - 1];
  const pct = new Set(pts.map((p) => p.maxScore)).size > 1;
  const diff = first && last && pts.length > 1 ? (pct ? last.percent - first.percent : last.score - first.score) : null;
  return (
    <div className="col gap-2 md:hidden">
      <section className="card pad col rise gap-1" aria-label="Scores">
        <div className="row between gap-2">
          <span className="sm muted">{d.headline.average?.basis === "fullMocks" ? "Full mock scores" : "Test scores"}</span>
          {last && (
            <span className="row gap-2">
              <span className="num h3">{pct ? `${last.percent}%` : num(last.score)}</span>
              {diff !== null && first && (
                <span className={diff >= 0 ? "badge b-green" : "badge b-grey"}>
                  {diff >= 0 ? "▲" : "▼"} {num(Math.abs(diff))}
                  {pct ? " points" : ""} since {first.shortName}
                </span>
              )}
            </span>
          )}
        </div>
        <TrendSvg d={d} />
      </section>

      <section className="ai pad col rise gap-2" style={{ "--i": 1 } as React.CSSProperties} aria-label="Focus on these">
        <div className="row between gap-2">
          <AiMark iconSize={13}>Focus on these</AiMark>
          <span className="xs muted">Accuracy {rangeSince(range, now)}</span>
        </div>
        {d.weakTopics.length === 0 && <span className="sm muted">Nothing stands out yet. Keep taking tests.</span>}
        {d.weakTopics.map((w, i) => (
          <div key={`${w.subject}-${w.chapter}-${w.topic ?? ""}`} className="col gap-1.5">
            <div className="row sm gap-1.5">
              <b className="min-w-0">{topicTitle(w)}</b>
              {i === 0 && (
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
            <PracticeButton req={{ ...w.action.practice, source: { kind: "progress" } }} label={w.action.label} now={now} className="btn btn-ghost btn-sm -ml-2" />
          </div>
        ))}
      </section>

      <PlanTodayCard now={now} />

      {d.strengths.length > 0 && (
        <section className="card pad col rise gap-2" style={{ "--i": 3 } as React.CSSProperties}>
          <h2 className="h3">Strengths to keep</h2>
          <div className="row wrap gap-2">
            {d.strengths.map((s) => (
              <span key={`${s.subject}-${s.chapter}`} className="badge b-green">
                {s.chapter} {s.percent}%
              </span>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
