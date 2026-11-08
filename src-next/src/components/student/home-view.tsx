"use client";

import Link from "next/link";
import { lazy, Suspense, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AiMark, Bar, InkMark, Note, SparkleIcon, Sticker, Tape } from "@iitpulse/ui";
import { MathLite as MathText } from "@/components/math/math-lite";
import { qk, studentApi } from "@/lib/student-api";
import { m4Api, m4Keys, useTickItem } from "@/lib/m4-api";
import { countdown, dowDayMonthTime, daysFrom, ist, relativeDayTime, timeOf } from "@/lib/time";
import { useServerClock } from "@/lib/server-clock";
import { useAuthStore } from "@/stores/auth.store";
import { useIsDesktop } from "@/lib/use-media";
import { useAssignments } from "@/lib/assignments-api";
import { AssignmentCard, AssignmentRows, homeCards } from "./assigned-practice";
import { ClassesCard, ClassStrip } from "./home-classes";
import type { LastResult, PendingResult, StudentHome, StudentTestsPage, TestCard } from "@/types/m2-student";
import type { ProgressResponse, StudyPlanItem, StudyPlanResponse } from "@/types/m4";
import type { StudentGateResponse } from "@/types/m6";
import { ArrowRightIcon } from "@/components/shell/icons";
import { Delta } from "./bits";
import { fxKey, gateHref, loadFixture, NoBatchCard, Skel, useFixture, useReminderPref } from "./common";
import { useHomeQuery } from "./home-greeting";
import { heroMeta, num, opensIn, shortPair, testMeta } from "./labels";
import { Ring } from "./ring";
import { PageError } from "./states";

// The score trend is desktop only (the phone board has none): its code loads only where it is shown, and after
// the first paint, so it stays out of the phone's critical JavaScript. React.lazy, not next/dynamic: the latter
// adds about 2.7 KB of loader code to Home's first load.
const TrendCard = lazy(() => import("./trend-card").then((m) => ({ default: m.TrendCard })));
const trendSkeleton = <Skel className="col-span-2 h-[290px] rounded-card max-md:hidden" />;

const WHITE_BTN = { background: "#fff", color: "var(--navy)" } as const;
const CHALK = { color: "#C3C6EF" } as const;

/**
 * Student-Home (desktop) and Phone-Home, from GET /tests/student/home, with the batch 5 states: full, day-one,
 * next-opens, nothing-now, many-live (GET /tests/student/tests?tab=live), resume (answered / last saved from the
 * test gate route), no-batch, loading, error, offline. Weak topics (desktop) come from GET /tests/student/progress,
 * Today's plan from GET /ai/student/study-plan; the reminder line from the profile's testReminders.
 * Every Start / Resume / See test details opens the test gate (/tests/:id/start).
 * `?fixture=<state>` (dev / staging) shows a board state with fixture data (b5-fixtures.ts).
 *
 * The greeting, date note, offline strip and doodles are rendered by the page; this is the data part.
 * Classroom budget. Desktop: notes 2 (date, hero note), doodles 2 (gutters), sticker 1 (Personal best), tape 1
 * (Today's plan), pen 1 ("start here"). Phone: notes 2, doodle 1, sticker 1.
 */
