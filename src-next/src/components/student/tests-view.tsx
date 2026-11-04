"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { keepPreviousData, useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Bar, Doodle, InkUnderline, LiveDot, Note, Sticker } from "@iitpulse/ui";
import { qk, studentApi } from "@/lib/student-api";
import { dayMonth, daysFrom, dowDayMonthTime, longDay, relativeDayTime, timeOf } from "@/lib/time";
import { useServerClock } from "@/lib/server-clock";
import type { TestCard, TestsTab } from "@/types/m2-student";
import { ArrowRightIcon } from "@/components/shell/icons";
import { ErrorCard, NoBatchCard, Skel, useStartTest } from "./common";
import { CalendarIcon, SearchIcon } from "./icons";
import { cardBadge, cardWhen } from "./card-labels";
import { kindLabel, num, subjectLabel, testMeta } from "./labels";

const TABS: TestsTab[] = ["live", "upcoming", "completed"];
const isTab = (v: string | null): v is TestsTab => !!v && (TABS as string[]).includes(v);

/**
 * Student-Tests and Phone-Tests, from GET /tests/student/tests. Tabs Live / Upcoming / Completed (phone: Done),
 * subject chips, a search box and "Show N older tests" (completed is paged by cursor). Filters live in the URL
 * (?tab=&subject=&q=) so Back and a shared link keep them.
 *
 * Out of M2: "Remind me" on upcoming cards, "AI review" in the result buttons.
 * Classroom budget. Desktop: 1 note (date), 2 doodles (gutters), title underline. Phone: 1 doodle (header),
 * title underline, at most 1 sticker (Personal best on the best completed result).
 */
