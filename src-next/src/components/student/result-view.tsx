"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Doodle, InkArrow, InkUnderline, Note, Stamp, Sticker, useCountUp } from "@iitpulse/ui";
import { qk, StudentApiError, studentApi } from "@/lib/student-api";
import { countdownParts, dayMonth, dowDayMonth, dowDayMonthTime, minutes, relativeDayTime } from "@/lib/time";
import { useServerClock } from "@/lib/server-clock";
import { useAuthStore } from "@/stores/auth.store";
import type { PublishedResult, SectionResult, StudentResult } from "@/types/m2-student";
import { ArrowLeftIcon, ArrowRightIcon } from "@/components/shell/icons";
import { Delta } from "./bits";
import { ErrorCard, Skel, useStartTest } from "./common";
import { ChevronLeftIcon, HourglassRing, LockIcon } from "./icons";
import { num, sentence, signed, underlineSplit } from "./labels";
import { LeaksCard, MarksWentCard, useSummaryState, type SummaryState } from "./ai-review";
import { ReviewPane } from "./review-pane";
import { Ring } from "./ring";

/**
 * /results/[testId]: Student-Result and Phone-Result when published, Student-ResultPending (phone: the same,
 * one column) while pending, and the pending layout with the institute's reason when hidden.
 * From GET /tests/student/results/:testId.
 *
 * M3 adds the AI summary (ai-review.tsx: "Your 3 biggest leaks" on desktop, "Where N marks went" on the phone),
 * fetched after the hero has painted, and "Why this happened" in the question pane.
 * Left out: Download PDF, the doubt chat, "Add to revision list", "Email me when it's out", "AI review unlocks…"
 * and "Continue your study plan".
 */
export function ResultView({ testId }: { testId: string }) {
  const router = useRouter();
  const setTestId = useAuthStore((s) => s.setTestId);
  const query = useQuery({ queryKey: qk.result(testId), queryFn: ({ signal }) => studentApi.result(testId, signal) });
  const data = query.data;
  const now = useServerClock(data?.now, query.dataUpdatedAt);

  // The submit never landed but the attempt is still running: back into the exam (the server auto-submits on time).
  const err = query.error instanceof StudentApiError ? query.error : null;
  const resume = err?.code === "NO_SUBMISSION" && err.details?.state === "in_progress";
  useEffect(() => {
    if (!resume) return;
    setTestId(testId);
    router.replace("/instructions");
  }, [resume, router, setTestId, testId]);

  if (!data) {
    if (query.isError && !resume) return <ResultProblem error={query.error} testId={testId} onRetry={() => query.refetch()} />;
    return <ResultSkeleton />;
  }
  if (data.visibility.status === "published" && data.result) return <Published data={data} result={data.result} now={now} />;
  return <Pending data={data} now={now} />;
}

function BackToTests({ className }: { className?: string }) {
  return (
    <Link href="/tests?tab=completed" className={`sm row gap-1.5 self-start font-semibold text-muted ${className ?? ""}`}>
      <ArrowLeftIcon />
      Tests
    </Link>
  );
}

/** Phone-Result's header: back, the test name, nothing else (Download PDF is not in M2). */
function PhoneBar({ title }: { title: string }) {
  return (
    <header className="sticky top-0 z-(--z-topbar) row h-14 gap-1.5 border-b border-line bg-white/90 px-3 pt-[env(safe-area-inset-top)] backdrop-blur-md box-content md:hidden">
      <Link href="/tests?tab=completed" className="btn btn-ghost btn-icon size-11" aria-label="Back to tests">
        <ChevronLeftIcon />
      </Link>
      <h1 className="h3 grow truncate">{title}</h1>
    </header>
  );
}

function Title({ name }: { name: string }) {
  const [lead, tail] = underlineSplit(name);
  return (
    <>
      {lead}
      <InkUnderline delay={450}>{tail}</InkUnderline>
    </>
  );
}

// ---------------------------------------------------------------------------------------------
// Published
// ---------------------------------------------------------------------------------------------

function rankLine(r: PublishedResult) {
  return r.rank ? `${r.rank.percentile}${ordinal(r.rank.percentile)} percentile among ${r.rank.of} students who took this test` : null;
}
function ordinal(n: number) {
  const s = n % 100;
  if (s >= 11 && s <= 13) return "th";
  return n % 10 === 1 ? "st" : n % 10 === 2 ? "nd" : n % 10 === 3 ? "rd" : "th";
}

function Published({ data, result, now }: { data: StudentResult; result: PublishedResult; now: number }) {
  const ai = useSummaryState(data);
  return (
    <>
      <PublishedDesktop data={data} r={result} now={now} ai={ai} />
      <PublishedPhone data={data} r={result} now={now} ai={ai} />
    </>
  );
}

