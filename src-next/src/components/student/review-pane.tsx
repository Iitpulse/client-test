"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { qk, studentApi } from "@/lib/student-api";
import { relativeDayTime, mmss } from "@/lib/time";
import { useIsDesktop } from "@/lib/use-media";
import type { PublishedResult, QuestionCell, QuestionOutcome, ReviewQuestion, StudentResult } from "@/types/m2-student";
import { reviewExtras } from "@/types/m6-review";
import { ErrorCard, Skel } from "./common";
import { LockIcon } from "./icons";
import { sentence } from "./labels";
import { LangSeg, QuestionBody, Solution, type Lang } from "./question-body";
import { canExplain, ExplainButton, useWhyState, WhyView } from "./review-ai";
import { KeyCorrectedNote, PassageBlock, reviewStatus, SetKids, setCells, statusBadge, typeLabel } from "./review-parts";
import type { ReviewFixture } from "./review-fixtures";
import { InlineDoubtCard } from "./doubt-chat";

type GridFilter = "all" | QuestionOutcome;

/**
 * Student-Review (desktop): "Question review" with the filters, the question grid (left, sticky) and the selected
 * question (right). On the result page (Student-Result) and on /results/[testId]/q/[n] at desktop width.
 * The grid comes with the result; the questions with answers from GET …/questions (fetched once, desktop only) and
 * only after the test has settled (review.available), so nobody still writing can be fed answers.
 * Questions are numbered as the student saw them in the exam (shownAs), with the paper's number second.
 * M6: type label, partial marks, accepted range, the passage with its set's questions ("Q31 to Q33"), the matrix grid,
 * "Key corrected" (note, badge and the grid's dot) and the AI explanation states (review-ai.tsx). The grid marks a
 * passage's questions and the key-corrected ones from the review list (ReviewQuestionExtras, when the server sends them).
 * The selection can be driven from outside (`sel` / `onSel`: a leak's "Review Q…", the q/[n] route).
 * M4: the doubt chat about the selected question under it ("Ask a doubt about Q12" scrolls to it).
 * `fixture`: board fixtures (review-fixtures.ts), no calls.
 */
