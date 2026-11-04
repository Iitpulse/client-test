"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { qk, StudentApiError, studentApi } from "@/lib/student-api";
import { mmss, relativeDayTime } from "@/lib/time";
import { useServerClock } from "@/lib/server-clock";
import type { ReviewFilter, ReviewQuestion } from "@/types/m2-student";
import { ArrowLeftIcon, ArrowRightIcon } from "@/components/shell/icons";
import { ErrorCard, Skel } from "./common";
import { ChevronLeftIcon, LockIcon } from "./icons";
import { OUTCOME_BADGE, outcomeText, sentence, subjectLabel } from "./labels";
import { LangToggle, numberingFrom, QuestionBody, shownNumber, Solution, type Lang } from "./question-body";

const FILTERS: ReviewFilter[] = ["all", "correct", "wrong", "skipped", "review"];

/**
 * /results/[testId]/q/[n]: Phone-Review, one question at a time with a strip of the questions in the filter and
 * Previous / Next. On desktop the same screen sits in the shell, centred (the result page has the pane).
 *
 * The question itself comes from GET …/questions/:n (fast first paint); the filter's list from GET …/questions
 * follows, which gives the strip, the exam numbering (shownAs) for every question and instant Previous / Next.
 * Questions are ordered and numbered as the student saw them, with the paper's number second.
 * Out of M2: "Why this happened" (AI) and "Ask a doubt"; the institute's own solution shows instead.
 */
export function ReviewView({ testId, n }: { testId: string; n: number }) {
  const search = useSearchParams();
  const f = search.get("filter");
  const filter: ReviewFilter = f && (FILTERS as string[]).includes(f) ? (f as ReviewFilter) : "all";

  const listQ = useQuery({
    queryKey: qk.reviewList(testId, filter),
    queryFn: ({ signal }) => studentApi.reviewList(testId, filter, signal),
    staleTime: 10 * 60_000,
  });
  const fromList = listQ.data?.items.find((i) => i.n === n);
  const itemQ = useQuery({
    queryKey: qk.reviewItem(testId, n, filter),
    queryFn: ({ signal }) => studentApi.reviewItem(testId, n, filter, signal),
    enabled: !fromList && !listQ.data, // the list answers it once loaded
    staleTime: 10 * 60_000,
  });
  // Server time for "opens tomorrow, 1:02 AM" in the not-yet message (the review routes carry no `now`).
  const resultQ = useQuery({ queryKey: qk.result(testId), queryFn: ({ signal }) => studentApi.result(testId, signal), enabled: listQ.isError || itemQ.isError });
  const now = useServerClock(resultQ.data?.now, resultQ.dataUpdatedAt, false);

  const q: ReviewQuestion | undefined = fromList ?? itemQ.data?.item;
  const known = useMemo(() => numberingFrom(listQ.data?.items), [listQ.data]);
  const ordered = useMemo(() => [...(listQ.data?.items ?? [])].sort((a, b) => shownNumber(a, known) - shownNumber(b, known)), [listQ.data, known]);
  const idx = ordered.findIndex((i) => i.n === n);
  const position = idx >= 0 ? { index: idx + 1, of: ordered.length } : itemQ.data?.position;
  const prevN = idx >= 0 ? ordered[idx - 1]?.n ?? null : itemQ.data?.prevN ?? null;
  const nextN = idx >= 0 ? ordered[idx + 1]?.n ?? null : itemQ.data?.nextN ?? null;
  const label = q ? shownNumber(q, known) : n;
  const href = (to: number) => `/results/${encodeURIComponent(testId)}/q/${to}${filter !== "all" ? `?filter=${filter}` : ""}`;
  const back = `/results/${encodeURIComponent(testId)}`;
  const labelOf = (m: number) => {
    const it = ordered.find((i) => i.n === m);
    return it ? shownNumber(it, known) : m;
  };

  const subtitle = [q && label !== q.n ? `Paper Q${q.n}` : null, position ? `${filter === "review" ? "Reviewing" : "Question"} ${position.index} of ${position.of}` : null].filter(Boolean).join(" · ");
  const [lang, setLang] = useState<Lang>("en");
  let error: unknown = null;
  if (!q) {
    if (listQ.data) error = new StudentApiError(404, "This question is not in this list", "QUESTION_NOT_FOUND");
    else if (itemQ.error) error = itemQ.error;
    else if (listQ.error && !itemQ.isFetching) error = listQ.error;
  }

  // Keep the current question in view in the strip.
  const strip = useRef<HTMLElement>(null);
  useEffect(() => {
    strip.current?.querySelector('[aria-current="true"]')?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [n, ordered.length]);

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
          {q && <span className={`badge ${q.outcome === "wrong" ? "b-live" : OUTCOME_BADGE[q.outcome]}`}>{outcomeText(q)}</span>}
        </div>
        {ordered.length > 1 && (
          <nav ref={strip} className="qstrip" aria-label="Questions in this list">
            {ordered.map((i) => {
              const on = i.n === n;
              const l = shownNumber(i, known);
              return (
                <Link key={i.n} href={href(i.n)} replace scroll={false} className={`qc qc-${i.outcome}${on ? " qc-on" : ""}`} aria-current={on ? "true" : undefined} aria-label={`Question ${l}, ${i.outcome}`}>
                  {l}
                </Link>
              );
            })}
          </nav>
        )}
      </header>

      <div className="col flex-1 gap-3 px-4 pt-3.5 pb-[calc(96px+env(safe-area-inset-bottom))] md:px-0 md:pb-0" aria-live="polite">
        {error ? (
          <ReviewProblem error={error} now={resultQ.data ? now : null} back={back} onRetry={() => (listQ.isError ? listQ.refetch() : itemQ.refetch())} />
        ) : !q ? (
          <div className="col gap-3" aria-busy="true" aria-label="Loading the question">
            <Skel className="h-28 w-full rounded-[14px]" />
            {[0, 1, 2, 3].map((k) => (
              <Skel key={k} className="h-14 w-full rounded-xl" />
            ))}
          </div>
        ) : (
          <>
            <div className="row xs muted gap-2">
              {q.subject && <span className="badge b-grey flex-none">{subjectLabel(q.subject)}</span>}
              <span className="grow min-w-0">
                Your time <b className="num text-ink">{mmss(q.timeSeconds)}</b>
                {q.averageTimeSeconds != null ? ` · average ${mmss(q.averageTimeSeconds)}` : ""}
                {q.correctPercent != null ? ` · ${q.correctPercent}% got it right` : ""}
              </span>
              <span className="flex-none">
                <LangToggle q={q} lang={lang} onChange={setLang} />
              </span>
            </div>
            <QuestionBody key={q.n} q={q} lang={lang} compact />
            <Solution q={q} lang={lang} className="rise" />
          </>
        )}
      </div>

      {!error && (
      <footer className="fixed inset-x-0 bottom-0 z-(--z-topbar) row gap-2 border-t border-line bg-white px-4 pt-3 pb-[max(26px,env(safe-area-inset-bottom))] md:static md:border-0 md:bg-transparent md:px-0 md:pt-4 md:pb-0">
        {prevN !== null ? (
          <Link href={href(prevN)} replace className="btn btn-secondary btn-lg flex-1">
            <ArrowLeftIcon />
            Previous
          </Link>
        ) : (
          <Link href={back} className="btn btn-secondary btn-lg flex-1">
            Back to result
          </Link>
        )}
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
      </footer>
      )}
    </div>
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
