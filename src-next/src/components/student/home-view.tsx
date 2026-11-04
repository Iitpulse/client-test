"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Doodle, InkUnderline, LiveDot, Note, Sticker } from "@iitpulse/ui";
import { qk, studentApi } from "@/lib/student-api";
import { countdown, dowDayMonthTime, greeting, ist, longDay, shortDay, timeOf, useServerClock } from "@/lib/time";
import { useAuthStore } from "@/stores/auth.store";
import type { LastResult, PendingResult, StudentHome, TestCard, TrendPoint } from "@/types/m2-student";
import { ArrowRightIcon } from "@/components/shell/icons";
import { Delta } from "./bits";
import { ErrorCard, Skel, useStartTest } from "./common";
import { ChevronRightIcon } from "./icons";
import { axisLabel, num, shortPair, subjectLabel, testMeta } from "./labels";
import { Ring } from "./ring";

/**
 * Student-Home (desktop) and Phone-Home, from GET /tests/student/home.
 *
 * Out of M2 and left out (no placeholders): Weak topics, Today's plan, "Open AI review", "Remind me", the bell.
 * Their places: the trend shares its row with "Coming up"; the phone shows "Coming up" where the plan was.
 *
 * Classroom budget. Desktop: notes 2 (date, "all the best!"), doodles 2 (gutters), 1 sticker (Personal best, only
 * when the data says so), title underline on the name; no tape, no red pen. Phone: notes 2, doodle 1, sticker 1.
 */
export function HomeView() {
  const query = useQuery({ queryKey: qk.home, queryFn: ({ signal }) => studentApi.home(signal) });
  const data = query.data;
  const storedName = useAuthStore((s) => s.currentUser?.name);
  const now = useServerClock(data?.now, query.dataUpdatedAt);

  if (query.isError && !data) {
    return (
      <div className="col gap-7">
        <Greeting now={null} name={storedName} batch={null} />
        <ErrorCard error={query.error} onRetry={() => query.refetch()} />
      </div>
    );
  }
  if (!data) return <HomeSkeleton name={storedName} />;

  const firstName = (data.student.name || storedName || "").trim().split(/\s+/)[0] || undefined;
  return (
    <div className="col gap-7 md:pt-1 max-md:gap-3.5">
      <Doodle name="pendulum" slot="gl" style={{ top: 300 }} />
      <Doodle name="benzene" slot="gr" style={{ top: 760 }} />
      <Greeting now={now} name={firstName} batch={data.student.batch?.name ?? null} />

      <section className="grid grid-cols-3 gap-5 max-md:grid-cols-1 max-md:gap-3.5">
        <Hero home={data} now={now} />
        <LastResultCard last={data.lastResult} pending={data.latestPending} />
      </section>

      <section className="grid grid-cols-3 gap-5 max-md:grid-cols-1 max-md:gap-3.5">
        <TrendCard trend={data.trend} last={data.lastResult} />
        <ComingUp items={data.upcoming} />
      </section>
    </div>
  );
}

function Greeting({ now, name, batch }: { now: number | null; name?: string; batch: string | null }) {
  const hello = now === null ? "Hello" : greeting(now);
  return (
    <header className="row between wrap relative gap-4 rise max-md:gap-0.5">
      <Doodle name="atom" className="md:hidden [&_svg]:size-16" style={{ right: 2, top: -6 }} />
      <div className="col gap-0.5">
        {now !== null ? (
          <Note size="sm" write rotate={-1.5} delay={150} className="self-start">
            <span className="max-md:hidden">{longDay(now)}</span>
            <span className="md:hidden">{shortDay(now)}</span>
          </Note>
        ) : (
          <span className="h-6" />
        )}
        <h1 className="h1 max-md:text-[22px] relative">
          {hello}
          {name ? (
            <>
              , <InkUnderline delay={450}>{name}</InkUnderline>
            </>
          ) : null}
        </h1>
      </div>
      {batch && <span className="badge b-navy max-md:hidden">Batch: {batch}</span>}
    </header>
  );
}