export function HomeView() {
  const fx = useFixture();
  const query = useHomeQuery();
  const data = query.data;
  const storedName = useAuthStore((s) => s.currentUser?.name);
  const setUserName = useAuthStore((s) => s.setUserName);
  const now = useServerClock(data?.now, query.dataUpdatedAt);
  const homeName = data?.student.name;
  useEffect(() => {
    if (!fx && homeName && !storedName) setUserName(homeName);
  }, [fx, homeName, storedName, setUserName]);
  const isDesktop = useIsDesktop();
  const reminders = useReminderPref();
  // Student-AssignedPractice: not on the first paint's path (Home's own data comes first)
  const assignments = useAssignments(!fx && !!data);

  if (!data) {
    if (query.isError)
      return (
        <>
          <PageError what="your home page" error={query.error} onRetry={() => query.refetch()} className="max-md:hidden" />
          <PageError what="your home page" error={query.error} onRetry={() => query.refetch()} safe="Your answers and results are safe." className="md:hidden" />
        </>
      );
    return <HomeSkeleton />;
  }
  if (!data.student.batch) return <NoBatchCard where="home" />;

  const hasResult = !!data.lastResult;
  const assigned = assignments.data?.items ?? [];
  const cards = homeCards(assigned, now);
  return (
    <>
      {/* Student-Home-Classes rule 6: the "starts soon / now" strip under the greeting (desktop and laptop) */}
      <ClassStrip enabled={!fx} />
      <section className="grid grid-cols-3 gap-5 max-md:grid-cols-1 max-md:gap-3.5">
        <Hero home={data} now={now} reminders={reminders} />
        {/* Phone-Home-Classes: the Classes card right under the test hero */}
        <ClassesCard enabled={!fx} phone className="md:hidden" style={{ "--i": 1 } as React.CSSProperties} />
        {/* Student-AssignedPractice, phone: right after the hero */}
        {cards.map((a) => (
          <AssignmentCard key={a.id} a={a} phone className="rise md:hidden" style={{ "--i": 1 } as React.CSSProperties} />
        ))}
        {data.lastResult ? <LastResultCard last={data.lastResult} /> : data.latestPending ? <PendingCard pending={data.latestPending} /> : <FirstResultCard />}
      </section>

      {/* Student-AssignedPractice, desktop: the cards, then every assignment in "From your teachers" */}
      {cards.length > 0 && (
        <section className="grid grid-cols-3 gap-5 max-md:hidden" aria-label="Practice from your teachers">
          {cards.map((a) => (
            <AssignmentCard key={a.id} a={a} className="rise" style={{ "--i": 2 } as React.CSSProperties} />
          ))}
        </section>
      )}
      {assigned.length > 0 && (
        <section className="col rise gap-2.5 max-md:hidden" style={{ "--i": 2 } as React.CSSProperties} aria-labelledby="ap-home-h">
          <div className="row between gap-3">
            <span className="col gap-px">
              <h2 id="ap-home-h" className="h3 m-0">
                From your teachers
              </h2>
              <span className="xs muted">The same list sits at the top of Progress</span>
            </span>
            <Link prefetch={false} href="/progress" className="sm font-semibold">
              Open Progress
            </Link>
          </div>
          <AssignmentRows items={assigned} />
        </section>
      )}

      <section className="grid grid-cols-3 gap-5 max-md:hidden">
        {hasResult ? (
          <>
            {isDesktop ? (
              <Suspense fallback={trendSkeleton}>
                <TrendCard trend={data.trend} last={data.lastResult} />
              </Suspense>
            ) : (
              trendSkeleton
            )}
            <WeakTopicsCard enabled={!!isDesktop} />
          </>
        ) : (
          <>
            <article className="card pad-lg col rise col-span-2 gap-3.5" style={{ "--i": 3 } as React.CSSProperties}>
              <div className="col gap-0.5">
                <span className="h3">Score trend</span>
                <span className="sm muted">Starts after 2 full tests</span>
              </div>
              <div className="flex h-[220px] items-center justify-center rounded-xl border-[1.5px] border-dashed border-[#D3D6E2]">
                <span className="sm muted">Your scores draw a line here, test by test.</span>
              </div>
            </article>
            <article className="ai pad-lg col rise gap-3" style={{ "--i": 4 } as React.CSSProperties}>
              <AiMark iconSize={14}>Weak topics</AiMark>
              <p className="body m-0">After your first result, AI picks the topics that cost you the most marks and tells you where to start.</p>
              <span className="xs muted">Nothing here yet.</span>
            </article>
          </>
        )}
      </section>

      <BottomRow home={data} now={now} hasResult={hasResult} reminders={reminders} />
    </>
  );
}

/** Student-Home / Phone-Home "loading": blocks shaped like the page. */
function HomeSkeleton() {
  return (
    <div className="col gap-5 max-md:gap-3.5" aria-busy="true" aria-label="Loading your home page">
      <div className="grid grid-cols-3 gap-5 max-md:hidden">
        <Skel className="col-span-2 h-[236px] rounded-[20px]" />
        <Skel className="h-[236px] rounded-card" />
      </div>
      <div className="grid grid-cols-3 gap-5 max-md:hidden">
        <Skel className="col-span-2 h-[290px] rounded-card" />
        <Skel className="h-[290px] rounded-card" />
      </div>
      <div className="grid grid-cols-2 gap-5 max-md:hidden">
        <Skel className="h-[240px] rounded-card" />
        <Skel className="h-[240px] rounded-card" />
      </div>
      <Skel className="h-[210px] rounded-[20px] md:hidden" />
      <Skel className="h-[84px] rounded-[14px] md:hidden" />
      <Skel className="h-[200px] rounded-[14px] md:hidden" />
    </div>
  );
}

