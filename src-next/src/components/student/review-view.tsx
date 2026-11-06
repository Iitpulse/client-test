"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { qk, StudentApiError, studentApi } from "@/lib/student-api";
import { mmss, relativeDayTime } from "@/lib/time";
import { useServerClock } from "@/lib/server-clock";
import { useIsDesktop } from "@/lib/use-media";
import type { QuestionCell, QuestionOutcome, ReviewFilter, ReviewQuestion, StudentResult } from "@/types/m2-student";
import { reviewExtras } from "@/types/m6-review";
import { ArrowRightIcon } from "@/components/shell/icons";
import { ErrorCard, Skel, useFixtureAfterHydration } from "./common";
import { ChevronLeftIcon, LockIcon } from "./icons";
import { OUTCOME_BADGE, sentence } from "./labels";
import { LangToggle, QuestionBody, Solution, type Lang } from "./question-body";
import { canExplain, explainLabel, useWhyState, WhyView } from "./review-ai";
import { KeyCorrectedNote, PassageBlock, reviewStatus, SetKids, setCells, typeLabel } from "./review-parts";
import { fixtureItem, reviewFixtureFor, type ReviewFixture } from "./review-fixtures";
import { B7ToastBar, RevisionToggle, useB7Toast } from "./revision-bits";
import { ReviewPane } from "./review-pane";

const FILTERS: ReviewFilter[] = ["all", "correct", "wrong", "skipped", "review"];

/** The contract's filters: review = wrong + partial + skipped. */
function inFilter(o: QuestionOutcome, f: ReviewFilter): boolean {
  return f === "all" || (f === "review" ? o !== "correct" : o === f);
}

/**
 * /results/[testId]/q/[n]. Phone (Phone-Review + Student-Review's phone states): one question at a time with a strip of
 * the questions in the filter and Next. Desktop: Student-Review, the result page's "Question review" (review-pane.tsx)
 * with this question selected; picking another one moves the route.
 *
 * The question, its place in the filter, its neighbours and the server time come from GET …/questions/:n (the
 * neighbours are fetched ahead, so Next is instant). The strip comes from the result's grid, filtered here.
 * Questions are numbered as the student saw them (shownAs), with the paper's number second; `n` is the route key.
 * M3/M6: "Why this happened" opens by itself on the phone (Phone-Review), with the board's states (review-ai.tsx).
 * M6 fixtures (dev / staging / NEXT_PUBLIC_M6_FIXTURES=1): ?fixture=single|multiple|numerical|paragraph|matrix
 * &kc=1&ai=<state> (review-fixtures.ts) renders the board's data with no calls.
 */