/** The navy hero: the live test (Start / Resume), else the next test, else a quiet "nothing right now". */
function Hero({ home, now }: { home: StudentHome; now: number }) {
  const start = useStartTest();
  const client = useQueryClient();
  const live = home.live;
  const next = live ? null : home.upcoming[0] ?? null;
  const target = live ? (live.state === "in_progress" && live.attempt ? live.attempt.expiresAt : live.closesAt) : next?.opensAt;
  const left = target ? (Date.parse(target) - now) / 1000 : 0;

  // When the clock runs out the state has changed (closed, opened, auto-submitted): ask the server again.
  const due = target ? left <= 0 : false;
  useEffect(() => {
    if (due) client.invalidateQueries({ queryKey: qk.home });
  }, [due, client]);

  const t = live ?? next;
  const resume = live?.state === "in_progress";
  const subjects = t ? t.subjects.map(subjectLabel).join(", ") : "";
  const more = home.liveCount > 1 ? home.liveCount - 1 : 0;
  const badge = live ? (
    <span className="badge" style={{ background: "rgba(253,0,1,.16)", color: "#FFD1D1" }}>
      <LiveDot />
      {resume ? "In progress" : <><span className="max-md:hidden">Live now</span><span className="md:hidden">Live</span></>}
    </span>
  ) : (
    <span className="badge" style={{ background: "rgba(255,255,255,.14)", color: "#fff" }}>
      {next ? "Next test" : "No test right now"}
    </span>
  );
  const clockLabel = live ? (resume ? "Time left" : "Ends in") : "Opens in";
  const action = live ? (
    <button type="button" className="btn btn-lg max-md:w-full" style={{ background: "#fff", color: "var(--navy)" }} onClick={() => start(live.id)}>
      {resume ? "Resume test" : "Start test"}
      <ArrowRightIcon className="arrow max-md:hidden" />
    </button>
  ) : null;

  return (
    <article className="hero cl-board rise col-span-2 col gap-[22px] p-7 max-md:col-span-1 max-md:gap-3.5 max-md:rounded-[20px] max-md:p-5" style={{ "--i": 1 } as React.CSSProperties}>
      <span className="cl-smudge max-md:hidden" aria-hidden="true" style={{ right: -60, top: 20 }} />
      <span className="cl-smudge md:hidden" aria-hidden="true" style={{ right: -120, top: 10, width: 280, height: 100 }} />

      {/* Desktop (Student-Home) */}
      <div className="row between wrap gap-3 max-md:hidden">
        {badge}
        {t && (
          <span className="col items-end gap-0.5">
            <span className="xs" style={{ color: "#C3C6EF" }}>
              {clockLabel}
            </span>
            <span className="mono num text-xl font-semibold text-white" style={{ letterSpacing: "-.01em" }} role="timer" aria-live="off">
              {countdown(left)}
            </span>
          </span>
        )}
      </div>
      <div className="col gap-2 max-md:hidden">
        <h2 className="d1 text-white" style={{ fontSize: 38 }}>
          {t ? t.name : "Nothing to take right now"}
        </h2>
        <span className="sm" style={{ color: "#C3C6EF" }}>
          {t ? `${testMeta(t)}${subjects ? ` · ${subjects}` : ""}` : home.student.batch ? `New tests for ${home.student.batch.name ?? "your batch"} appear here.` : "Your tests appear here once your institute adds you to a batch."}
        </span>
      </div>
      <div className="row wrap gap-3 max-md:hidden">
        {action}
        {live && (
          <span className="xs" style={{ color: "#C3C6EF" }}>
            Opens the NTA-style exam window{more ? ` · ` : ""}
            {more ? (
              <Link href="/tests" className="font-semibold text-white underline">
                {more} more live
              </Link>
            ) : null}
          </span>
        )}
        {next && <span className="sm" style={{ color: "#C3C6EF" }}>Opens {dowDayMonthTime(next.opensAt)}</span>}
        {live && !resume && (
          <Note tone="chalk" write rotate={-4} delay={900} className="ml-auto" style={{ fontSize: 20 }}>
            all the best!
          </Note>
        )}
      </div>

      {/* Phone (Phone-Home) */}
      <div className="row between md:hidden">
        {badge}
        {t && (
          <span className="xs" style={{ color: "#C3C6EF" }}>
            {clockLabel}{" "}
            <span className="mono num font-semibold text-white" role="timer" aria-live="off">
              {countdown(left)}
            </span>
          </span>
        )}
      </div>
      <div className="row between items-end gap-2 md:hidden">
        <div className="col gap-1">
          <span className="text-2xl font-[650]" style={{ letterSpacing: "-.02em" }}>
            {t ? t.name : "Nothing to take right now"}
          </span>
          <span className="xs" style={{ color: "#C3C6EF" }}>
            {t ? testMeta(t, true) : "New tests appear here."}
          </span>
        </div>
        {live && !resume && (
          <Note tone="chalk" size="sm" write rotate={-5} delay={900} className="mb-0.5">
            all the best!
          </Note>
        )}
      </div>
      {live && (
        <span className="xs md:hidden" style={{ color: "#C3C6EF" }}>
          Best on a laptop: the exam opens in the NTA layout.
        </span>
      )}
      {next && (
        <span className="xs md:hidden" style={{ color: "#C3C6EF" }}>
          Opens {dowDayMonthTime(next.opensAt)}
        </span>
      )}
      {action && <div className="md:hidden">{action}</div>}
      {live && more > 0 && (
        <Link href="/tests" className="xs text-center font-semibold text-white underline md:hidden">
          {more} more live {more === 1 ? "test" : "tests"}
        </Link>
      )}
    </article>
  );
}