// ───────────────────────────── the blueboard hero ─────────────────────────────

type HeroKind = "live" | "many" | "resume" | "next" | "nothing";

/** The navy hero: resume, the live test (or several), else the next test, else "Nothing to take right now". */
function Hero({ home, now, reminders }: { home: StudentHome; now: number; reminders: boolean | null }) {
  const fx = useFixture();
  const client = useQueryClient();
  const live = home.live;
  const next = live ? null : (home.upcoming[0] ?? null);
  const resume = live?.state === "in_progress";

  // Several live tests: the list, sorted by which closes first (the live tab of the Tests list).
  const liveList = useQuery({
    queryKey: fxKey(fx, qk.tests("live", "", "")),
    queryFn: fx ? () => loadFixture<StudentTestsPage>(fx, "tests", { tab: "live" }) : ({ signal }) => studentApi.tests({ tab: "live" }, signal),
    enabled: !!live && !resume && home.liveCount > 1,
    retry: false,
  });
  const many = !resume && home.liveCount > 1 && (liveList.data?.items.length ?? 0) > 1 ? liveList.data!.items : null;
  // Resume: answered so far and the last save, from the test gate.
  const gate = useQuery({
    queryKey: fxKey(fx, qk.gate(live?.id ?? "")),
    queryFn: fx ? () => loadFixture<StudentGateResponse>(fx, "gate", live!.id) : ({ signal }) => studentApi.gate(live!.id, signal),
    enabled: !!live && resume,
    retry: false,
  });
  const attempt = resume ? (gate.data?.attempt ?? null) : null;

  const kind: HeroKind = resume ? "resume" : many ? "many" : live ? "live" : next ? "next" : "nothing";
  const target = live ? (resume && live.attempt ? live.attempt.expiresAt : live.closesAt) : next?.opensAt;
  const left = target ? (Date.parse(target) - now) / 1000 : 0;

  // When the clock runs out the state has changed (closed, opened, auto-submitted): ask the server again.
  const due = target ? left <= 0 : false;
  useEffect(() => {
    if (due) client.invalidateQueries({ queryKey: fxKey(fx, qk.home) });
  }, [due, client, fx]);

  const cls =
    "hero cl-board col-span-2 col rise gap-[22px] p-7 min-h-[236px] max-md:min-h-0 max-md:col-span-1 max-md:gap-3 max-md:rounded-[20px] max-md:p-5" +
    (kind === "many" ? " gap-3.5 max-md:p-4 max-md:gap-2.5" : kind === "nothing" ? " gap-4 max-md:gap-2.5" : kind === "resume" ? " gap-5" : "");
  return (
    <article className={cls} style={{ "--i": 1 } as React.CSSProperties}>
      {kind !== "resume" && kind !== "nothing" && <span className="cl-smudge max-md:hidden" aria-hidden="true" style={{ right: -60, top: 20 }} />}
      {(kind === "live" || kind === "next") && <span className="cl-smudge md:hidden" aria-hidden="true" style={{ right: -120, top: 10, width: 280, height: 100 }} />}
      {kind === "live" && <LiveHero t={live!} left={left} />}
      {kind === "resume" && <ResumeHero t={live!} left={left} attempt={attempt} />}
      {kind === "many" && <ManyHero items={many!} now={now} />}
      {kind === "next" && <NextHero t={next!} left={left} now={now} reminders={reminders} />}
      {kind === "nothing" && <NothingHero />}
    </article>
  );
}

const liveBadge = (label: React.ReactNode) => (
  <span className="badge relative" style={{ background: "rgba(253,0,1,.16)", color: "#FFD1D1" }}>
    <span className="live-dot" aria-hidden="true" />
    {label}
  </span>
);
const plainBadge = (label: string, cls = "") => (
  <span className={`badge relative ${cls}`} style={{ background: "rgba(255,255,255,.14)", color: "#fff" }}>
    {label}
  </span>
);
function Clock({ label, value }: { label: string; value: string }) {
  return (
    <>
      <span className="col relative items-end gap-0.5 max-md:hidden">
        <span className="xs" style={CHALK}>
          {label}
        </span>
        <span className="mono num text-xl font-semibold text-white" style={{ letterSpacing: "-.01em" }} role="timer" aria-live="off">
          {value}
        </span>
      </span>
    </>
  );
}