export function ReviewPane({
  data,
  r,
  now,
  sel: selProp,
  onSel,
  fixture,
}: {
  data: StudentResult;
  r: PublishedResult;
  now: number;
  sel?: number | null;
  onSel?: (n: number) => void;
  fixture?: ReviewFixture | null;
}) {
  const isDesktop = useIsDesktop();
  const testId = data.test.id;
  const available = data.review.available;
  const listQ = useQuery({
    queryKey: qk.reviewList(testId, "all"),
    queryFn: ({ signal }) => studentApi.reviewList(testId, "all", signal),
    enabled: isDesktop === true && available && !fixture,
    staleTime: 10 * 60_000, // the answer key does not change
  });
  const items: ReviewQuestion[] | undefined = fixture ? fixture.items : listQ.data?.items;
  const cells = r.questions; // in the student's order (shownAs), as the API sends them

  const [filter, setFilter] = useState<GridFilter>("all");
  const [selOwn, setSelOwn] = useState<number | null>(null);
  const sel = selProp !== undefined ? selProp : selOwn;
  const setSel = onSel ?? setSelOwn;
  const firstToReview = cells.find((c) => c.outcome !== "correct") ?? cells[0];
  const selected = cells.find((c) => c.n === sel) ?? firstToReview;
  const q = items?.find((i) => i.n === selected?.n);

  // Passage sets and key corrections, for the grid's marks (from the review list; the result's keyCorrections too).
  const marks = useMemo(() => {
    const grp = new Set<number>();
    const kc = new Set<number>();
    for (const it of items ?? []) {
      const x = reviewExtras(it);
      if (x.set) for (let m = x.set.nFrom; m <= x.set.nTo; m++) grp.add(m);
      if (x.keyCorrection) kc.add(it.n);
    }
    const fromResult = (data as StudentResult & { keyCorrections?: Array<{ n: number }> }).keyCorrections;
    if (Array.isArray(fromResult)) for (const k of fromResult) if (typeof k?.n === "number") kc.add(k.n);
    return { grp, kc };
  }, [items, data]);

  const c = r.counts;
  const filters: Array<[GridFilter, string, number]> = [
    ["all", "All", c.total],
    ["wrong", "Wrong", c.wrong],
    ...(c.partial ? ([["partial", "Partly", c.partial]] as Array<[GridFilter, string, number]>) : []),
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
  // Previous / Next question within the filter, in the student's order.
  const inList = cells.filter((x) => filter === "all" || x.outcome === filter);
  const at = selected ? inList.findIndex((x) => x.n === selected.n) : -1;
  const prevN = at > 0 ? inList[at - 1]!.n : null;
  const nextN = at >= 0 && at < inList.length - 1 ? inList[at + 1]!.n : null;

  if (!selected) return null;
  const doubtInline = available && isDesktop === true && !fixture;
  return (
    <section className="col gap-4" aria-labelledby="review-h">
      <div className="row between wrap gap-3">
        <h2 id="review-h" className="h2">
          Question review
        </h2>
        <div className="seg" role="group" aria-label="Filter questions">
          {filters.map(([k, label, n]) => (
            <button key={k} type="button" className={filter === k ? "tab on" : "tab"} aria-pressed={filter === k} onClick={() => pick(k)}>
              {label} <span className="count">{n}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-start gap-5">
        <aside className="card pad col sticky top-6 max-w-[340px] flex-[1_1_268px] gap-3.5 self-start" aria-label="Questions">
          <span className="sm muted">Tap a question</span>
          <div className="grid grid-cols-8 gap-x-[5px] gap-y-1.5">
            {cells.map((cell) => {
              const label = cell.shownAs;
              const dim = filter !== "all" && cell.outcome !== filter;
              const on = cell.n === selected.n;
              const extra = `${marks.grp.has(cell.n) ? " rv-grp" : ""}${marks.kc.has(cell.n) ? " rv-kc" : ""}`;
              return (
                <button
                  key={cell.n}
                  type="button"
                  className={`q-cell ${cell.outcome}${extra}${dim ? " dim" : ""}${on ? " sel" : ""}`}
                  aria-label={`Question ${label}, ${cell.outcome}${marks.kc.has(cell.n) ? ", answer key corrected" : ""}`}
                  aria-current={on ? "true" : undefined}
                  onClick={() => setSel(cell.n)}
                >
                  {label}
                </button>
              );
            })}
          </div>
          <div className="col xs muted gap-1.5">
            <div className="row wrap gap-2.5">
              <span className="row gap-1.5">
                <span className="swatch correct" />
                Correct
              </span>
              {c.partial > 0 && (
                <span className="row gap-1.5">
                  <span className="swatch partial" />
                  Partly
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
            {marks.grp.size > 0 && (
              <span className="row gap-1.5">
                <span className="legend-grp" aria-hidden="true" />
                One passage, several questions
              </span>
            )}
            {marks.kc.size > 0 && (
              <span className="row gap-1.5">
                <span className="legend-kc" aria-hidden="true" />
                Answer key corrected
              </span>
            )}
          </div>
        </aside>

        <div className="col min-w-0 flex-[999_1_560px] gap-5">
          <QuestionCard
            key={selected.n}
            cell={selected}
            cells={cells}
            data={data}
            now={now}
            q={q}
            loading={available && !fixture && (listQ.isPending || isDesktop === null)}
            error={fixture ? null : listQ.error}
            onRetry={() => listQ.refetch()}
            onPick={setSel}
            prevN={prevN}
            nextN={nextN}
            doubtHref={doubtInline ? `#doubt-q${selected.n}` : `/results/${encodeURIComponent(testId)}/q/${selected.n}/doubt`}
            fixture={fixture ?? null}
          />
          {/* M4: the doubt chat about the selected question, once answers are open (the AI gate is checked again on send) */}
          {doubtInline && (
            <div id={`doubt-q${selected.n}`} className="scroll-mt-6">
              <InlineDoubtCard key={`doubt-${selected.n}`} testId={testId} n={selected.n} label={selected.shownAs} />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function QuestionCard({
  cell,
  cells,
  data,
  now,
  q,
  loading,
  error,
  onRetry,
  onPick,
  prevN,
  nextN,
  doubtHref,
  fixture,
}: {
  cell: QuestionCell;
  cells: QuestionCell[];
  data: StudentResult;
  now: number;
  q: ReviewQuestion | undefined;
  loading: boolean;
  error: unknown;
  onRetry: () => void;
  onPick: (n: number) => void;
  prevN: number | null;
  nextN: number | null;
  doubtHref: string;
  fixture: ReviewFixture | null;
}) {
  const label = cell.shownAs;
  const [lang, setLang] = useState<Lang>("en");
  const [asked, setAsked] = useState(false);
  const hasSolution = !!(q && (q.solution.en || q.solution.hi));
  // Fixtures show the board's AI state on any question (the board's key-corrected Q12 is correct and explained).
  const explainable = !!q && data.review.available && (fixture ? true : canExplain(cell.outcome, q));
  const st = useWhyState(data.test.id, cell.n, explainable && asked, hasSolution, explainable && fixture ? fixture.why(cell.n) : null);
  const x = q ? reviewExtras(q) : null;
  const avg = q?.averageTimeSeconds;
  const labelOf = (m: number) => cells.find((c) => c.n === m)?.shownAs ?? m;
  // The board hides the official solution while the AI review is locked, and has none to show for no-solution.
  const showSolution = st.kind !== "locked" && !(st.kind === "ready" && st.noSolution);
  return (
    <article className="card pad-lg col fade gap-4" aria-label={`Question ${label}`}>
      <div className="row between wrap gap-2">
        <div className="row wrap gap-2">
          <span className="h3 mono">Q{label}</span>
          {label !== cell.n && <span className="xs muted">Paper Q{cell.n}</span>}
          {cell.subject && <span className="badge b-grey">{cell.subject}</span>}
          {q && <span className="badge b-grey">{typeLabel(q, !!x?.set)}</span>}
          <span className={`badge ${statusBadge(cell.outcome)}`}>{reviewStatus(cell)}</span>
          {x?.keyCorrection && <span className="badge b-navy">Key corrected</span>}
        </div>
        <div className="row gap-3">
          <span className="xs muted">
            Your time <b className="num text-ink">{mmss(cell.timeSeconds)}</b>
            {avg != null ? ` · batch ${mmss(avg)}` : ""}
          </span>
          {q && <LangSeg q={q} lang={lang} onChange={setLang} />}
        </div>
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
          {x?.keyCorrection && <KeyCorrectedNote note={x.keyCorrection} q={q} />}
          {x?.set && (
            <>
              <PassageBlock set={x.set} lang={lang} labelOf={labelOf} />
              <SetKids kids={setCells(x.set, cells)} current={cell.n} onPick={onPick} />
            </>
          )}
          <QuestionBody q={q} lang={lang} />
          <div className="row wrap gap-2.5">
            {explainable && st.kind === "not-asked" && <ExplainButton outcome={cell.outcome} onClick={() => setAsked(true)} />}
            {doubtHref.startsWith("#") ? (
              <a href={doubtHref} className="btn btn-secondary">
                Ask a doubt about Q{label}
              </a>
            ) : (
              <Link href={doubtHref} className="btn btn-secondary">
                Ask a doubt about Q{label}
              </Link>
            )}
          </div>
          {explainable && <WhyView st={st} testId={data.test.id} n={cell.n} now={now} hasSolution={hasSolution} fixture={!!fixture} />}
          {showSolution && <Solution q={q} lang={lang} flat />}
        </>
      )}
      {(prevN !== null || nextN !== null) && (
        <div className="row between mt-auto pt-2">
          {prevN !== null ? (
            <button type="button" className="btn btn-ghost" onClick={() => onPick(prevN)}>
              Previous
            </button>
          ) : (
            <span />
          )}
          {nextN !== null && (
            <button type="button" className="btn btn-secondary" onClick={() => onPick(nextN)} aria-label={`Next question, Q${labelOf(nextN)}`}>
              Next question
            </button>
          )}
        </div>
      )}
    </article>
  );
}