function LastResultCard({ last, pending }: { last: LastResult | null; pending: PendingResult | null }) {
  if (!last) return <FirstResultCard pending={pending} />;
  const h = last.headline;
  const [shortName] = h.delta ? shortPair(last.test.name, h.delta.vsTestName) : [last.test.name];
  const rank = h.rank ? `Rank ${h.rank.position} of ${h.rank.of}` : h.rankAvailableAt ? `Rank on ${dowDayMonthTime(h.rankAvailableAt)}` : null;
  const href = `/results/${encodeURIComponent(last.test.id)}`;
  return (
    <>
      {/* Desktop */}
      <article className="card pad-lg cl-lift col rise relative gap-4 max-md:hidden" style={{ "--i": 2 } as React.CSSProperties}>
        {h.isPersonalBest && (
          <Sticker float rotate={5} delay={1100} style={{ top: -14, right: 22 }}>
            Personal best
          </Sticker>
        )}
        <div className="row between">
          <span className="h3">Last result</span>
          <span className="badge b-green">Published</span>
        </div>
        <div className="row gap-[18px]">
          <Ring percent={h.percent} size={108} label={`Score ${num(h.score)} of ${num(h.maxScore)}`}>
            <span className="num text-[20px] font-[650] text-ink">{h.percent}%</span>
          </Ring>
          <div className="col min-w-0 gap-1">
            <span className="num text-[34px] font-[650]" style={{ letterSpacing: "-.02em" }}>
              {num(h.score)}
              <span className="text-base text-muted">/{num(h.maxScore)}</span>
            </span>
            <span className="sm muted">
              {shortName}
              {rank ? ` · ${rank}` : ""}
            </span>
            {h.delta && <Delta delta={h.delta} against={last.test.name} className="self-start" />}
          </div>
        </div>
        <Link href={href} className="btn btn-secondary mt-auto">
          See full result
          <ArrowRightIcon className="arrow" />
        </Link>
      </article>

      {/* Phone: one tappable row */}
      <Link href={href} className="card pad row cl-lift rise relative gap-3.5 text-ink md:hidden" style={{ "--i": 2 } as React.CSSProperties}>
        {h.isPersonalBest && (
          <Sticker float rotate={4} delay={1100} style={{ top: -12, right: 40, fontSize: 13, padding: "6px 10px 7px" }}>
            Personal best
          </Sticker>
        )}
        <Ring percent={h.percent} size={56} stroke={13} />
        <span className="col grow gap-0.5">
          <span className="xs muted">Last result · {shortName}</span>
          <span className="num text-[22px] font-[650]">
            {num(h.score)}
            <span className="xs muted">/{num(h.maxScore)}</span>
          </span>
          {(h.delta || h.rank) && (
            <span className="xs font-semibold" style={{ color: h.delta && h.delta.marks < 0 ? "var(--red-600)" : "var(--green)" }}>
              {[h.delta ? `${h.delta.marks >= 0 ? "+" : "−"}${num(Math.abs(h.delta.marks))}` : null, h.rank ? `rank ${h.rank.position}` : null].filter(Boolean).join(" · ")}
            </span>
          )}
        </span>
        <span className="text-muted">
          <ChevronRightIcon />
        </span>
      </Link>
    </>
  );
}