function LiveHero({ t, left }: { t: TestCard; left: number }) {
  const subjects = t.subjects.join(", ");
  return (
    <>
      {/* Desktop */}
      <div className="row between wrap gap-3 max-md:hidden">
        {liveBadge("Live now")}
        <Clock label="Ends in" value={countdown(left)} />
      </div>
      <div className="col gap-2 max-md:hidden">
        <h2 className="d1 text-white" style={{ fontSize: 38 }}>
          {t.name}
        </h2>
        <span className="sm" style={CHALK}>
          {heroMeta(t)}
          {subjects ? ` · ${subjects}` : ""}
        </span>
      </div>
      <div className="row wrap relative gap-3 max-md:hidden">
        <Link prefetch={false} href={gateHref(t.id)} className="btn btn-lg" style={WHITE_BTN}>
          Start test
          <ArrowRightIcon className="arrow" />
        </Link>
        <span className="xs" style={CHALK}>
          Opens the NTA-style exam window
        </span>
        <Note tone="chalk" write rotate={-4} delay={900} className="ml-auto" style={{ fontSize: 20 }}>
          all the best!
        </Note>
      </div>

      {/* Phone */}
      <div className="row between relative md:hidden">
        {liveBadge("Live")}
        <span className="xs" style={CHALK}>
          Ends in{" "}
          <span className="mono num font-semibold text-white" role="timer" aria-live="off">
            {countdown(left)}
          </span>
        </span>
      </div>
      <div className="row between relative items-end gap-2 md:hidden">
        <div className="col gap-1">
          <span className="text-2xl font-[650]" style={{ letterSpacing: "-.02em" }}>
            {t.name}
          </span>
          <span className="xs" style={CHALK}>
            {testMeta(t, true)}
          </span>
        </div>
        <Note tone="chalk" size="sm" write rotate={-5} delay={900} className="mb-0.5">
          all the best!
        </Note>
      </div>
      <span className="xs relative md:hidden" style={CHALK}>
        Best on a laptop: the exam opens in the NTA layout.
      </span>
      <Link prefetch={false} href={gateHref(t.id)} className="btn btn-lg relative md:hidden" style={WHITE_BTN}>
        Start test
      </Link>
    </>
  );
}

function ResumeHero({ t, left, attempt }: { t: TestCard; left: number; attempt: StudentGateResponse["attempt"] }) {
  const pct = attempt && attempt.total ? Math.round((100 * attempt.answered) / attempt.total) : null;
  const answered = attempt ? `${attempt.answered} of ${attempt.total} answered` : null;
  const desk = [answered, attempt?.lastSavedAt ? `last saved ${timeOf(attempt.lastSavedAt)}` : null, "the timer keeps running"].filter(Boolean).join(" · ");
  const phone = [answered, attempt?.lastSavedAt ? `saved ${timeOf(attempt.lastSavedAt)}` : null].filter(Boolean).join(" · ");
  const bar =
    pct !== null ? (
      <div className="bar relative" style={{ background: "rgba(255,255,255,.16)" }} role="img" aria-label={answered ?? undefined}>
        <i style={{ width: `${pct}%`, background: "#fff" }} />
      </div>
    ) : null;
  return (
    <>
      <div className="row between wrap gap-3 max-md:hidden">
        {plainBadge("In progress")}
        <Clock label="Time left" value={countdown(left)} />
      </div>
      <div className="col gap-2 max-md:hidden">
        <h2 className="d1 text-white" style={{ fontSize: 38 }}>
          {t.name}
        </h2>
        <span className="sm" style={CHALK}>
          {desk.charAt(0).toUpperCase() + desk.slice(1)}
        </span>
      </div>
      {bar && <div className="max-md:hidden">{bar}</div>}
      <div className="row wrap relative gap-3 max-md:hidden">
        <Link prefetch={false} href={gateHref(t.id)} className="btn btn-lg" style={WHITE_BTN}>
          Resume test
          <ArrowRightIcon className="arrow" />
        </Link>
        <span className="xs" style={CHALK}>
          You&apos;ll go straight back to your question
        </span>
      </div>

      <div className="row between relative md:hidden">
        {plainBadge("In progress")}
        <span className="xs" style={CHALK}>
          Left{" "}
          <span className="mono num font-semibold text-white" role="timer" aria-live="off">
            {countdown(left)}
          </span>
        </span>
      </div>
      <div className="col relative gap-1 md:hidden">
        <span className="text-2xl font-[650]" style={{ letterSpacing: "-.02em" }}>
          {t.name}
        </span>
        {phone && (
          <span className="xs" style={CHALK}>
            {phone}
          </span>
        )}
      </div>
      {bar && <div className="md:hidden">{bar}</div>}
      <Link prefetch={false} href={gateHref(t.id)} className="btn btn-lg relative md:hidden" style={WHITE_BTN}>
        Resume test
      </Link>
    </>
  );
}