export function TestsView() {
  const search = useSearchParams();
  const urlTab = search.get("tab");
  const [tab, setTab] = useState<TestsTab | null>(isTab(urlTab) ? urlTab : null);
  const [subject, setSubject] = useState(search.get("subject") || "");
  const [draft, setDraft] = useState(search.get("q") || "");
  const q = useDebounced(draft.trim().slice(0, 80), 300);

  // The live tab, unfiltered: the "Live now" strip above the other tabs, the counts, and the default tab.
  const liveQ = useQuery({ queryKey: qk.tests("live", "", ""), queryFn: ({ signal }) => studentApi.tests({ tab: "live" }, signal) });
  const counts = liveQ.data?.counts;
  const effectiveTab: TestsTab | null = tab ?? (counts ? (counts.live > 0 ? "live" : counts.completed > 0 ? "completed" : "upcoming") : null);

  const listQ = useInfiniteQuery({
    queryKey: qk.testsPages(effectiveTab ?? "live", subject, q),
    queryFn: ({ pageParam, signal }) => studentApi.tests({ tab: effectiveTab!, subject: subject || undefined, q: q || undefined, cursor: pageParam }, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    enabled: effectiveTab !== null,
    placeholderData: keepPreviousData,
  });

  // Keep the filters in the URL without a navigation.
  useEffect(() => {
    const p = new URLSearchParams();
    if (tab) p.set("tab", tab);
    if (subject) p.set("subject", subject);
    if (q) p.set("q", q);
    const next = `${window.location.pathname}${p.size ? `?${p}` : ""}`;
    if (next !== `${window.location.pathname}${window.location.search}`) window.history.replaceState(null, "", next);
  }, [tab, subject, q]);

  const first = listQ.data?.pages[0] ?? liveQ.data;
  const now = useServerClock(first?.now, listQ.dataUpdatedAt || liveQ.dataUpdatedAt);
  const items = useMemo(() => listQ.data?.pages.flatMap((p) => p.items) ?? [], [listQ.data]);
  const lastPage = listQ.data?.pages[listQ.data.pages.length - 1];
  const subjects = first?.subjects ?? [];
  const batch = first?.batch;
  const liveItem = liveQ.data?.items[0] ?? null;
  const showingPlaceholder = listQ.isPlaceholderData;

  const error = liveQ.error ?? listQ.error;
  const loading = !first || effectiveTab === null || (!listQ.data && listQ.isPending);

  const tabs = (
    <div className="seg max-md:grid max-md:w-full max-md:grid-cols-3" role="tablist" aria-label="Test status">
      {TABS.map((k) => (
        <button
          key={k}
          type="button"
          role="tab"
          aria-selected={effectiveTab === k}
          className={effectiveTab === k ? "tab on max-md:h-10 max-md:justify-center max-md:px-2.5" : "tab max-md:h-10 max-md:justify-center max-md:px-2.5"}
          onClick={() => setTab(k)}
        >
          {k === "live" && <LiveDot />}
          {k === "live" ? "Live" : k === "upcoming" ? "Upcoming" : <><span className="max-md:hidden">Completed</span><span className="md:hidden">Done</span></>}
          {counts && <span className="count">{counts[k]}</span>}
        </button>
      ))}
    </div>
  );

  const searchBox = (id: string) => (
    <div className="relative w-[320px] max-w-full max-md:w-full">
      <span className="pointer-events-none absolute top-3.5 left-3.5 text-muted">
        <SearchIcon />
      </span>
      <label htmlFor={id} className="sr-only">
        Search tests
      </label>
      <input
        id={id}
        type="search"
        className="input pl-10"
        placeholder="Search tests"
        value={draft}
        maxLength={80}
        onChange={(e) => setDraft(e.target.value)}
        autoComplete="off"
        enterKeyHint="search"
      />
    </div>
  );

  const chips =
    subjects.length > 1 ? (
      <div className="row wrap gap-2 max-md:flex-nowrap max-md:overflow-x-auto max-md:pb-1" role="group" aria-label="Subject">
        {["", ...subjects].map((s) => (
          <button key={s || "all"} type="button" className={subject === s ? "chip on max-md:flex-none" : "chip max-md:flex-none"} aria-pressed={subject === s} onClick={() => setSubject(s)}>
            {s ? subjectLabel(s) : "All"}
          </button>
        ))}
      </div>
    ) : null;

  return (
    <div className="col gap-6 md:pt-1 max-md:gap-0">
      <Doodle name="benzene" slot="gl" style={{ top: 380 }} />
      <Doodle name="incline" slot="gr" style={{ top: 700 }} />

      {/* Desktop header (Student-Tests) */}
      <header className="row between wrap gap-4 max-md:hidden">
        <div className="col gap-0.5">
          {first ? (
            <Note size="sm" write rotate={-1.5} delay={150} className="self-start">
              {longDay(now)}
            </Note>
          ) : (
            <span className="h-6" />
          )}
          <h1 className="h1">
            <InkUnderline delay={450}>Tests</InkUnderline>
          </h1>
          <p className="sm muted mt-2 mb-0">{batch?.name ? `Everything assigned to ${batch.name}` : " "}</p>
        </div>
        {searchBox("test-search")}
      </header>

      {/* Phone header (Phone-Tests): the title and the status tabs stay at the top while the list scrolls. */}
      <header className="sticky top-0 z-(--z-topbar) col gap-3 border-b border-line bg-white/90 px-4 pt-[calc(18px+env(safe-area-inset-top))] pb-3 backdrop-blur-md md:hidden">
        <Doodle name="integral" style={{ right: 22, top: 6 }} className="[&_svg]:h-11 [&_svg]:w-24" />
        <h1 className="h2 text-2xl">
          <InkUnderline delay={450}>Tests</InkUnderline>
        </h1>
        {tabs}
      </header>

      {liveItem && effectiveTab !== "live" && <LiveStrip t={liveItem} now={now} />}

      <div className="row between wrap gap-3 max-md:hidden">
        {tabs}
        {chips}
      </div>

      <div className="col gap-2.5 px-4 pt-3.5 md:hidden">
        {searchBox("test-search-phone")}
        {chips}
      </div>

      <section className="col gap-5 max-md:gap-2.5 max-md:px-4 max-md:pt-2.5 max-md:pb-4" aria-busy={loading || showingPlaceholder} aria-live="polite">
        {error && !first ? (
          <ErrorCard error={error} onRetry={() => (liveQ.error ? liveQ.refetch() : listQ.refetch())} />
        ) : loading ? (
          <CardsSkeleton />
        ) : batch === null ? (
          <NoBatchCard />
        ) : listQ.isError ? (
          <ErrorCard error={listQ.error} onRetry={() => listQ.refetch()} />
        ) : items.length === 0 ? (
          <EmptyTab tab={effectiveTab!} filtered={!!subject || !!q} q={q} />
        ) : (
          <>
            <div className={showingPlaceholder ? "grid grid-cols-3 gap-5 opacity-60 transition-opacity max-lg:grid-cols-2 max-md:hidden" : "grid grid-cols-3 gap-5 max-lg:grid-cols-2 max-md:hidden"}>
              {items.map((t, i) => (
                <DesktopCard key={t.id} t={t} now={now} i={i} />
              ))}
            </div>
            <div className={showingPlaceholder ? "col gap-2.5 opacity-60 md:hidden" : "col gap-2.5 md:hidden"}>
              {items.map((t, i) => (
                <PhoneCard key={t.id} t={t} now={now} i={i} best={t.id === bestId(items)} />
              ))}
            </div>
            {lastPage?.nextCursor && (
              <button type="button" className="btn btn-ghost fade self-center" onClick={() => listQ.fetchNextPage()} disabled={listQ.isFetchingNextPage}>
                {listQ.isFetchingNextPage ? "Loading…" : `Show ${lastPage.remaining > 0 ? `${lastPage.remaining} ` : ""}older ${lastPage.remaining === 1 ? "test" : "tests"}`}
              </button>
            )}
          </>
        )}
      </section>
    </div>
  );
}

/** At most one "Personal best" sticker per screen (phone budget): the first card whose result is a personal best. */
function bestId(items: TestCard[]): string | undefined {
  return items.find((t) => t.result?.headline?.isPersonalBest)?.id;
}

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return v;
}

