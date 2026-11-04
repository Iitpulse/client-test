"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { qk, studentApi } from "@/lib/student-api";
import { relativeDayTime, mmss } from "@/lib/time";
import { useIsDesktop } from "@/lib/use-media";
import type { PublishedResult, QuestionCell, QuestionOutcome, ReviewQuestion, StudentResult } from "@/types/m2-student";
import { ErrorCard, Skel } from "./common";
import { LockIcon } from "./icons";
import { OUTCOME_BADGE, outcomeText, sentence } from "./labels";
import { LangToggle, QuestionBody, Solution, type Lang } from "./question-body";

type GridFilter = "all" | QuestionOutcome;

/**
 * Student-Result's "Question review": the question grid (left, sticky) and the selected question (right).
 * The grid comes with the result; the questions with answers come from GET …/questions (fetched once, desktop
 * only) and only after the test has settled (review.available), so nobody still writing can be fed answers.
 * Questions are numbered as the student saw them in the exam (shownAs), with the paper's number second.
 */
export function ReviewPane({ data, r, now }: { data: StudentResult; r: PublishedResult; now: number }) {
  const isDesktop = useIsDesktop();
  const testId = data.test.id;
  const available = data.review.available;
  const listQ = useQuery({
    queryKey: qk.reviewList(testId, "all"),
    queryFn: ({ signal }) => studentApi.reviewList(testId, "all", signal),
    enabled: isDesktop === true && available,
    staleTime: 10 * 60_000, // the answer key does not change
  });
  const cells = r.questions; // in the student's order (shownAs), as the API sends them

  const [filter, setFilter] = useState<GridFilter>("all");
  const [sel, setSel] = useState<number | null>(null);
  const firstToReview = cells.find((c) => c.outcome !== "correct") ?? cells[0];
  const selected = cells.find((c) => c.n === sel) ?? firstToReview;
  const q = listQ.data?.items.find((i) => i.n === selected?.n);

  const c = r.counts;
  const filters: Array<[GridFilter, string, number]> = [
    ["all", "All", c.total],
    ["wrong", "Wrong", c.wrong],
    ...(c.partial ? ([["partial", "Partly correct", c.partial]] as Array<[GridFilter, string, number]>) : []),
    ["skipped", "Skipped", c.skipped],
    ["correct", "Correct", c.correct],
  ];
  const pick = (f: GridFilter) => {
    setFilter(f);
    // Jump to the first question of the new filter, as the grid dims the rest.
    if (f !== "all" && selected?.outcome !== f) {
      const first = cells.find((x) => x.outcome === f);
      if (first) setSel(first.n);
    }
  };

  if (!selected) return null;
  return (
    <section className="col gap-4" aria-labelledby="review-h">
      <div className="row between wrap gap-3">
        <h2 id="review-h" className="h2">
          Question review
        </h2>
        <div className="seg" role="group" aria-label="Show">
          {filters.map(([k, label, n]) => (
            <button key={k} type="button" className={filter === k ? "tab on" : "tab"} aria-pressed={filter === k} onClick={() => pick(k)}>
              {label} <span className="count">{n}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-start gap-5">
        <aside className="card pad col sticky top-6 max-w-[340px] flex-[1_1_300px] gap-3.5 self-start" aria-label="Questions">
          <span className="sm muted">Tap a question</span>
          <div className="grid grid-cols-8 gap-1.5">
            {cells.map((cell) => {
              const label = cell.shownAs;
              const dim = filter !== "all" && cell.outcome !== filter;
              const on = cell.n === selected.n;
              return (
                <button
                  key={cell.n}
                  type="button"
                  className={`q-cell ${cell.outcome}${dim ? " dim" : ""}${on ? " sel" : ""}`}
                  aria-label={`Question ${label}, ${cell.outcome}`}
                  aria-current={on ? "true" : undefined}
                  onClick={() => setSel(cell.n)}
                >
                  {label}
                </button>
              );
            })}
          </div>
          <div className="row wrap xs muted gap-3">
            <span className="row gap-1.5">
              <span className="swatch correct" />
              Correct
            </span>
            {c.partial > 0 && (
              <span className="row gap-1.5">
                <span className="swatch partial" />
                Partly correct
              </span>
            )}
            <span className="row gap-1.5">
              <span className="swatch wrong" />
              Wrong
            </span>
            <span className="row gap-1.5">
              <span className="swatch skipped" />
              Skipped
            </span>
          </div>
        </aside>

        <div className="col min-w-0 flex-[999_1_560px] gap-5">
          <QuestionCard key={selected.n} cell={selected} label={selected.shownAs} data={data} now={now} q={q} loading={available && (listQ.isPending || isDesktop === null)} error={listQ.error} onRetry={() => listQ.refetch()} />
        </div>
      </div>
    </section>
  );
}

function QuestionCard({
  cell,
  label,
  data,
  now,
  q,
  loading,
  error,
  onRetry,
}: {
  cell: QuestionCell;
  label: number;
  data: StudentResult;
  now: number;
  q: ReviewQuestion | undefined;
  loading: boolean;
  error: unknown;
  onRetry: () => void;
}) {
  const [lang, setLang] = useState<Lang>("en");
  const [showSolution, setShowSolution] = useState(false);
  const avg = q?.averageTimeSeconds;
  return (
    <article className="card pad-lg col fade gap-[18px]" aria-label={`Question ${label}`}>
      <div className="row between wrap gap-2">
        <div className="row wrap gap-2.5">
          <span className="h3 mono">Q{label}</span>
          {label !== cell.n && <span className="xs muted">Paper Q{cell.n}</span>}
          {cell.subject && <span className="badge b-grey">{cell.subject}</span>}
          <span className={`badge ${OUTCOME_BADGE[cell.outcome]}`}>{outcomeText(cell)}</span>
        </div>
        <span className="xs muted">
          Your time{" "}
          <span className="num font-semibold text-ink">{mmss(cell.timeSeconds)}</span>
          {avg != null ? ` · average ${mmss(avg)}` : ""}
          {q?.correctPercent != null ? ` · ${q.correctPercent}% got it right` : ""}
        </span>
      </div>

      {!data.review.available ? (
        <div className="row gap-3 rounded-xl bg-[var(--line-2)] p-4">
          <span className="text-muted">
            <LockIcon size={18} />
          </span>
          <span className="sm">
            {sentence(data.review.reason || "Answers and solutions open when the test has closed for everyone")}
            {data.review.availableAt ? ` They open ${relativeDayTime(now, data.review.availableAt)}.` : ""}
          </span>
        </div>
      ) : error && !q ? (
        <ErrorCard error={error} onRetry={onRetry} />
      ) : loading || !q ? (
        <div className="col gap-2.5" aria-busy="true" aria-label="Loading the question">
          <Skel className="h-6 w-full" />
          <Skel className="h-6 w-4/5" />
          {[0, 1, 2, 3].map((k) => (
            <Skel key={k} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <>
          <QuestionBody q={q} lang={lang} />
          {cell.outcome === "skipped" && q.options.length > 0 && <span className="sm muted">You skipped this question.</span>}
          <div className="row wrap gap-2.5">
            {(q.solution.en || q.solution.hi) && (
              <button type="button" className="btn btn-secondary" aria-expanded={showSolution} onClick={() => setShowSolution((v) => !v)}>
                {showSolution ? "Hide solution" : "Official solution"}
              </button>
            )}
            <LangToggle q={q} lang={lang} onChange={setLang} />
          </div>
          {showSolution && <Solution q={q} lang={lang} />}
        </>
      )}
    </article>
  );
}