/** No published result yet: the newest pending one, or a word about where results will appear. */
function FirstResultCard({ pending }: { pending: PendingResult | null }) {
  return (
    <article className="card pad-lg col rise gap-3 max-md:p-4" style={{ "--i": 2 } as React.CSSProperties}>
      <div className="row between">
        <span className="h3">Last result</span>
        {pending && <span className="badge b-amber">Pending</span>}
      </div>
      {pending ? (
        <>
          <span className="sm font-semibold">{pending.test.name}</span>
          <span className="sm muted">
            {pending.visibility.availableAt ? `Result on ${dowDayMonthTime(pending.visibility.availableAt)}` : pending.visibility.reason || "Your teacher will publish it"}
          </span>
          <Link href={`/results/${encodeURIComponent(pending.test.id)}`} className="btn btn-secondary mt-auto">
            View submission
          </Link>
        </>
      ) : (
        <span className="sm muted">Your score, rank and answers show here after your first test.</span>
      )}
    </article>
  );
}

type TrendTab = "score" | "accuracy" | "rank";

function TrendCard({ trend, last }: { trend: TrendPoint[]; last: LastResult | null }) {
  const [tab, setTab] = useState<TrendTab>("score");
  const kind = last?.test.kind;
  const subtitle = trend.length ? `Last ${trend.length} ${kind === "full_mock" ? (trend.length === 1 ? "full mock" : "full mocks") : kind === "sectional" ? (trend.length === 1 ? "sectional" : "sectionals") : trend.length === 1 ? "test" : "tests"}` : "";
  const value = (p: TrendPoint): number | null => (tab === "score" ? p.score : tab === "accuracy" ? p.accuracyPercent : p.rank?.position ?? null);
  const fmt = (v: number) => (tab === "score" ? num(v) : tab === "accuracy" ? `${v}%` : `#${v}`);
  const pts = trend.map((p, i) => ({ p, i, v: value(p) })).filter((x): x is { p: TrendPoint; i: number; v: number } => x.v !== null);

  const X0 = 20, X1 = 500, TOP = 58, BOTTOM = 115; // the board's band: first point at 115, best at 58
  const xs = (i: number) => (trend.length < 2 ? (X0 + X1) / 2 : X0 + ((X1 - X0) * i) / (trend.length - 1));
  const vals = pts.map((x) => x.v);
  const lo = Math.min(...vals), hi = Math.max(...vals);
  const better = tab === "rank" ? -1 : 1; // rank: lower is better, so it is drawn higher
  const ys = (v: number) => (hi === lo ? (TOP + BOTTOM) / 2 : BOTTOM - ((better * (v - (better > 0 ? lo : hi))) / (hi - lo)) * (BOTTOM - TOP));
  const line = pts.map((x) => `${xs(x.i).toFixed(1)},${ys(x.v).toFixed(1)}`).join(" ");
  const first = pts[0], lastPt = pts[pts.length - 1];
  const summary =
    first && lastPt && pts.length > 1
      ? `${tab === "score" ? "Scores" : tab === "accuracy" ? "Accuracy" : "Rank"} went from ${fmt(first.v)} to ${fmt(lastPt.v)} over ${pts.length} tests`
      : "";

  return (
    <article className="card pad-lg col rise col-span-2 gap-3.5 max-md:hidden" style={{ "--i": 3 } as React.CSSProperties}>
      <div className="row between gap-3">
        <div className="col gap-0.5">
          <span className="h3">Score trend</span>
          <span className="sm muted">{subtitle}</span>
        </div>
        {trend.length > 0 && (
          <div className="seg" role="tablist" aria-label="Trend measure">
            {(["score", "accuracy", "rank"] as const).map((k) => (
              <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? "tab on" : "tab"} onClick={() => setTab(k)}>
                {k === "score" ? "Score" : k === "accuracy" ? "Accuracy" : "Rank"}
              </button>
            ))}
          </div>
        )}
      </div>
      {trend.length < 2 ? (
        <div className="col flex-1 items-center justify-center gap-1 py-10 text-center">
          <span className="sm font-semibold">{trend.length ? "One test so far" : "No results yet"}</span>
          <span className="sm muted">Your trend appears after two tests of the same kind.</span>
        </div>
      ) : (
        <svg key={tab} viewBox="0 0 520 170" style={{ width: "100%", height: 220 }} role="img" aria-label={summary}>
          <g stroke="#EEF0F5" strokeWidth="1">
            <line x1="20" y1="20" x2="500" y2="20" />
            <line x1="20" y1="65" x2="500" y2="65" />
            <line x1="20" y1="110" x2="500" y2="110" />
            <line x1="20" y1="150" x2="500" y2="150" />
          </g>
          {pts.length > 1 && (
            <>
              <path d={`M${line.split(" ").join(" L")} L${xs(lastPt!.i).toFixed(1)} 150 L${xs(first!.i).toFixed(1)} 150 Z`} fill="#F1F2FC" className="fade" />
              <polyline className="draw" points={line} fill="none" stroke="var(--navy)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </>
          )}
          <g fill="#fff" stroke="var(--navy)" strokeWidth="2.5">
            {pts.map((x, k) => (
              <circle key={x.i} cx={xs(x.i)} cy={ys(x.v)} r={k === pts.length - 1 ? 6 : 4} fill={k === pts.length - 1 ? "var(--navy)" : "#fff"}>
                <title>{`${x.p.testName}: ${fmt(x.v)}`}</title>
              </circle>
            ))}
          </g>
          <g fontFamily="var(--font-sans)" fontSize="11" fill="#575C75" textAnchor="middle">
            {trend.map((p, i) => (
              <text key={p.testId} x={xs(i)} y="166">
                {axisLabel(p.testName)}
              </text>
            ))}
          </g>
          {first && lastPt && (
            <g fontFamily="var(--font-sans)" fontSize="12" fontWeight="600" fill="#0D0F2B" textAnchor="middle">
              <text x={xs(first.i)} y={ys(first.v) - 11}>
                {fmt(first.v)}
              </text>
              {lastPt !== first && (
                <text x={xs(lastPt.i)} y={ys(lastPt.v) - 14}>
                  {fmt(lastPt.v)}
                </text>
              )}
            </g>
          )}
        </svg>
      )}
    </article>
  );
}