export function ReviewView({ testId, n }: { testId: string; n: number }) {
  const search = useSearchParams();
  const f = search.get("filter");
  const filter: ReviewFilter = f && (FILTERS as string[]).includes(f) ? (f as ReviewFilter) : "all";
  const client = useQueryClient();
  const router = useRouter();
  const isDesktop = useIsDesktop();

  // undefined until the URL is read (after hydration), then the fixture or null.
  const fxType = useFixtureAfterHydration();
  const kc = search.get("kc");
  const aiFx = search.get("ai");
  const fixture = useMemo<ReviewFixture | null | undefined>(() => (fxType === undefined ? undefined : reviewFixtureFor(testId, fxType, kc, aiFx)), [testId, fxType, kc, aiFx]);
  const live = fixture === null;

  const itemFn = (m: number) => ({
    queryKey: qk.reviewItem(testId, m, filter),
    queryFn: ({ signal }: { signal: AbortSignal }) => studentApi.reviewItem(testId, m, filter, signal),
    staleTime: 10 * 60_000, // the answer key does not change
  });
  const itemQ = useQuery({ ...itemFn(n), enabled: live && isDesktop === false });
  const resultQ = useQuery({ queryKey: qk.result(testId), queryFn: ({ signal }) => studentApi.result(testId, signal), enabled: live });
  const fx = fixture ? fixtureItem(fixture, n, (o) => inFilter(o, filter)) : null;
  const resultData: StudentResult | undefined = fixture ? fixture.result : resultQ.data;
  const serverNow = fixture ? fixture.result.now : (itemQ.data?.now ?? resultQ.data?.now);
  const now = useServerClock(serverNow, fixture ? 0 : itemQ.data ? itemQ.dataUpdatedAt : resultQ.dataUpdatedAt, false);

  const q: ReviewQuestion | undefined = fixture ? fx?.item : itemQ.data?.item;
  const cells = (resultData?.result?.questions ?? []).filter((c) => inFilter(c.outcome, filter));
  const labelOf = (m: number) => resultData?.result?.questions.find((c) => c.n === m)?.shownAs ?? m;
  const label = q ? q.shownAs : labelOf(n);
  const position = fixture ? fx?.position : itemQ.data?.position;
  const prevN = (fixture ? fx?.prevN : itemQ.data?.prevN) ?? null;
  const nextN = (fixture ? fx?.nextN : itemQ.data?.nextN) ?? null;
  const qs = (extra: string | null) => [filter !== "all" ? `filter=${filter}` : null, fixture ? fixture.search : null, extra].filter(Boolean).join("&");
  const href = (to: number) => {
    const s = qs(null);
    return `/results/${encodeURIComponent(testId)}/q/${to}${s ? `?${s}` : ""}`;
  };
  const back = `/results/${encodeURIComponent(testId)}`;
  const doubtHref = `/results/${encodeURIComponent(testId)}/q/${n}/doubt`;

  // Fetch the neighbours ahead, so Next shows at once (phone).
  useEffect(() => {
    if (!live || isDesktop !== false) return;
    for (const m of [nextN, prevN]) if (m !== null) client.prefetchQuery(itemFn(m));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- itemFn is rebuilt every render from testId and filter
  }, [client, nextN, prevN, testId, filter, live, isDesktop]);

  // Keep the current question in view in the strip.
  const strip = useRef<HTMLElement>(null);
  useEffect(() => {
    strip.current?.querySelector('[aria-current="true"]')?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [n, cells.length]);

  if (isDesktop === true && fixture !== undefined) {
    const err: unknown = !resultData && resultQ.isError ? resultQ.error : null;
    const r = resultData?.result;
    return (
      <div className="col w-full gap-4 pb-10">
        <nav className="row sm gap-2 text-muted" aria-label="Breadcrumb">
          <Link href="/tests" className="text-muted">
            Tests
          </Link>
          <span aria-hidden="true">/</span>
          <Link href={back} className="text-muted">
            {resultData?.test.name ?? "Result"}
          </Link>
          <span aria-hidden="true">/</span>
          <span className="font-semibold text-ink">Review</span>
        </nav>
        {err ? (
          <ReviewProblem error={err} now={null} back={back} onRetry={() => resultQ.refetch()} />
        ) : !resultData ? (
          <div className="col gap-3" aria-busy="true" aria-label="Loading the review">
            <Skel className="h-9 w-64" />
            <Skel className="h-96 w-full rounded-card" />
          </div>
        ) : !r ? (
          <div className="card col items-start gap-3 p-5">
            <span className="row gap-2 text-muted">
              <LockIcon size={18} />
              <span className="h3 text-ink">Your result isn&apos;t out yet</span>
            </span>
            <Link href={back} className="btn btn-secondary">
              Back to the result
            </Link>
          </div>
        ) : (
          <ReviewPane data={resultData} r={r} now={now} sel={n} onSel={(m) => router.replace(href(m), { scroll: false })} fixture={fixture} />
        )}
      </div>
    );
  }

  const subtitle = [q && label !== q.n ? `Paper Q${q.n}` : null, position ? `${filter === "review" ? "Reviewing" : "Question"} ${position.index} of ${position.of}` : null].filter(Boolean).join(" · ");
  const error: unknown = !q && itemQ.isError ? itemQ.error : null;

  return (
    <div className="col mx-auto min-h-dvh w-full max-w-[760px] md:min-h-0 md:gap-4">
      <header className="sticky top-0 z-(--z-topbar) col gap-2 border-b border-line bg-white/90 px-3 pt-[calc(8px+env(safe-area-inset-top))] pb-2.5 backdrop-blur-md md:static md:rounded-card md:border md:px-5 md:pt-3">
        <div className="row gap-1.5">
          <Link href={back} className="btn btn-ghost btn-icon size-11 flex-none" aria-label="Back to the result">
            <ChevronLeftIcon />
          </Link>
          <span className="col grow min-w-0 justify-center gap-px">
            <h1 className="h3">Question {label}</h1>
            {subtitle && <span className="xs muted">{subtitle}</span>}
          </span>
          {q && <span className={`badge flex-none ${q.outcome === "wrong" ? "b-live" : OUTCOME_BADGE[q.outcome]}`}>{reviewStatus(q)}</span>}
        </div>
        {cells.length > 1 && (
          <nav ref={strip} className="qstrip" aria-label="Questions in this list">
            {cells.map((i) => {
              const on = i.n === n;
              const l = i.shownAs;
              return (
                <Link key={i.n} href={href(i.n)} replace scroll={false} className={`qc qc-${i.outcome}${on ? " qc-on" : ""}`} aria-current={on ? "true" : undefined} aria-label={`Question ${l}, ${i.outcome}`}>
                  {l}
                </Link>
              );
            })}
          </nav>
        )}
      </header>

      {error ? (
        <div className="col flex-1 gap-3 px-4 pt-3.5 md:px-0">
          <ReviewProblem error={error} now={resultQ.data ? now : null} back={back} onRetry={() => itemQ.refetch()} />
        </div>
      ) : !q || !resultData ? (
        <div className="col flex-1 gap-3 px-4 pt-3.5 md:px-0" aria-busy="true" aria-label="Loading the question">
          <Skel className="h-28 w-full rounded-[14px]" />
          {[0, 1, 2, 3].map((k) => (
            <Skel key={k} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <PhoneQuestion
          key={q.n}
          q={q}
          data={resultData}
          cells={resultData.result?.questions ?? []}
          now={serverNow ? now : null}
          fixture={fixture ?? null}
          kidHref={href}
          footer={(explain) => (
            <footer className="fixed inset-x-0 bottom-0 z-(--z-topbar) row gap-2 border-t border-line bg-white px-4 pt-3 pb-[max(26px,env(safe-area-inset-bottom))] md:static md:border-0 md:bg-transparent md:px-0 md:pt-4 md:pb-0">
              {explain ? (
                <>
                  {explain}
                  <Link href={doubtHref} className="btn btn-secondary btn-lg flex-1">
                    Ask a doubt
                  </Link>
                </>
              ) : (
                <>
                  <Link href={doubtHref} className="btn btn-secondary btn-lg flex-1">
                    Ask a doubt
                  </Link>
                  {nextN !== null ? (
                    <Link href={href(nextN)} replace className="btn btn-primary btn-lg flex-1">
                      Next: Q{labelOf(nextN)}
                      <ArrowRightIcon className="arrow" />
                    </Link>
                  ) : (
                    <Link href={back} className="btn btn-primary btn-lg flex-1">
                      Done
                    </Link>
                  )}
                </>
              )}
            </footer>
          )}
        />
      )}

      {error ? (
        <footer className="fixed inset-x-0 bottom-0 z-(--z-topbar) row gap-2 border-t border-line bg-white px-4 pt-3 pb-[max(26px,env(safe-area-inset-bottom))] md:static md:border-0 md:bg-transparent md:px-0 md:pt-4 md:pb-0">
          <Link href={back} className="btn btn-primary btn-lg flex-1">
            Back to result
          </Link>
        </footer>
      ) : null}
    </div>
  );
}

/** Phone: one question with the board's states (key corrected, passage, type, AI). */
function PhoneQuestion({
  q,
  data,
  cells,
  now,
  fixture,
  kidHref,
  footer,
}: {
  q: ReviewQuestion;
  data: StudentResult;
  cells: QuestionCell[];
  now: number | null;
  fixture: ReviewFixture | null;
  kidHref: (n: number) => string;
  footer: (explain: React.ReactNode | null) => React.ReactNode;
}) {
  const [lang, setLang] = useState<Lang>("en");
  const [toast, setToast] = useB7Toast();
  // Phone-Review shows the explanation without a button; the board's not-asked state is the fixture's.
  const [asked, setAsked] = useState(fixture?.ai !== "not-asked");
  const hasSolution = !!(q.solution.en || q.solution.hi);
  const explainable = fixture ? true : canExplain(q.outcome, q);
  const st = useWhyState(data.test.id, q.n, explainable && asked, hasSolution, explainable && fixture ? fixture.why(q.n) : null);
  const x = reviewExtras(q);
  const labelOf = (m: number) => cells.find((c) => c.n === m)?.shownAs ?? m;
  const showSolution = st.kind !== "locked" && !(st.kind === "ready" && st.noSolution);
  const explain =
    explainable && st.kind === "not-asked" ? (
      <button type="button" className="btn btn-primary btn-lg flex-1" onClick={() => setAsked(true)}>
        {explainLabel(q.outcome)}
      </button>
    ) : null;
  return (
    <>
      <div className="col flex-1 gap-3 px-4 pt-3.5 pb-[calc(96px+env(safe-area-inset-bottom))] md:px-0 md:pb-0" aria-live="polite">
        <div className="row items-start gap-2">
          <div className="row wrap grow gap-1.5">
            {q.subject && <span className="badge b-grey">{q.subject}</span>}
            <span className="badge b-grey">{typeLabel(q, !!x.set)}</span>
            {x.keyCorrection && <span className="badge b-navy">Key corrected</span>}
          </div>
          <span className="-my-1.5 flex-none">
            <LangToggle q={q} lang={lang} onChange={setLang} />
          </span>
        </div>
        <div className="row between -mt-1 gap-2">
          <span className="xs muted">
            Your time <b className="num text-ink">{mmss(q.timeSeconds)}</b>
            {q.averageTimeSeconds != null ? ` · batch ${mmss(q.averageTimeSeconds)}` : ""}
          </span>
          {!fixture && data.review.available && <RevisionToggle testId={data.test.id} cell={q} onToast={setToast} phone />}
        </div>
        {x.keyCorrection && <KeyCorrectedNote note={x.keyCorrection} q={q} compact />}
        {x.set && (
          <>
            <PassageBlock set={x.set} lang={lang} labelOf={labelOf} compact />
            <SetKids kids={setCells(x.set, cells)} current={q.n} hrefOf={kidHref} />
          </>
        )}
        <QuestionBody q={q} lang={lang} compact />
        {explainable && <WhyView st={st} testId={data.test.id} n={q.n} now={now} hasSolution={hasSolution} compact fixture={!!fixture} />}
        {showSolution && <Solution q={q} lang={lang} className="rise" />}
      </div>
      {footer(explain)}
      <B7ToastBar toast={toast} onClose={() => setToast(null)} />
    </>
  );
}

function ReviewProblem({ error, now, back, onRetry }: { error: unknown; now: number | null; back: string; onRetry: () => void }) {
  const e = error instanceof StudentApiError ? error : null;
  if (e?.code === "REVIEW_NOT_AVAILABLE_YET" || e?.code === "RESULT_NOT_AVAILABLE") {
    const at = typeof e.details?.availableAt === "string" ? e.details.availableAt : null;
    return (
      <div className="card col items-start gap-3 p-5">
        <span className="row gap-2 text-muted">
          <LockIcon size={18} />
          <span className="h3 text-ink">{e.code === "RESULT_NOT_AVAILABLE" ? "Your result isn't out yet" : "Answers aren't open yet"}</span>
        </span>
        <span className="sm muted">
          {sentence(e.message)}
          {at ? ` They open ${now !== null ? relativeDayTime(now, at) : "soon"}.` : ""}
        </span>
        <Link href={back} className="btn btn-secondary">
          Back to the result
        </Link>
      </div>
    );
  }
  if (e?.code === "QUESTION_NOT_FOUND") {
    return (
      <div className="card col items-start gap-3 p-5">
        <span className="h3">This question isn&apos;t in this list</span>
        <Link href={back} className="btn btn-secondary">
          Back to the result
        </Link>
      </div>
    );
  }
  return <ErrorCard error={error} onRetry={onRetry} />;
}