function ManyHero({ items, now }: { items: TestCard[]; now: number }) {
  return (
    <>
      <div className="row between wrap relative gap-3 max-md:self-start">
        {liveBadge(`${items.length} tests live`)}
        <span className="xs max-md:hidden" style={CHALK}>
          Sorted by which closes first
        </span>
      </div>
      <ul className="col m-0 list-none gap-3.5 p-0 max-md:gap-2.5">
        {items.map((t) => (
          <li key={t.id} className="lrow">
            <span className="col grow min-w-0 gap-0.5 max-md:gap-px">
              <span className="text-[17px] font-semibold text-white max-md:text-sm">{t.name}</span>
              <span className="xs" style={CHALK}>
                Ends {relativeDayTime(now, t.closesAt)}
                <span className="max-md:hidden">
                  {" "}
                  · {t.totalQuestions} questions · {t.durationMinutes} min
                </span>
              </span>
            </span>
            <Link prefetch={false} href={gateHref(t.id)} className="btn max-md:min-h-11" style={WHITE_BTN} aria-label={`Start ${t.name}`}>
              Start
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

function NextHero({ t, left, now, reminders }: { t: TestCard; left: number; now: number; reminders: boolean | null }) {
  const days = daysFrom(now, t.opensAt);
  return (
    <>
      <div className="row between wrap gap-3 max-md:hidden">
        {plainBadge("Next test")}
        <Clock label="Opens in" value={opensIn(left)} />
      </div>
      <div className="col gap-2 max-md:hidden">
        <h2 className="d1 text-white" style={{ fontSize: 38 }}>
          {t.name}
        </h2>
        <span className="sm" style={CHALK}>
          {dowDayMonthTime(t.opensAt)} · {heroMeta(t)}
        </span>
      </div>
      <div className="row wrap relative gap-3 max-md:hidden">
        <Link prefetch={false} href={gateHref(t.id)} className="btn btn-lg" style={WHITE_BTN}>
          See test details
        </Link>
        {reminders && (
          <span className="xs" style={CHALK}>
            We&apos;ll email you 1 hour before it opens
          </span>
        )}
        {days > 1 && (
          <Note tone="chalk" write rotate={-4} delay={900} className="ml-auto" style={{ fontSize: 20 }}>
            {days} days to go
          </Note>
        )}
      </div>

      <div className="row between relative md:hidden">
        {plainBadge("Next test")}
        <span className="xs" style={CHALK}>
          Opens in{" "}
          <span className="mono num font-semibold text-white" role="timer" aria-live="off">
            {opensIn(left, true)}
          </span>
        </span>
      </div>
      <div className="col relative gap-1 md:hidden">
        <span className="text-2xl font-[650]" style={{ letterSpacing: "-.02em" }}>
          {t.name}
        </span>
        <span className="xs" style={CHALK}>
          {dowDayMonthTime(t.opensAt)} · {t.totalQuestions} Qs · {t.durationMinutes} min
        </span>
      </div>
      {reminders && (
        <span className="xs relative md:hidden" style={CHALK}>
          We&apos;ll email you 1 hour before it opens.
        </span>
      )}
      <Link prefetch={false} href="/tests" className="btn btn-lg relative md:hidden" style={WHITE_BTN}>
        See all tests
      </Link>
    </>
  );
}

function NothingHero() {
  return (
    <>
      <span className="cl-smudge max-md:hidden" aria-hidden="true" style={{ right: -60, top: 20 }} />
      {plainBadge("Nothing live", "self-start")}
      <h2 className="d1 relative text-white max-md:hidden" style={{ fontSize: 34 }}>
        Nothing to take right now
      </h2>
      <span className="relative text-[22px] font-[650] md:hidden" style={{ letterSpacing: "-.02em" }}>
        Nothing to take right now
      </span>
      <p className="body relative m-0 max-w-[560px] max-md:hidden" style={{ color: "#D6D8FA" }}>
        No test is open or scheduled for your batch. We&apos;ll email you as soon as your institute adds one.
      </p>
      <span className="sm relative md:hidden" style={{ color: "#D6D8FA" }}>
        We&apos;ll email you when your institute adds a test.
      </span>
      <div className="row wrap relative gap-4 max-md:col max-md:items-stretch">
        <Link prefetch={false} href="/progress" className="btn btn-lg" style={WHITE_BTN}>
          Start a practice set
        </Link>
        <Link prefetch={false} href="/progress" className="sm font-semibold text-white max-md:hidden">
          Open your study plan
        </Link>
      </div>
    </>
  );
}

// ───────────────────────────── result cards ─────────────────────────────

function LastResultCard({ last }: { last: LastResult }) {
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
          <SparkleIcon size={14} />
          Open AI review
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

/** No published result yet but one is pending: when it comes out. */
function PendingCard({ pending }: { pending: PendingResult }) {
  return (
    <article className="card pad-lg col rise gap-3 max-md:p-4" style={{ "--i": 2 } as React.CSSProperties}>
      <div className="row between">
        <span className="h3">Last result</span>
        <span className="badge b-amber">Pending</span>
      </div>
      <span className="sm font-semibold">{pending.test.name}</span>
      <span className="sm muted">
        {pending.visibility.availableAt ? `Result on ${dowDayMonthTime(pending.visibility.availableAt)}` : pending.visibility.reason || "Your teacher will publish it"}
      </span>
      <Link prefetch={false} href={`/results/${encodeURIComponent(pending.test.id)}`} className="btn btn-secondary mt-auto">
        View submission
      </Link>
    </article>
  );
}

function QuestionRing({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" aria-hidden="true" focusable="false" className="flex-none">
      <circle cx="60" cy="60" r="48" fill="none" stroke="#D3D6E2" strokeWidth="10" strokeDasharray="6 8" />
      <text x="60" y="68" textAnchor="middle" fontFamily="Geist" fontSize="24" fontWeight="600" fill="#A9ACC4">
        ?
      </text>
    </svg>
  );
}

/** Student-Home / Phone-Home "day-one": where the first result will show. */
function FirstResultCard() {
  return (
    <>
      <article className="card pad-lg col rise gap-3.5 max-md:hidden" style={{ "--i": 2 } as React.CSSProperties}>
        <span className="h3">Your first result</span>
        <div className="row gap-4">
          <QuestionRing size={88} />
          <span className="sm muted">Shows here after your first test: score, rank, and an AI review of every mistake.</span>
        </div>
        <Link prefetch={false} href="/tests" className="btn btn-secondary mt-auto">
          See your tests
        </Link>
      </article>
      <article className="card pad row rise gap-3.5 md:hidden" style={{ "--i": 2 } as React.CSSProperties}>
        <QuestionRing size={56} />
        <span className="col gap-0.5">
          <span className="sm font-semibold">Your first result shows here</span>
          <span className="xs muted">Score, rank and an AI review of every mistake.</span>
        </span>
      </article>
    </>
  );
}

// ───────────────────────────── weak topics (desktop) ─────────────────────────────

function WeakTopicsCard({ enabled }: { enabled: boolean }) {
  const fx = useFixture();
  const q = useQuery({
    queryKey: fxKey(fx, m4Keys.progress("90d")),
    queryFn: fx ? () => loadFixture<ProgressResponse>(fx, "progress") : ({ signal }) => m4Api.progress("90d", signal),
    enabled,
    retry: false,
    staleTime: 60_000,
  });
  if (!q.data) return q.isError ? null : <Skel className="h-[290px] rounded-card" />;
  const d = q.data;
  const top = d.weakTopics.slice(0, 3);
  return (
    <article className="ai pad-lg col rise gap-3.5" style={{ "--i": 4 } as React.CSSProperties}>
      <div className="row between">
        <AiMark iconSize={14}>Weak topics</AiMark>
        {d.testsCount > 0 && <span className="xs muted">From {d.testsCount} {d.testsCount === 1 ? "test" : "tests"}</span>}
      </div>
      {top.length === 0 ? (
        <span className="sm muted">Nothing stands out yet. Keep taking tests.</span>
      ) : (
        <div className="col gap-3">
          {top.map((w, i) => (
            <div key={`${w.subject}-${w.chapter}-${w.topic ?? ""}`} className="col gap-1.5">
              <div className="row gap-1.5">
                <span className="sm font-semibold">{w.topic ?? w.chapter}</span>
                {i === 0 && (
                  <>
                    <InkMark paths={["M58 14C44 4 22 4 6 14", "M14 6 5 14l10 5"]} viewBox="0 0 60 24" tone="pen" weight="thin" inline delay={1300} width={30} height={14} style={{ marginTop: 2 }} />
                    <Note tone="pen" size="sm" write rotate={-3} delay={1500}>
                      start here
                    </Note>
                  </>
                )}
                <span className="xs num muted ml-auto">{w.percent}% correct</span>
              </div>
              <Bar value={w.percent} max={100} color="#3A3AB0" className="bg-[#E1E3F8]" label={`${w.topic ?? w.chapter}: ${w.percent}% correct`} />
            </div>
          ))}
        </div>
      )}
      <Link prefetch={false} href="/progress" className="btn btn-secondary btn-sm mt-auto self-start">
        See your study plan
        <ArrowRightIcon className="arrow" />
      </Link>
    </article>
  );
}

// ───────────────────────────── coming up + today's plan ─────────────────────────────

function BottomRow({ home, now, hasResult, reminders }: { home: StudentHome; now: number; hasResult: boolean; reminders: boolean | null }) {
  const fx = useFixture();
  const plan = useQuery({
    queryKey: fxKey(fx, m4Keys.plan),
    queryFn: fx ? () => loadFixture<StudyPlanResponse>(fx, "plan") : ({ signal }) => m4Api.studyPlan(signal),
    enabled: hasResult,
    retry: false,
    staleTime: 60_000,
    refetchInterval: (q) => (q.state.data?.status === "generating" ? 3000 : false),
  });
  const today = plan.data?.plan?.days.find((d) => d.isToday) ?? null;
  const showPlan = !hasResult || !!today;
  return (
    // Student-Home-Classes: Coming up, Classes, Today's plan side by side (auto-fit, 320px at least)
    <section className="grid items-start gap-5 md:[grid-template-columns:repeat(auto-fit,minmax(320px,1fr))] max-md:grid-cols-1 max-md:gap-3.5">
      <ComingUp items={home.upcoming} now={now} reminders={reminders} className={showPlan ? "max-md:hidden" : ""} />
      <ClassesCard enabled={!fx} className="max-md:hidden" style={{ "--i": 5 } as React.CSSProperties} />
      {!hasResult ? <PlanFirst /> : today ? <PlanToday items={today.items} basedOn={plan.data!.plan!.basedOn.map((b) => b.shortName)} /> : null}
    </section>
  );
}

function ComingUp({ items, now, reminders, className }: { items: TestCard[]; now: number; reminders: boolean | null; className?: string }) {
  return (
    <article className={`card col rise ${className ?? ""}`} style={{ "--i": 5 } as React.CSSProperties}>
      <div className="row between pad max-md:px-4 max-md:pt-3.5" style={{ paddingBottom: 8 }}>
        <span className="h3">Coming up</span>
        <Link prefetch={false} href="/tests?tab=upcoming" className="sm font-semibold">
          All tests
        </Link>
      </div>
      {items.length === 0 ? (
        <div className="col gap-1 border-t border-[#EEF0F5] p-5 max-md:px-4">
          <span className="sm font-semibold">Nothing scheduled yet</span>
          <span className="xs muted">New tests show up here and in your email.</span>
        </div>
      ) : (
        <ul className="col m-0 list-none p-0">
          {items.map((u) => {
            const p = ist(u.opensAt);
            const d = daysFrom(now, u.opensAt);
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
                <span className="badge b-navy flex-none">{d <= 0 ? "Today" : d === 1 ? "Tomorrow" : `In ${d} days`}</span>
              </li>
            );
          })}
        </ul>
      )}
      {reminders !== null && (
        <div className="row between gap-3 border-t border-[#EEF0F5] px-5 py-3 max-md:px-4">
          <span className="xs muted row gap-1.5">
            <BellIcon />
            Email reminder 1 hour before every test: {reminders ? "on" : "off"}
          </span>
          <Link prefetch={false} href="/profile#prefs" className="xs font-semibold">
            Change
          </Link>
        </div>
      )}
    </article>
  );
}

function BellIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" className="flex-none">
      <path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8" />
      <path d="M10.3 21a1.9 1.9 0 0 0 3.4 0" />
    </svg>
  );
}

/** Day one: the plan is built from the first result; a practice set until then. */
function PlanFirst() {
  return (
    <>
      <article className="card pad-lg col rise gap-2.5 max-md:hidden" style={{ "--i": 6 } as React.CSSProperties}>
        <span className="h3">Today&apos;s plan</span>
        <span className="sm muted">Your study plan is built from your first result. Until then, a practice set is a good start.</span>
        <Link prefetch={false} href="/progress" className="btn btn-secondary self-start">
          Start a practice set
        </Link>
      </article>
      <article className="ai pad col rise gap-2 md:hidden" style={{ "--i": 3 } as React.CSSProperties}>
        <AiMark iconSize={14}>Today&apos;s plan</AiMark>
        <span className="sm">Your study plan is built from your first result. Until then, try a practice set.</span>
        <Link prefetch={false} href="/progress" className="btn btn-secondary">
          Start a practice set
        </Link>
      </article>
    </>
  );
}

function itemMeta(i: StudyPlanItem): string {
  const mins = i.minutes ? `${i.minutes} min` : "";
  if (i.redo) return [`${i.redo.testShortName} · ${i.redo.questions.map((q) => `Q${q.shownAs}`).join(", ")}`, mins].filter(Boolean).join(" · ");
  return mins;
}

/** Today's plan (Student-Home card with tape; Phone-Home AI card), ticked with PATCH …/study-plan/items/:id. */
function PlanToday({ items, basedOn }: { items: StudyPlanItem[]; basedOn: string[] }) {
  const fx = useFixture();
  const tick = useTickItem();
  const [local, setLocal] = useState<Record<string, boolean>>({}); // fixtures tick on the page only
  const isDone = (i: StudyPlanItem) => (fx ? (local[i.id] ?? i.done) : i.done);
  const toggle = (i: StudyPlanItem, done: boolean) => (fx ? setLocal((x) => ({ ...x, [i.id]: done })) : tick.toggle(i.id, done));
  const done = items.filter(isDone).length;
  const count = `${done} of ${items.length}`;
  return (
    <>
      <article className="card col rise relative max-md:hidden" style={{ "--i": 6 } as React.CSSProperties}>
        <Tape rotate={-2} delay={900} />
        <div className="row between pad" style={{ paddingBottom: 8 }}>
          <div className="col gap-0.5">
            <span className="h3">Today&apos;s plan</span>
            {basedOn.length > 0 && <span className="xs muted">Built by AI from your {basedOn.join(", ")} answers</span>}
          </div>
          {items.length > 0 && <span className="badge b-navy num">{count} done</span>}
        </div>
        <div className="col px-2 pt-1 pb-3">
          {items.length === 0 && <span className="sm muted px-3 py-2">Nothing planned for today. Rest, or redo a question you got wrong.</span>}
          {items.map((i) => (
            <label key={i.id} className="row plan-row cursor-pointer gap-3 rounded-[10px] p-3">
              <input type="checkbox" className="check" checked={isDone(i)} onChange={(e) => toggle(i, e.target.checked)} />
              <span className="col grow min-w-0 gap-0.5">
                <MathText className={isDone(i) ? "sm cl-done font-semibold" : "sm font-semibold"} text={i.title} />
                {itemMeta(i) && <span className="xs muted">{itemMeta(i)}</span>}
              </span>
              {(i.kind === "practice" || i.kind === "drill") && <span className="badge b-grey flex-none">Practice</span>}
            </label>
          ))}
          {tick.isError && !fx && <span className="xs muted px-3">Couldn&apos;t save that tick. Try again.</span>}
        </div>
      </article>

      <article className="ai pad col rise gap-0 md:hidden" style={{ "--i": 3 } as React.CSSProperties}>
        <AiMark iconSize={14} className="mb-1">
          Today&apos;s plan{items.length > 0 ? ` · ${count}` : ""}
        </AiMark>
        {items.length === 0 && <span className="sm muted">Nothing planned for today. Rest, or redo a question you got wrong.</span>}
        {items.map((i) => (
          <label key={i.id} className="row hplan">
            <input type="checkbox" className="check" checked={isDone(i)} onChange={(e) => toggle(i, e.target.checked)} />
            <MathText className="sm hplan-t min-w-0" text={i.minutes ? `${i.title} · ${i.minutes}m` : i.title} />
          </label>
        ))}
        {tick.isError && !fx && <span className="xs muted">Couldn&apos;t save that tick. Try again.</span>}
      </article>
    </>
  );
}
