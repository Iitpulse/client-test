"use client";

import Link from "next/link";
import { useState } from "react";
import type { DoubtFx } from "@/lib/doubt-fixtures";
import { useOnline } from "@/lib/use-online";
import { useInfiniteQuery } from "@tanstack/react-query";
import { AiMark, Doodle, InkUnderline, MathText, Note, Tape } from "@iitpulse/ui";
import { aiRetry, isAiDown } from "@/lib/ai-api";
import { m4Api, m4Keys } from "@/lib/m4-api";
import { StudentApiError } from "@/lib/student-api";
import { useServerClock } from "@/lib/server-clock";
import { useIsDesktop } from "@/lib/use-media";
import { longDay, relativeDayTime } from "@/lib/time";
import type { DoubtQuota, DoubtThreadSummary } from "@/types/m4";
import { PhoneTitleBar } from "@/components/shell/phone-title-bar";
import { Skel } from "./common";
import { ChevronRightIcon, LockIcon } from "./icons";
import { sentence } from "./labels";
import { ThreadPane, useDoubtFixture } from "./doubt-chat";
import { istTime, OfflineBanner, StateIco, supportCode } from "./states";

/**
 * /doubts: Student-Doubts (desktop: the threads on the left, the selected chat on the right) and Phone-Doubts (the
 * threads as cards; one opens Phone-Doubt). GET /ai/student/doubts, paged by cursor. New doubts start from a
 * question in a test's review ("Ask a doubt").
 */
export function DoubtsView({ initialThread }: { initialThread: string | null }) {
  const fx = useDoubtFixture();
  return <DoubtsInner key={fx?.state ?? (fx === undefined ? "wait" : "live")} initialThread={initialThread} fx={fx} />;
}

