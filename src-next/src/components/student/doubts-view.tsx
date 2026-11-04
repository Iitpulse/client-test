"use client";

import Link from "next/link";
import { useInfiniteQuery } from "@tanstack/react-query";
import { AiMark, Doodle, InkUnderline, MathText } from "@iitpulse/ui";
import { aiRetry, isAiDown } from "@/lib/ai-api";
import { m4Api, m4Keys } from "@/lib/m4-api";
import { StudentApiError } from "@/lib/student-api";
import { useServerClock } from "@/lib/server-clock";
import { relativeDayTime } from "@/lib/time";
import type { DoubtThreadSummary } from "@/types/m4";
import { PhoneTitleBar } from "@/components/shell/phone-title-bar";
import { ErrorCard, Skel } from "./common";
import { LockIcon } from "./icons";
import { sentence } from "./labels";

/**
 * /doubts: the student's doubt threads, newest first, as cards in the Student-Tests / Phone-Tests list style
 * (GET /ai/student/doubts, paged by cursor). A card opens the thread (Phone-Doubt). New doubts start from a
 * question in a test's review ("Ask a doubt").
 */
export function DoubtsView() {
  const q = useInfiniteQuery({
    queryKey: m4Keys.doubtsPages,
    queryFn: ({ pageParam, signal }) => m4Api.doubts(pageParam, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    retry: aiRetry,
  });
  const first = q.data?.pages[0];
  const now = useServerClock(first?.now, q.dataUpdatedAt, false);
  const items = q.data?.pages.flatMap((p) => p.items) ?? [];
  const quota = first?.quota;
  const e = q.error instanceof StudentApiError ? q.error : null;

  return (
    <>
      <PhoneTitleBar title="Doubts" />
      <div className="col gap-6 md:pt-1 max-md:gap-2.5 max-md:px-4 max-md:pt-3.5">
        <Doodle name="flask" slot="gl" style={{ top: 380 }} />
        <header className="row between wrap gap-4 max-md:hidden">
          <div className="col gap-1">
            <h1 className="h1">
              <InkUnderline delay={450}>Doubts</InkUnderline>
            </h1>
            <span className="sm muted mt-1">Your questions to the AI tutor, newest first</span>
          </div>
          {quota && <span className="sm muted">{quota.leftToday} of {quota.perDay} questions left today</span>}
        </header>
        {quota && (
          <div className="row between gap-2 md:hidden">
            <AiMark iconSize={13}>AI tutor</AiMark>
            <span className="xs muted">
              {quota.leftToday} of {quota.perDay} questions left today
            </span>
          </div>
        )}

        {!q.data ? (
          q.isError ? (
            e?.code === "AI_NOT_AVAILABLE_YET" ? (
              <Notice locked title="Answers aren't open yet" body={sentence(e.message || "The tutor can help once your test has closed for everyone")} />
            ) : e && isAiDown(e) ? (
              <Notice title="The AI tutor is paused" body={sentence(e.message || "Your results and solutions are all still under Tests")} />
            ) : (
              <ErrorCard error={q.error} onRetry={() => q.refetch()} />
            )
          ) : (
            <div className="grid grid-cols-3 gap-5 max-lg:grid-cols-2 max-md:grid-cols-1 max-md:gap-2.5" aria-busy="true" aria-label="Loading your doubts">
              {[0, 1, 2].map((k) => (
                <Skel key={k} className="h-[150px] rounded-card max-md:h-[120px]" />
              ))}
            </div>
          )
        ) : items.length === 0 ? (
          <div className="card col fade items-center gap-2 p-12 text-center max-md:p-8">
            <span className="h3">No doubts yet</span>
            <span className="sm muted max-w-[420px]">Open a question in any test&apos;s review and tap &ldquo;Ask a doubt&rdquo;. Your chats with the tutor are kept here.</span>
            <Link href="/tests?tab=completed" className="btn btn-secondary mt-2">
              Go to your tests
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-5 max-lg:grid-cols-2 max-md:grid-cols-1 max-md:gap-2.5">
              {items.map((t, i) => (
                <ThreadCard key={t.id} t={t} now={now} i={i} />
              ))}
            </div>
            {q.hasNextPage && (
              <button type="button" className="btn btn-secondary self-center" disabled={q.isFetchingNextPage} onClick={() => q.fetchNextPage()}>
                {q.isFetchingNextPage ? "Loading…" : "Show older doubts"}
              </button>
            )}
          </>
        )}
      </div>
    </>
  );
}

function ThreadCard({ t, now, i }: { t: DoubtThreadSummary; now: number; i: number }) {
  return (
    <Link
      href={`/results/${encodeURIComponent(t.testId)}/q/${t.n}/doubt?thread=${encodeURIComponent(t.id)}`}
      className="card pad col cl-lift rise gap-2 text-ink md:p-6"
      style={{ "--i": Math.min(i, 8) } as React.CSSProperties}
      aria-label={`${t.testName}, question ${t.shownAs}: ${t.turns} ${t.turns === 1 ? "question" : "questions"} asked`}
    >
      <div className="row between gap-2">
        <span className="badge b-navy">
          {t.testShortName} · Q{t.shownAs}
        </span>
        <span className="xs muted">{Number.isNaN(now) ? "" : relativeDayTime(now, t.updatedAt)}</span>
      </div>
      <MathText className="sm line-clamp-2 font-serif text-[15px]" text={t.questionPreview} />
      {t.lastMessagePreview && <MathText className="xs muted line-clamp-2" text={t.lastMessagePreview} />}
      <span className="xs muted mt-auto">
        {t.testName} · {t.turns} {t.turns === 1 ? "question" : "questions"} asked
      </span>
    </Link>
  );
}

function Notice({ title, body, locked }: { title: string; body: string; locked?: boolean }) {
  return (
    <div className="card col items-start gap-2 p-6">
      <span className="row gap-2">
        {locked && (
          <span className="text-muted">
            <LockIcon size={18} />
          </span>
        )}
        <span className="h3">{title}</span>
      </span>
      <span className="sm muted">{body}</span>
    </div>
  );
}