function PublishedDesktop({ data, r, now, ai }: { data: StudentResult; r: PublishedResult; now: number; ai: SummaryState }) {
  const score = useCountUp(r.score, { delay: 200, decimals: Number.isInteger(r.score) ? 0 : 2 });
  const published = data.visibility.publishedAt;
  // The pane's selected question (paper n), so a leak's "Review Q…" can open it.
  const [sel, setSel] = useState<number | null>(null);
  // Leaks name paper numbers (n); the pane selects by n and labels by shownAs.
  const shownAsOf = (n: number) => r.questions.find((c) => c.n === n)?.shownAs ?? n;
  const reviewLeak = (n: number) => {
    if (!r.questions.some((c) => c.n === n)) return;
    setSel(n);
    document.getElementById("review-h")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  return (
    <div className="col -mt-1 gap-6 max-md:hidden">
      <Doodle name="flask" slot="gl" style={{ top: 452 }} />
      <Doodle name="incline" slot="gr" style={{ top: 1040 }} />
      <header className="col gap-1.5">
        <BackToTests />
        <h1 className="h1 mb-1">
          <Title name={data.test.name} />
        </h1>
        <span className="sm muted">
          Taken {dowDayMonth(data.submission.submittedAt)}
          {published ? ` · Result published ${dowDayMonth(published)}` : ""}
        </span>
      </header>

      <section className="grid grid-cols-4 gap-5 max-lg:grid-cols-2">
        <article className="card pad-lg row rise relative col-span-2 gap-6">
          {r.isPersonalBest ? (
            <Sticker float rotate={-4} delay={1100} style={{ top: -14, left: 24 }}>
              Personal best
            </Sticker>
          ) : published ? (
            <Stamp rotate={-8} delay={800} className="whitespace-nowrap" style={{ position: "absolute", top: 30, right: 30 }}>
              Checked · {dayMonth(published)}
            </Stamp>
          ) : null}
          <Ring percent={r.percent} size={148} label={`Score ${num(r.score)} of ${num(r.maxScore)}`} />
          <div className="col gap-1.5">
            <span className="eyebrow">Your score</span>
            <span className="num" style={{ fontSize: 56, fontWeight: 650, letterSpacing: "-.035em", lineHeight: 1 }}>
              {num(score)}
              <span className="text-[22px] text-muted">/{num(r.maxScore)}</span>
            </span>
            <div className="row wrap gap-2">
              {r.delta && <Delta delta={r.delta} against={data.test.name} />}
              {r.rank && <span className="badge b-navy">Top {r.rank.topPercent}%</span>}
            </div>
          </div>
        </article>
        <article className="card pad-lg col rise gap-1.5" style={{ "--i": 1 } as React.CSSProperties}>
          <span className="sm muted">Rank</span>
          {r.rank ? (
            <>
              <span className="num text-4xl font-[650]">
                {r.rank.position}
                <span className="text-base text-muted"> of {r.rank.of}</span>
              </span>
              <span className="xs muted">{rankLine(r)}</span>
            </>
          ) : (
            <>
              <span className="h3 mt-1">After everyone finishes</span>
              <span className="xs muted">{r.rankAvailableAt ? `Ranks appear ${relativeDayTime(now, r.rankAvailableAt)}.` : "Ranks appear when the test has closed for everyone."}</span>
            </>
          )}
        </article>
        <AnswersCard r={r} i={2} />
      </section>

      <SectionCards sections={r.sections} />

      <LeaksCard st={ai} now={now} onReview={reviewLeak} labelOf={shownAsOf} />

      <ReviewPane data={data} r={r} now={now} sel={sel} onSel={setSel} />
    </div>
  );
}

function AnswersCard({ r, i, className }: { r: PublishedResult; i: number; className?: string }) {
  const c = r.counts;
  const parts = [
    { k: "correct", n: c.correct, color: "var(--green)", label: "correct" },
    { k: "partial", n: c.partial, color: "var(--amber)", label: "partly correct" },
    { k: "wrong", n: c.wrong, color: "var(--red-600)", label: "wrong" },
    { k: "skipped", n: c.skipped, color: "#D3D6E2", label: "skipped" },
  ].filter((p) => p.n > 0 || p.k !== "partial");
  return (
    <article className={`card pad-lg col rise gap-2.5 ${className ?? ""}`} style={{ "--i": i } as React.CSSProperties}>
      <span className="sm muted">Answers</span>
      <div className="flex h-2.5 gap-[3px] overflow-hidden rounded-full" role="img" aria-label={parts.map((p) => `${p.n} ${p.label}`).join(", ")}>
        {parts.map((p) => (p.n > 0 ? <span key={p.k} style={{ flex: p.n, background: p.color }} /> : null))}
      </div>
      <div className="col gap-1">
        {parts.map((p) => (
          <span key={p.k} className="sm row gap-2">
            <span className="size-2 rounded-[2px]" style={{ background: p.color }} />
            {p.n} {p.label}
          </span>
        ))}
      </div>
    </article>
  );
}

function sectionLine(s: SectionResult) {
  return [`${s.correct} correct`, s.partial ? `${s.partial} partly correct` : null, `${s.wrong} wrong`, `${s.skipped} skipped`, minutes(s.timeSeconds)].filter(Boolean).join(" · ");
}

function SectionCards({ sections }: { sections: SectionResult[] }) {
  if (sections.length === 0) return null;
  return (
    <section className="grid grid-cols-3 gap-5 max-lg:grid-cols-2">
      {sections.map((s, i) => (
        <article key={s.id} className="card pad col cl-lift rise gap-2.5" style={{ "--i": 3 + i } as React.CSSProperties}>
          <div className="row between">
            <span className="h3">{s.subject ?? s.name}</span>
            <span className="num h3">
              {num(s.score)}
              <span className="sm muted">/{num(s.maxScore)}</span>
            </span>
          </div>
          <div className="bar" aria-hidden="true">
            <i style={{ width: `${Math.max(0, Math.min(100, (100 * s.score) / (s.maxScore || 1)))}%`, animationDelay: `${i * 0.1}s` }} />
          </div>
          <span className="xs muted">{sectionLine(s)}</span>
        </article>
      ))}
    </section>
  );
}

function PublishedPhone({ data, r, now, ai }: { data: StudentResult; r: PublishedResult; now: number; ai: SummaryState }) {
  const score = useCountUp(r.score, { delay: 150, decimals: Number.isInteger(r.score) ? 0 : 2 });
  const published = data.visibility.publishedAt;
  const toReview = r.questions.filter((q) => q.outcome !== "correct");
  const filter = toReview.length ? "review" : "all";
  const firstN = (toReview[0] ?? r.questions[0])?.n;
  // The weakest section gets the red pen ("start here"), only when there is more than one to compare.
  const pct = (s: SectionResult) => s.score / (s.maxScore || 1);
  const weakest = r.sections.length > 1 ? r.sections.reduce((a, b) => (pct(b) < pct(a) ? b : a)) : null;

  return (
    <div className="col md:hidden">
      <PhoneBar title={data.test.name} />
      <div className="col gap-3.5 p-4 pb-[calc(24px+env(safe-area-inset-bottom))]">
        <section className="hero cl-board col pop items-center gap-3.5 rounded-[20px] p-[22px] text-center">
          <span className="cl-smudge" aria-hidden="true" style={{ left: -110, top: 120, width: 300, height: 100 }} />
          {published && (
            <Stamp tone="chalk" rotate={-8} delay={1200} className="col gap-[3px]" style={{ position: "absolute", top: 22, right: 18, fontSize: 11, padding: "6px 9px" }}>
              Checked<span style={{ letterSpacing: ".08em" }}>{dayMonth(published)}</span>
            </Stamp>
          )}
          <Ring percent={r.percent} size={150} stroke={10} track="rgba(255,255,255,.16)" color="#fff" label={`Score ${num(r.score)} of ${num(r.maxScore)}`}>
            <span className="num text-white" style={{ fontSize: 38, fontWeight: 650, lineHeight: 1, letterSpacing: "-.02em" }}>
              {num(score)}
            </span>
            <span className="mt-1 text-[13px]" style={{ color: "#C3C6EF" }}>
              of {num(r.maxScore)}
            </span>
          </Ring>
          <div className="row wrap justify-center gap-2">
            <span className="badge" style={{ background: "rgba(255,255,255,.14)", color: "#fff" }}>
              {r.rank ? `Rank ${r.rank.position} of ${r.rank.of}` : r.rankAvailableAt ? `Rank ${relativeDayTime(now, r.rankAvailableAt)}` : "Rank soon"}
            </span>
            {r.delta && (
              <span className="badge" style={r.delta.marks >= 0 ? { background: "rgba(110,231,160,.18)", color: "#BDF5D3" } : { background: "rgba(253,0,1,.18)", color: "#FFD1D1" }}>
                {signed(r.delta.marks)}
              </span>
            )}
          </div>
        </section>

        {r.sections.length > 0 && (
          <section className="card pad col rise gap-3" style={{ "--i": 1 } as React.CSSProperties} aria-label="Sections">
            {r.sections.map((s, i) => (
              <div key={s.id} className="col gap-1.5">
                <div className="row sm gap-1.5">
                  <span className="font-semibold">{s.subject ?? s.name}</span>
                  {weakest?.id === s.id && (
                    <>
                      <InkArrow delay={1500} style={{ marginTop: 2 }} />
                      <Note tone="pen" size="sm" write rotate={-3} delay={1700}>
                        start here
                      </Note>
                    </>
                  )}
                  <span className="num ml-auto">{num(s.score)}</span>
                </div>
                <div className="bar" style={{ height: 6 }} aria-hidden="true">
                  <i style={{ width: `${Math.max(0, Math.min(100, 100 * pct(s)))}%`, animationDelay: `${i * 0.1}s` }} />
                </div>
              </div>
            ))}
          </section>
        )}

        <MarksWentCard st={ai} now={now} />

        <AnswersCard r={r} i={2} className="p-4" />

        {data.review.available && firstN ? (
          <Link href={`/results/${encodeURIComponent(data.test.id)}/q/${firstN}?filter=${filter}`} className="btn btn-primary btn-lg rise" style={{ "--i": 3 } as React.CSSProperties}>
            {toReview.length ? `Review ${toReview.length} ${toReview.length === 1 ? "question" : "questions"}` : `Review all ${r.questions.length} questions`}
            <ArrowRightIcon className="arrow" />
          </Link>
        ) : (
          <div className="card row rise gap-3 p-4" style={{ "--i": 3 } as React.CSSProperties}>
            <span className="text-muted">
              <LockIcon size={18} />
            </span>
            <span className="sm">
              {sentence(data.review.reason || "Answers and solutions open when the test has closed for everyone")}
              {data.review.availableAt ? ` They open ${relativeDayTime(now, data.review.availableAt)}.` : ""}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Pending and hidden (Student-ResultPending)
// ---------------------------------------------------------------------------------------------

function Pending({ data, now }: { data: StudentResult; now: number }) {
  const client = useQueryClient();
  const v = data.visibility;
  const hidden = v.status === "hidden";
  const at = !hidden ? v.availableAt : null;
  const left = at ? (Date.parse(at) - now) / 1000 : 0;
  const due = at ? left <= 0 : false;
  // The publish time has come: ask again (it is now published, or the teacher moved it).
  useEffect(() => {
    if (due) client.invalidateQueries({ queryKey: qk.result(data.test.id) });
  }, [due, client, data.test.id]);
  const parts = countdownParts(left);
  const pad = (n: number) => String(n).padStart(2, "0");
  const s = data.submission;

  const lead =
    hidden
      ? sentence(v.reason || "Your institute does not share results for this test")
      : v.mode === "atTheEndOfTest"
        ? "Results come out for everyone when the test closes."
        : v.mode === "manual"
          ? "Your teacher publishes results for everyone at the same time."
          : "Your teacher publishes results for everyone at the same time.";

  return (
    <div className="col mx-auto w-full max-w-[896px] gap-6 md:-mt-1 max-md:gap-0">
      <Doodle name="parabola" slot="gl" style={{ top: 250 }} />
      <Doodle name="integral" slot="gr" style={{ top: 600 }} />
      <PhoneBar title={data.test.name} />
      <BackToTests className="max-md:hidden" />

      <div className="col gap-6 max-md:gap-3.5 max-md:p-4">
        <section className="hero cl-board row wrap rise gap-8 p-9 max-md:gap-5 max-md:rounded-[20px] max-md:p-5">
          <span className="cl-smudge" aria-hidden="true" style={{ left: -80, bottom: 10 }} />
          {!hidden && (
            <span className="max-md:hidden">
              <HourglassRing />
            </span>
          )}
          <div className="col relative flex-[1_1_360px] gap-2.5 max-md:flex-[1_1_100%]">
            <span className="badge self-start" style={{ background: "rgba(255,255,255,.14)", color: "#fff" }}>
              Submitted · answers saved
            </span>
            <h1 className="h1 mb-1 text-white" style={{ fontSize: 32 }}>
              <Title name={data.test.name} />
            </h1>
            <p className="body m-0" style={{ color: "#D6D8FA", textWrap: "pretty" }}>
              {lead}
              {at && (
                <>
                  {" "}
                  They&apos;ll be out on <b className="whitespace-nowrap text-white">{dowDayMonthTime(at)}</b>.
                </>
              )}
              {!hidden && !at && " We'll show it here as soon as it's out."}
            </p>
            {at && left > 0 && (
              <div className="row mt-1.5 items-end gap-2.5 max-md:flex-wrap" role="timer" aria-label={`Result in ${parts.days} days ${parts.hours} hours ${parts.min} minutes`}>
                {(
                  [
                    [parts.days, "days"],
                    [parts.hours, "hours"],
                    [parts.min, "min"],
                    [parts.sec, "sec"],
                  ] as const
                ).map(([n, l]) => (
                  <div key={l} className="col min-w-16 items-center rounded-xl px-2 py-2.5 max-md:min-w-[60px]" style={{ background: "rgba(255,255,255,.1)" }} aria-hidden="true">
                    <span className="mono num text-[26px] font-semibold text-white max-md:text-[22px]">{pad(n)}</span>
                    <span className="xs" style={{ color: "#C3C6EF" }}>
                      {l}
                    </span>
                  </div>
                ))}
                <Note tone="chalk" write rotate={-4} delay={900} className="ml-auto max-md:hidden" style={{ fontSize: 20 }}>
                  out on {dayMonth(at)}
                </Note>
              </div>
            )}
          </div>
        </section>

        <section className="grid grid-cols-2 gap-4 max-md:grid-cols-1 max-md:gap-3">
          <article className="card pad col rise gap-2" style={{ "--i": 1 } as React.CSSProperties}>
            <span className="sm muted">Submitted</span>
            <span className="h3">{dowDayMonthTime(s.submittedAt)}</span>
            <span className="xs muted">
              Receipt ID <span className="mono">{s.receiptId}</span>
              {s.autoSubmitted ? " · submitted automatically when time ran out" : ""}
            </span>
          </article>
          <article className="card pad col rise gap-2" style={{ "--i": 2 } as React.CSSProperties}>
            <span className="sm muted">Attempted</span>
            <span className="h3 num">
              {s.attemptedCount} of {s.totalQuestions}
            </span>
            <span className="xs muted">
              {Math.round(s.timeUsedSeconds / 60)} of {s.durationMinutes} minutes used
            </span>
          </article>
        </section>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Errors and loading
// ---------------------------------------------------------------------------------------------

function ResultProblem({ error, testId, onRetry }: { error: unknown; testId: string; onRetry: () => void }) {
  const start = useStartTest();
  const e = error instanceof StudentApiError ? error : null;
  let title = "";
  let body: React.ReactNode = null;
  if (e?.code === "TEST_NOT_FOUND") {
    title = "We couldn't find this test";
    body = "It may have been removed, or it isn't assigned to your batch.";
  } else if (e?.code === "NO_SUBMISSION") {
    const state = e.details?.state;
    if (state === "live") {
      title = "You haven't taken this test yet";
      body = (
        <button type="button" className="btn btn-primary self-start" onClick={() => start(testId)}>
          Start test
          <ArrowRightIcon className="arrow" />
        </button>
      );
    } else if (state === "upcoming") {
      title = "This test hasn't opened yet";
      body = "Its result shows here after you take it.";
    } else if (state === "in_progress") {
      title = "Opening your test…";
    } else {
      title = "You didn't take this test";
      body = "It closed before a submission was made, so there is no result.";
    }
  }
  return (
    <div className="col gap-6 max-md:p-4">
      <BackToTests />
      {title ? (
        <div className="card col items-start gap-3 p-6">
          <span className="h3">{title}</span>
          {typeof body === "string" ? <span className="sm muted">{body}</span> : body}
        </div>
      ) : (
        <ErrorCard error={error} onRetry={onRetry} />
      )}
    </div>
  );
}

function ResultSkeleton() {
  return (
    <div className="col gap-6 max-md:gap-3.5 max-md:p-4" aria-busy="true" aria-label="Loading your result">
      <Skel className="h-5 w-16 max-md:hidden" />
      <Skel className="h-9 w-80 max-md:h-7 max-md:w-56" />
      <div className="grid grid-cols-4 gap-5 max-md:grid-cols-1">
        <Skel className="col-span-2 h-[205px] rounded-card max-md:col-span-1 max-md:h-[240px] max-md:rounded-[20px]" />
        <Skel className="h-[205px] rounded-card max-md:hidden" />
        <Skel className="h-[205px] rounded-card max-md:hidden" />
      </div>
      <div className="grid grid-cols-3 gap-5 max-md:grid-cols-1">
        <Skel className="h-[107px] rounded-card" />
        <Skel className="h-[107px] rounded-card max-md:hidden" />
        <Skel className="h-[107px] rounded-card max-md:hidden" />
      </div>
    </div>
  );
}
