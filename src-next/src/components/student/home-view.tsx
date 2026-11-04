"use client";

import Link from "next/link";
import { lazy, Suspense, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Note, Sticker } from "@iitpulse/ui";
import { qk, studentApi } from "@/lib/student-api";
import { countdown, dowDayMonthTime, ist, timeOf } from "@/lib/time";
import { useServerClock } from "@/lib/server-clock";
import { useAuthStore } from "@/stores/auth.store";
import { useIsDesktop } from "@/lib/use-media";
import type { LastResult, PendingResult, StudentHome, TestCard } from "@/types/m2-student";
import { ArrowRightIcon } from "@/components/shell/icons";
import { Delta } from "./bits";
import { ErrorCard, Skel, useStartTest } from "./common";
import { num, shortPair, subjectLabel, testMeta } from "./labels";
import { Ring } from "./ring";

// The score trend is desktop only (the phone board has none): its code loads only where it is shown, and after
// the first paint, so it stays out of the phone's critical JavaScript. React.lazy, not next/dynamic: the latter
// adds about 2.7 KB of loader code to Home's first load.
const TrendCard = lazy(() => import("./trend-card").then((m) => ({ default: m.TrendCard })));
const trendSkeleton = <Skel className="col-span-2 h-[332px] rounded-card max-md:hidden" />;

/**
 * Student-Home (desktop) and Phone-Home, from GET /tests/student/home.
 *
 * Out of M2 and left out (no placeholders): Weak topics, Today's plan, "Open AI review", "Remind me", the bell.
 * Their places: the trend shares its row with "Coming up"; the phone shows "Coming up" where the plan was.
 *
 * The greeting, date note and doodles are server-rendered by the page; this is the data (client) part.
 * Classroom budget with the page. Desktop: notes 2 (date, "all the best!"), doodles 2 (gutters), 1 sticker
 * (Personal best, only when the data says so), title underline on the name; no tape, no red pen.
 * Phone: notes 2, doodle 1, sticker 1.
 */
export function HomeView() {
  const query = useQuery({ queryKey: qk.home, queryFn: ({ signal }) => studentApi.home(signal) });
  const data = query.data;
  const storedName = useAuthStore((s) => s.currentUser?.name);
  const setUserName = useAuthStore((s) => s.setUserName);
  const now = useServerClock(data?.now, query.dataUpdatedAt);
  const homeName = data?.student.name;
  useEffect(() => {
    if (homeName && !storedName) setUserName(homeName);
  }, [homeName, storedName, setUserName]);
  const isDesktop = useIsDesktop();

  if (query.isError && !data) return <ErrorCard error={query.error} onRetry={() => query.refetch()} />;

  return (
    <>
      <section className="grid grid-cols-3 gap-5 max-md:grid-cols-1 max-md:gap-3.5" aria-busy={!data}>
        {/*
          One hero element from the first paint to the data: the blueboard is drawn at once (it is there whatever
          the data says) and its content fills in. Being the same element, it stays the page's largest paint
          instead of a second, later one (mobile LCP).
        */}
        <article className="hero cl-board col-span-2 col gap-[22px] p-7 min-h-[262px] max-md:col-span-1 max-md:min-h-[221px] max-md:gap-3.5 max-md:rounded-[20px] max-md:p-5">
          {data ? <Hero home={data} now={now} /> : <HeroLoading />}
        </article>
        {data ? <LastResultCard last={data.lastResult} pending={data.latestPending} /> : <Skel className="h-[262px] rounded-card max-md:h-[96px]" />}
      </section>

      {data ? (
        <section className="grid grid-cols-3 gap-5 max-md:grid-cols-1 max-md:gap-3.5">
          {isDesktop ? (
            <Suspense fallback={trendSkeleton}>
              <TrendCard trend={data.trend} last={data.lastResult} />
            </Suspense>
          ) : (
            trendSkeleton
          )}
          <ComingUp items={data.upcoming} />
        </section>
      ) : (
        <section className="grid grid-cols-3 gap-5 max-md:hidden" aria-hidden="true">
          <Skel className="col-span-2 h-[332px] rounded-card" />
          <Skel className="h-[332px] rounded-card" />
        </section>
      )}
    </>
  );
}

/** Chalk lines where the hero's text will be, while Home loads. */
function HeroLoading() {
  return (
    <>
      <span className="block h-6 w-24 rounded-full" style={{ background: "rgba(255,255,255,.12)" }} />
      <span className="block h-10 w-3/5 rounded-lg max-md:h-7" style={{ background: "rgba(255,255,255,.12)" }} />
      <span className="block h-4 w-2/5 rounded-md" style={{ background: "rgba(255,255,255,.08)" }} />
    </>
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
      <span className="live-dot" aria-hidden="true" />
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
    <>
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
              <Link prefetch={false} href="/tests" className="font-semibold text-white underline">
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
        <Link prefetch={false} href="/tests" className="xs text-center font-semibold text-white underline md:hidden">
          {more} more live {more === 1 ? "test" : "tests"}
        </Link>
      )}
    </>
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
        <Link prefetch={false} href={href} className="btn btn-secondary mt-auto">
          See full result
          <ArrowRightIcon className="arrow" />
        </Link>
      </article>

      {/* Phone: one tappable row */}
      <Link prefetch={false} href={href} className="card pad row cl-lift rise relative gap-3.5 text-ink md:hidden" style={{ "--i": 2 } as React.CSSProperties}>
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
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" focusable="false">
            <path d="m9 6 6 6-6 6" />
          </svg>
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
          <Link prefetch={false} href={`/results/${encodeURIComponent(pending.test.id)}`} className="btn btn-secondary mt-auto">
            View submission
          </Link>
        </>
      ) : (
        <span className="sm muted">Your score, rank and answers show here after your first test.</span>
      )}
    </article>
  );
}

function ComingUp({ items }: { items: TestCard[] }) {
  return (
    <article className="card col rise" style={{ "--i": 4 } as React.CSSProperties}>
      <div className="row between pad max-md:px-4 max-md:pt-3.5" style={{ paddingBottom: 8 }}>
        <span className="h3">Coming up</span>
        <Link prefetch={false} href="/tests?tab=upcoming" className="sm font-semibold">
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