function ComingUp({ items }: { items: TestCard[] }) {
  return (
    <article className="card col rise" style={{ "--i": 4 } as React.CSSProperties}>
      <div className="row between pad max-md:px-4 max-md:pt-3.5" style={{ paddingBottom: 8 }}>
        <span className="h3">Coming up</span>
        <Link href="/tests?tab=upcoming" className="sm font-semibold">
          All tests
        </Link>
      </div>
      {items.length === 0 ? (
        <p className="sm muted m-0 border-t border-line px-5 py-4 max-md:px-4">Nothing scheduled yet.</p>
      ) : (
        <ul className="col m-0 list-none p-0">
          {items.map((u) => {
            const p = ist(u.opensAt);
            return (
              <li key={u.id} className="row gap-3.5 border-t border-[#EEF0F5] px-5 py-3.5 max-md:px-4">
                <span className="col w-12 flex-none items-center rounded-[10px] py-1.5" style={{ background: "#F1F2FC", color: "var(--navy)" }}>
                  <span className="xs font-bold" style={{ letterSpacing: ".04em" }}>
                    {p.dow.toUpperCase()}
                  </span>
                  <span className="h3 num">{p.day}</span>
                </span>
                <span className="col grow min-w-0 gap-0.5">
                  <span className="sm font-semibold">{u.name}</span>
                  <span className="xs muted">
                    {timeOf(u.opensAt)} · {u.totalQuestions} questions · {u.durationMinutes} min
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </article>
  );
}

function HomeSkeleton({ name }: { name?: string }) {
  return (
    <div className="col gap-7 max-md:gap-3.5" aria-busy="true" aria-label="Loading your home">
      <header className="col gap-1.5">
        <Skel className="h-5 w-40" />
        <Skel className="h-9 w-72 max-md:h-7 max-md:w-56" />
        <span className="sr-only">{name ? `Loading, ${name}` : "Loading"}</span>
      </header>
      <section className="grid grid-cols-3 gap-5 max-md:grid-cols-1 max-md:gap-3.5">
        <Skel className="col-span-2 h-[262px] rounded-hero max-md:col-span-1 max-md:h-[230px]" />
        <Skel className="h-[262px] rounded-card max-md:h-[96px]" />
      </section>
      <section className="grid grid-cols-3 gap-5 max-md:hidden">
        <Skel className="col-span-2 h-[332px] rounded-card" />
        <Skel className="h-[332px] rounded-card" />
      </section>
    </div>
  );
}