function LiveStrip({ t, now }: { t: TestCard; now: number }) {
  const start = useStartTest();
  const resume = t.state === "in_progress";
  return (
    <div className="card row wrap rise gap-4 py-3.5 pr-4 pl-5 max-md:hidden">
      <span className="badge b-live">
        <LiveDot />
        {resume ? "In progress" : "Live now"}
      </span>
      <span className="col grow gap-0.5">
        <span className="sm font-semibold">{t.name}</span>
        <span className="xs muted">
          {cardWhen(t, now)} · {testMeta(t)}
        </span>
      </span>
      <button type="button" className="btn btn-primary" onClick={() => start(t.id)}>
        {resume ? "Resume test" : "Start test"}
        <ArrowRightIcon className="arrow" />
      </button>
    </div>
  );
}

function DesktopCard({ t, now, i }: { t: TestCard; now: number; i: number }) {
  const start = useStartTest();
  const badge = cardBadge(t, now);
  const v = t.result?.visibility;
  const h = t.result?.headline;
  const href = `/results/${encodeURIComponent(t.id)}`;
  return (
    <article className="card pad-lg cl-lift col rise gap-4" style={{ "--i": Math.min(i, 8) } as React.CSSProperties}>
      <div className="row between gap-2">
        <span className={`badge ${badge.cls}`}>
          {(t.state === "live" || t.state === "in_progress") && <LiveDot />}
          {badge.text}
        </span>
        <span className="xs muted">{kindLabel(t.kind)}</span>
      </div>
      <div className="col gap-1.5">
        <h2 className="h2">{t.name}</h2>
        <span className="sm muted">{testMeta(t)}</span>
      </div>
      <div className="row gap-2 text-muted">
        <CalendarIcon />
        <span className="sm">{cardWhen(t, now)}</span>
      </div>

      {t.state === "submitted" && v?.status === "published" && h && (
        <div className="col gap-1.5">
          <div className="row between">
            <span className="sm font-semibold">
              {num(h.score)} / {num(h.maxScore)}
            </span>
            <span className="xs muted">{h.rank ? `Rank ${h.rank.position} of ${h.rank.of}` : h.rankAvailableAt ? `Rank on ${relativeDayTime(now, h.rankAvailableAt)}` : ""}</span>
          </div>
          <Bar value={Math.max(0, h.percent)} max={100} label={`Score ${num(h.score)} of ${num(h.maxScore)}`} />
        </div>
      )}
      {t.state === "submitted" && v?.status === "pending" && (
        <div className="col gap-1.5">
          <div className="row between gap-2">
            <span className="sm font-semibold" style={{ color: "#9A5800" }}>
              {v.availableAt ? resultIn(now, v.availableAt) : "Result pending"}
            </span>
            {v.availableAt && <span className="xs muted">{dowDayMonthTime(v.availableAt)}</span>}
          </div>
          <div className="h-2 rounded-full border-[1.5px] border-dashed" style={{ borderColor: "#E8C27A" }} />
        </div>
      )}
      {t.state === "submitted" && v?.status === "hidden" && <span className="sm muted">{v.reason || "Your institute does not share results for this test."}</span>}
      {t.state === "ended" && <span className="sm muted">You didn&apos;t take this test.</span>}

      <div className="row mt-auto gap-2">
        {(t.state === "live" || t.state === "in_progress") && (
          <button type="button" className="btn btn-primary flex-1" onClick={() => start(t.id)}>
            {t.state === "in_progress" ? "Resume test" : "Start test"}
            <ArrowRightIcon className="arrow" />
          </button>
        )}
        {t.state === "submitted" && (
          <Link href={href} className={v?.status === "published" ? "btn btn-secondary flex-1" : "btn btn-ghost flex-1"}>
            {v?.status === "published" ? "View result" : "View submission"}
          </Link>
        )}
      </div>
    </article>
  );
}