function DoubtsInner({ initialThread, fx }: { initialThread: string | null; fx: DoubtFx | null | undefined }) {
  const live = fx === null;
  const q = useInfiniteQuery({
    queryKey: m4Keys.doubtsPages,
    queryFn: ({ pageParam, signal }) => m4Api.doubts(pageParam, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    retry: aiRetry,
    enabled: live,
  });
  const isDesktop = useIsDesktop();
  const online = useOnline() && !fx?.offline;
  const [fxAt] = useState(() => Date.now()); // a fixture's "loaded at" (DoubtsInner mounts per fixture)
  // Fixtures: "loading" and "error" are the list's states on the phone (Phone-Doubts) and the chat's on the desktop
  // (Student-Doubts draws them in the right pane, under a loaded list).
  const fxListState = fx && isDesktop === false && (fx.state === "loading" || fx.state === "error") ? fx.state : null;
  const data = fx ? (fxListState ? undefined : { pages: [fx.page] }) : q.data;
  const listError = fx ? (fxListState === "error" ? new StudentApiError(503, "Couldn't load your doubts") : null) : q.error;
  const first = data?.pages[0];
  const now = useServerClock(first?.now, fx ? 0 : q.dataUpdatedAt, false);
  const items = data?.pages.flatMap((p) => p.items) ?? [];
  const quota = first?.quota;
  const e = listError instanceof StudentApiError ? listError : null;
  const [sel, setSel] = useState<string | null>(initialThread);
  const current = items.find((t) => t.id === sel) ?? items[0];
  const when = (t: DoubtThreadSummary) => (Number.isNaN(now) ? "" : sentenceCase(relativeDayTime(now, t.updatedAt)));

  return (
    <>
      <PhoneTitleBar title="Doubts" doodle="flask">
        {quota && <QuotaPhone quota={quota} />}
      </PhoneTitleBar>
      <div className="col gap-6 md:pt-1 max-md:gap-2.5 max-md:px-4 max-md:pt-3.5">
        <Doodle name="flask" slot="gl" style={{ top: 384 }} />
        <Doodle name="integral" slot="gr" style={{ top: 820 }} />
        <header className="row between wrap items-end gap-3 max-md:hidden">
          <div className="col gap-0.5">
            {first && !Number.isNaN(now) ? (
              <Note size="sm" write rotate={-1.5} delay={150} className="self-start">
                {longDay(now)}
              </Note>
            ) : (
              <span className="h-6" />
            )}
            <h1 className="h1">
              <InkUnderline delay={450}>Doubts</InkUnderline>
            </h1>
            <span className="sm muted mt-2">Your questions to the AI tutor, newest first</span>
          </div>
          {quota && (
            <div className="col min-w-[220px] gap-1.5">
              <div className="row between sm gap-3">
                <span className="font-semibold">
                  {quota.leftToday} of {quota.perDay} questions left today
                </span>
                <AiMark iconSize={13}>AI tutor</AiMark>
              </div>
              <div className="bar" style={{ height: 6 }}>
                <i style={{ width: `${(100 * quota.leftToday) / Math.max(1, quota.perDay)}%` }} />
              </div>
              <span className="xs muted">Resets at midnight · answers it couldn&apos;t give don&apos;t count</span>
            </div>
          )}
        </header>

        {!online && data && isDesktop === false && (
          <OfflineBanner className="bnr-flush md:hidden -mx-4 -mt-3.5 mb-1">
            Showing your chats from {istTime(fx ? fxAt : q.dataUpdatedAt)}.
          </OfflineBanner>
        )}
        {!data ? (
          listError ? (
            e?.code === "AI_NOT_AVAILABLE_YET" ? (
              <Notice locked title="Answers aren't open yet" body={sentence(e.message || "The tutor can help once your test has closed for everyone")} />
            ) : e && isAiDown(e) ? (
              <Notice title="The AI tutor is paused" body={sentence(e.message || "Your results and solutions are all still under Tests")} />
            ) : (
              <ListError error={listError} onRetry={() => void q.refetch()} />
            )
          ) : (
            <div className="row items-start gap-5 max-md:col max-md:gap-2.5" aria-busy="true">
              <div className="col w-full max-w-[400px] gap-2.5 max-md:max-w-none">
                {[0, 1, 2, 3].map((k) => (
                  <Skel key={k} className="h-[128px] rounded-[14px]" />
                ))}
              </div>
              <Skel className="h-[560px] grow rounded-card max-md:hidden" />
              <span className="sr-only" role="status">
                Loading your doubts
              </span>
            </div>
          )
        ) : items.length === 0 ? (
          <section className="card pad-lg col rise relative items-center gap-3 px-7 py-14 text-center max-md:mt-6 max-md:gap-2.5 max-md:px-5 max-md:py-9">
            <Tape rotate={-2} delay={600} />
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#5A5FD0" strokeWidth="1.6" strokeLinejoin="round" aria-hidden="true" focusable="false">
              <path d="M4 5h16v11H9l-5 4z" />
              <path d="M9.5 9.2a2.5 2.5 0 1 1 3.4 2.3c-.6.3-.9.8-.9 1.4" />
              <path d="M12 15h.01" />
            </svg>
            <h2 className="h2 max-md:text-[18px]">No doubts yet</h2>
            <p className="sm muted m-0 max-w-[420px]" style={{ textWrap: "pretty" }}>
              Open a question in any test&apos;s review and tap “Ask a doubt”. Your chats with the tutor are kept here.
            </p>
            <Link href="/tests?tab=completed" className="btn btn-secondary max-md:h-11">
              Go to your tests
            </Link>
          </section>
        ) : (
          <>
            {/* Student-Doubts */}
            <div className="flex flex-wrap items-start gap-5 max-md:hidden">
              <nav className="col max-w-[400px] flex-[1_1_340px] gap-2.5" aria-label="Doubt threads">
                {items.map((t, i) => (
                  <button
                    key={t.id}
                    type="button"
                    className={t.id === current?.id ? "card th rise on" : "card th rise"}
                    aria-current={t.id === current?.id ? "true" : undefined}
                    style={{ "--i": Math.min(i, 8) } as React.CSSProperties}
                    onClick={() => setSel(t.id)}
                  >
                    <ThreadText t={t} when={when(t)} />
                  </button>
                ))}
                {!fx && q.hasNextPage && (
                  <button type="button" className="btn btn-secondary self-center" disabled={q.isFetchingNextPage} onClick={() => q.fetchNextPage()}>
                    {q.isFetchingNextPage ? "Loading…" : "Show older doubts"}
                  </button>
                )}
              </nav>
              {isDesktop === true && current && <ThreadPane key={current.id} t={current} fx={fx} />}
            </div>

            {/* Phone-Doubts */}
            <div className="col gap-2.5 md:hidden">
              {items.map((t, i) => (
                <Link
                  key={t.id}
                  href={`/results/${encodeURIComponent(t.testId)}/q/${t.n}/doubt?thread=${encodeURIComponent(t.id)}`}
                  className="card pad col cl-lift rise gap-[7px] px-4 py-3.5 text-ink"
                  style={{ "--i": Math.min(i, 8) } as React.CSSProperties}
                >
                  <ThreadText t={t} when={when(t)} phone />
                </Link>
              ))}
              {!fx && q.hasNextPage && (
                <button type="button" className="btn btn-secondary h-11 self-center" disabled={q.isFetchingNextPage} onClick={() => q.fetchNextPage()}>
                  {q.isFetchingNextPage ? "Loading…" : "Show older doubts"}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}

/** Phone-Doubts "Couldn't load your doubts" (Student-Doubts draws no list error: same card, with "Code"). */
function ListError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const code = supportCode(error);
  return (
    <div className="d-ctr d-ctr-page" role="alert">
      <StateIco tone="red" icon="warn" className="st-ico-sm" />
      <span className="h3">Couldn&apos;t load your doubts</span>
      <span className="sm muted">Your chats are safe. Try again in a moment.</span>
      <button type="button" className="btn btn-primary min-h-11 px-6" onClick={onRetry}>
        Try again
      </button>
      <span className="xs muted mono">
        <span className="max-md:hidden">Code </span>
        {code}
      </span>
    </div>
  );
}

/** "today, 3:59 PM" -> "Today, 3:59 PM" */
function sentenceCase(s: string): string {
  return s ? s[0]!.toUpperCase() + s.slice(1) : s;
}

function ThreadText({ t, when, phone }: { t: DoubtThreadSummary; when: string; phone?: boolean }) {
  const turns = `${t.turns} ${t.turns === 1 ? "question" : "questions"} asked`;
  return (
    <>
      <span className="row between w-full gap-2">
        <span className="badge b-navy">
          {t.testShortName} · Q{t.shownAs}
        </span>
        <span className="xs muted">{when}</span>
      </span>
      <MathText className="clamp font-serif text-[15px] leading-[1.45]" text={t.questionPreview} />
      {t.lastMessagePreview && <MathText className="xs muted clamp" text={t.lastMessagePreview} />}
      {phone ? (
        <span className="row between xs muted">
          <span>
            {t.testName} · {turns}
          </span>
          <ChevronRightIcon size={16} />
        </span>
      ) : (
        <span className="xs muted">
          {t.testName} · {turns}
        </span>
      )}
    </>
  );
}

function QuotaPhone({ quota }: { quota: DoubtQuota }) {
  return (
    <div className="col gap-1.5">
      <div className="row between">
        <AiMark iconSize={13}>AI tutor</AiMark>
        <span className="xs muted">
          {quota.leftToday} of {quota.perDay} questions left today
        </span>
      </div>
      <div className="bar" style={{ height: 4 }}>
        <i style={{ width: `${(100 * quota.leftToday) / Math.max(1, quota.perDay)}%` }} />
      </div>
    </div>
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