/** "Result in 18 days" / "Result tomorrow" / "Result today at 5:00 PM" */
function resultIn(now: number, at: string): string {
  const d = daysFrom(now, at);
  if (d <= 0) return `Result today at ${timeOf(at)}`;
  if (d === 1) return "Result tomorrow";
  return `Result in ${d} days`;
}

function PhoneCard({ t, now, i, best }: { t: TestCard; now: number; i: number; best: boolean }) {
  const start = useStartTest();
  const badge = cardBadge(t, now, true);
  const v = t.result?.visibility;
  const h = t.result?.headline;
  const live = t.state === "live" || t.state === "in_progress";
  const when =
    t.state === "live"
      ? `Ends ${daysFrom(now, t.closesAt) === 0 ? timeOf(t.closesAt) : relativeDayTime(now, t.closesAt)}`
      : t.state === "in_progress" && t.attempt
        ? `Time up ${timeOf(t.attempt.expiresAt)}`
        : t.state === "upcoming"
          ? timeOf(t.opensAt)
          : t.state === "submitted" && t.submittedAt
            ? dayMonth(t.submittedAt)
            : dayMonth(t.closesAt);
  const meta = live
    ? `${t.totalQuestions} Qs · ${t.durationMinutes} min · best on a laptop`
    : t.state === "upcoming"
      ? `${t.totalQuestions} Qs · ${t.durationMinutes} min`
      : t.state === "ended"
        ? "Missed"
        : v?.status === "published" && h
          ? h.rank
            ? `Rank ${h.rank.position}`
            : h.rankAvailableAt
              ? `Rank on ${dayMonth(h.rankAvailableAt)}`
              : "Result out"
          : v?.status === "pending"
            ? "Submitted · answers saved"
            : v?.reason || "Submitted";

  const body = (
    <>
      {best && (
        <Sticker float rotate={4} delay={1100} style={{ top: -12, right: 64, fontSize: 13, padding: "6px 10px 7px" }}>
          Personal best
        </Sticker>
      )}
      <div className="row between">
        <span className={`badge ${badge.cls}`}>
          {live && <LiveDot />}
          {badge.text}
        </span>
        <span className="xs muted">{when}</span>
      </div>
      <span className="h3">{t.name}</span>
      <span className="xs muted">{meta}</span>
      {v?.status === "published" && h && <Bar value={Math.max(0, h.percent)} max={100} style={{ height: 6 }} />}
    </>
  );
  const cls = "card pad col cl-lift rise relative gap-2 text-ink";
  const style = { "--i": Math.min(i, 8) } as React.CSSProperties;
  if (t.state === "submitted")
    return (
      <Link href={`/results/${encodeURIComponent(t.id)}`} className={cls} style={style}>
        {body}
      </Link>
    );
  return (
    <article className={cls} style={style}>
      {body}
      {live && (
        <button type="button" className="btn btn-primary mt-1 w-full" onClick={() => start(t.id)}>
          {t.state === "in_progress" ? "Resume test" : "Start test"}
        </button>
      )}
    </article>
  );
}

function EmptyTab({ tab, filtered, q }: { tab: TestsTab; filtered: boolean; q: string }) {
  const [title, body] = filtered
    ? [q ? `No tests match “${q}”` : "No tests here for this subject", "Try another filter, or check Upcoming."]
    : tab === "live"
      ? ["No test is live right now", "A test opens here at its start time."]
      : tab === "upcoming"
        ? ["Nothing scheduled yet", "New tests from your institute show up here."]
        : ["No completed tests yet", "Tests you take, and the ones you miss, are listed here."];
  return (
    <div className="card col fade items-center gap-2 p-12 text-center max-md:p-8">
      <span className="h3">{title}</span>
      <span className="sm muted">{body}</span>
    </div>
  );
}

function CardsSkeleton() {
  return (
    <>
      <div className="grid grid-cols-3 gap-5 max-lg:grid-cols-2 max-md:hidden" aria-label="Loading tests">
        {[0, 1, 2].map((k) => (
          <Skel key={k} className="h-[286px] rounded-card" />
        ))}
      </div>
      <div className="col gap-2.5 md:hidden" aria-label="Loading tests">
        {[0, 1, 2, 3].map((k) => (
          <Skel key={k} className="h-[120px] rounded-card" />
        ))}
      </div>
    </>
  );
}
