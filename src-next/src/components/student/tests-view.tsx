"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { keepPreviousData, useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Bar, Doodle, InkUnderline, LiveDot, Note, Sticker } from "@iitpulse/ui";
import { qk, studentApi } from "@/lib/student-api";
import { dayMonth, daysFrom, dowDayMonthTime, longDay, minutes, relativeDayTime, timeOf } from "@/lib/time";
import { useServerClock } from "@/lib/server-clock";
import { useOnline } from "@/lib/use-online";
import type { StudentTestsPage, TestCard, TestsTab } from "@/types/m2-student";
import type { StudentGateResponse } from "@/types/m6";
import { ArrowRightIcon } from "@/components/shell/icons";
import { fxKey, gateHref, loadFixture, NoBatchCard, OfflineStrip, Skel, useFixture, useReminderPref } from "./common";
import { CalendarIcon, SearchIcon } from "./icons";
import { cardBadge, cardWhen } from "./card-labels";
import { kindLabel, num, reminderAt, testMeta } from "./labels";
import { istTime, PageError } from "./states";

const TABS: TestsTab[] = ["live", "upcoming", "completed"];
const isTab = (v: string | null): v is TestsTab => !!v && (TABS as string[]).includes(v);

type Attempt = StudentGateResponse["attempt"];

/**
 * Student-Tests and Phone-Tests, from GET /tests/student/tests, with the batch 5 states: full, resume, nothing-live,
 * no-batch, loading, error, offline. Tabs Live / Upcoming / Completed (phone: Done), subject chips, a search box and
 * "Show N older tests" (completed is paged by cursor). Filters live in the URL (?tab=&subject=&q=) so Back and a
 * shared link keep them. Start / Resume / Test details open the test gate (/tests/:id/start); a resumed test shows
 * answered so far from the gate route; upcoming cards say when the 1-hour email reminder goes (profile
 * testReminders). `?fixture=<state>` (dev / staging) shows a board state with fixture data (b5-fixtures.ts).
 *
 * Classroom budget. Desktop: 1 note (date), 2 doodles (gutters), title underline. Phone: 1 doodle (header),
 * title underline, at most 1 sticker (Personal best on the best completed result).
 */
export function TestsView() {
  const fx = useFixture();
  const search = useSearchParams();
  const urlTab = search.get("tab");
  const [tab, setTab] = useState<TestsTab | null>(isTab(urlTab) ? urlTab : null);
  const [subject, setSubject] = useState(search.get("subject") || "");
  const [draft, setDraft] = useState(search.get("q") || "");
  const q = useDebounced(draft.trim().slice(0, 80), 300);
  const online = useOnline();
  const offline = !online || fx === "offline";
  const reminders = useReminderPref();

  const page = (args: { tab: TestsTab; subject?: string; q?: string; cursor?: string | null }, signal?: AbortSignal) =>
    fx ? loadFixture<StudentTestsPage>(fx, args.cursor ? "tests-older" : "tests", args) : studentApi.tests(args, signal);

  // The live tab, unfiltered: the strip above the other tabs, the counts, and the default tab.
  const liveQ = useQuery({ queryKey: fxKey(fx, qk.tests("live", "", "")), queryFn: ({ signal }) => page({ tab: "live" }, signal), retry: fx ? false : undefined });
  const counts = liveQ.data?.counts;
  const effectiveTab: TestsTab | null = tab ?? (counts ? (counts.live > 0 || counts.completed === 0 ? "live" : "completed") : null);

  const listQ = useInfiniteQuery({
    queryKey: fxKey(fx, qk.testsPages(effectiveTab ?? "live", subject, q)),
    queryFn: ({ pageParam, signal }) => page({ tab: effectiveTab!, subject: subject || undefined, q: q || undefined, cursor: pageParam }, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    enabled: effectiveTab !== null,
    placeholderData: keepPreviousData,
    retry: fx ? false : undefined,
  });

  // Keep the filters in the URL without a navigation (a fixture stays in it).
  useEffect(() => {
    const p = new URLSearchParams();
    const keep = new URLSearchParams(window.location.search).get("fixture"); // read from the URL: fx is null on the first pass
    if (keep) p.set("fixture", keep);
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

  // Resume: answered so far, from the test gate.
  const resumeId = liveQ.data?.items.find((t) => t.state === "in_progress")?.id ?? null;
  const gateQ = useQuery({
    queryKey: fxKey(fx, qk.gate(resumeId ?? "")),
    queryFn: ({ signal }) => (fx ? loadFixture<StudentGateResponse>(fx, "gate", resumeId) : studentApi.gate(resumeId!, signal)),
    enabled: !!resumeId,
    retry: false,
  });
  const attempt = gateQ.data?.attempt ?? null;

  // Nothing live: name the next test (the first of Upcoming).
  const nothingLive = effectiveTab === "live" && counts?.live === 0 && !subject && !q;
  const nextQ = useQuery({
    queryKey: fxKey(fx, qk.tests("upcoming", "", "")),
    queryFn: ({ signal }) => page({ tab: "upcoming" }, signal),
    enabled: nothingLive && (counts?.upcoming ?? 0) > 0,
    retry: false,
  });
  const nextTest = nextQ.data?.items[0] ?? null;

  const error = liveQ.error ?? listQ.error;
  const loading = !first || effectiveTab === null || (!listQ.data && listQ.isPending);
  const asOf = listQ.dataUpdatedAt || liveQ.dataUpdatedAt;

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
            {s || "All"}
          </button>
        ))}
      </div>
    ) : null;

  const failed = !!error && !first;
  const noBatch = !loading && batch === null;
  const ready = !failed && !loading && !noBatch;

  return (
    <div className="col gap-6 md:pt-1 max-md:gap-0">
      <Doodle name="benzene" slot="gl" style={{ top: 380 }} />
      <Doodle name="incline" slot="gr" style={{ top: 700 }} />

      {offline && (
        <OfflineStrip
          className="max-md:hidden"
          desktop={`${asOf ? `Showing your tests as of ${istTime(asOf)}. ` : ""}Results and new tests load when you're back.`}
          phone=""
        />
      )}

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
          <p className="sm muted mt-2 mb-0">{batch?.name ? `Everything assigned to ${batch.name}` : " "}</p>
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
      {offline && <OfflineStrip className="md:hidden" desktop="" phone={asOf ? `Showing your tests as of ${istTime(asOf)}.` : "Showing what loaded before."} />}

      {failed ? (
        <div className="max-md:px-4 max-md:pt-3.5">
          <PageError what="your tests" error={error} onRetry={() => (liveQ.error ? liveQ.refetch() : listQ.refetch())} className="max-md:hidden" />
          <PageError what="your tests" error={error} onRetry={() => (liveQ.error ? liveQ.refetch() : listQ.refetch())} safe="Your answers are safe." className="md:hidden" />
        </div>
      ) : loading ? (
        <TestsSkeleton />
      ) : noBatch ? (
        <div className="max-md:px-4 max-md:pt-3.5">
          <NoBatchCard where="tests" />
        </div>
      ) : null}

      {ready && liveItem && effectiveTab !== "live" && <LiveStrip t={liveItem} now={now} attempt={liveItem.state === "in_progress" ? attempt : null} />}

      {ready && (
        <div className="row between wrap gap-3 max-md:hidden">
          {tabs}
          {chips}
        </div>
      )}

      {ready && (
        <div className="col gap-2.5 px-4 pt-3.5 md:hidden">
          {searchBox("test-search-phone")}
          {chips}
        </div>
      )}

      {ready && (
        <section className="col gap-5 max-md:gap-2.5 max-md:px-4 max-md:pt-2.5 max-md:pb-4" aria-busy={showingPlaceholder} aria-live="polite">
          {listQ.isError && !listQ.data ? (
            <PageError what="your tests" error={listQ.error} onRetry={() => listQ.refetch()} />
          ) : items.length === 0 ? (
            nothingLive ? (
              <NothingLive next={nextTest} reminders={reminders} />
            ) : (
              <EmptyTab tab={effectiveTab!} filtered={!!subject || !!q} q={q} />
            )
          ) : (
            <>
              <div className={showingPlaceholder ? "grid grid-cols-3 gap-5 opacity-60 transition-opacity max-lg:grid-cols-2 max-md:hidden" : "grid grid-cols-3 gap-5 max-lg:grid-cols-2 max-md:hidden"}>
                {items.map((t, i) => (
                  <DesktopCard key={t.id} t={t} now={now} i={i} attempt={t.state === "in_progress" ? attempt : null} reminders={reminders} />
                ))}
              </div>
              <div className={showingPlaceholder ? "col gap-2.5 opacity-60 md:hidden" : "col gap-2.5 md:hidden"}>
                {items.map((t, i) => (
                  <PhoneCard key={t.id} t={t} now={now} i={i} best={t.id === bestId(items)} attempt={t.state === "in_progress" ? attempt : null} reminders={reminders} />
                ))}
              </div>
              {lastPage?.nextCursor && (
                <button type="button" className="btn btn-ghost fade self-center max-md:min-h-11" onClick={() => listQ.fetchNextPage()} disabled={listQ.isFetchingNextPage}>
                  {listQ.isFetchingNextPage ? "Loading…" : `Show ${lastPage.remaining > 0 ? `${lastPage.remaining} ` : ""}older ${lastPage.remaining === 1 ? "test" : "tests"}`}
                </button>
              )}
            </>
          )}
        </section>
      )}
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

/** "41 of 75 answered · 1 h 47 min left" (answered from the gate; without it, the time left alone) */
function resumeMeta(t: TestCard, now: number, attempt: Attempt): string {
  const left = t.attempt ? `${minutes((Date.parse(t.attempt.expiresAt) - now) / 1000)} left` : null;
  return [attempt ? `${attempt.answered} of ${attempt.total} answered` : null, left].filter(Boolean).join(" · ");
}

function LiveStrip({ t, now, attempt }: { t: TestCard; now: number; attempt: Attempt }) {
  const resume = t.state === "in_progress";
  return (
    <div className="card row wrap rise gap-4 py-3.5 pr-4 pl-5 max-md:hidden">
      {resume ? (
        <span className="badge b-navy">In progress</span>
      ) : (
        <span className="badge b-live">
          <LiveDot />
          Live now
        </span>
      )}
      <span className="col grow gap-0.5">
        <span className="sm font-semibold">{t.name}</span>
        <span className="xs muted">{resume ? `${resumeMeta(t, now, attempt)} · the timer keeps running` : `${cardWhen(t, now)} · ${testMeta(t)}`}</span>
      </span>
      <Link prefetch={false} href={gateHref(t.id)} className="btn btn-primary">
        {resume ? "Resume test" : "Start test"}
        <ArrowRightIcon className="arrow" />
      </Link>
    </div>
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

function DesktopCard({ t, now, i, attempt, reminders }: { t: TestCard; now: number; i: number; attempt: Attempt; reminders: boolean | null }) {
  const badge = cardBadge(t, now);
  const v = t.result?.visibility;
  const h = t.result?.headline;
  const href = `/results/${encodeURIComponent(t.id)}`;
  const live = t.state === "live" || t.state === "in_progress";
  return (
    <article className="card pad-lg cl-lift col rise gap-4" style={{ "--i": Math.min(i, 8) } as React.CSSProperties}>
      <div className="row between gap-2">
        <span className={`badge ${badge.cls}`}>
          {t.state === "live" && <LiveDot />}
          {badge.text}
        </span>
        <span className="xs muted">{kindLabel(t.kind)}</span>
      </div>
      <div className="col gap-1.5">
        <h2 className="h2">{t.name}</h2>
        <span className="sm muted">{t.state === "in_progress" ? resumeMeta(t, now, attempt) : testMeta(t)}</span>
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
            <span className="xs muted">{h.rank ? `Rank ${h.rank.position} of ${h.rank.of}` : h.rankAvailableAt ? `Rank ${/^(today|tomorrow)/.test(relativeDayTime(now, h.rankAvailableAt)) ? "" : "on "}${relativeDayTime(now, h.rankAvailableAt)}` : ""}</span>
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
      {t.state === "submitted" && v?.status === "hidden" && (
        <div className="col gap-1 rounded-[10px] px-3 py-2.5" style={{ background: "#F5F6FA" }}>
          <span className="sm font-semibold">Score not shared</span>
          <span className="xs muted">Your institute goes through this test in class.</span>
        </div>
      )}
      {t.state === "ended" && (
        <div className="col gap-1.5">
          <div className="row between">
            <span className="sm font-semibold text-muted">Not attempted</span>
            <span className="xs muted">No score</span>
          </div>
          <div className="h-2 rounded-full" style={{ background: "#EEF0F5" }} />
        </div>
      )}

      <div className="row mt-auto gap-2">
        {live && (
          <Link prefetch={false} href={gateHref(t.id)} className="btn btn-primary flex-1">
            {t.state === "in_progress" ? "Resume test" : "Start test"}
            <ArrowRightIcon className="arrow" />
          </Link>
        )}
        {t.state === "upcoming" && (
          <div className="col flex-1 gap-2.5">
            {reminders && (
              <span className="xs muted row gap-1.5">
                <BellIcon />
                <span>
                  Email reminder at {timeOf(reminderAt(t.opensAt))} ·{" "}
                  <Link prefetch={false} href="/profile#prefs" className="font-semibold">
                    change
                  </Link>
                </span>
              </span>
            )}
            <Link prefetch={false} href={gateHref(t.id)} className="btn btn-secondary">
              Test details
            </Link>
          </div>
        )}
        {t.state === "submitted" && (
          <Link prefetch={false} href={href} className={v?.status === "published" ? "btn btn-secondary flex-1" : "btn btn-ghost flex-1"}>
            {v?.status === "published" ? "Result & AI review" : "View submission"}
          </Link>
        )}
        {t.state === "ended" && (
          <Link prefetch={false} href="/progress" className="btn btn-secondary flex-1">
            Practise these chapters
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

function PhoneCard({ t, now, i, best, attempt, reminders }: { t: TestCard; now: number; i: number; best: boolean; attempt: Attempt; reminders: boolean | null }) {
  const badge = cardBadge(t, now, true);
  const v = t.result?.visibility;
  const h = t.result?.headline;
  const live = t.state === "live" || t.state === "in_progress";
  const when =
    t.state === "live"
      ? `Ends ${daysFrom(now, t.closesAt) === 0 ? timeOf(t.closesAt) : relativeDayTime(now, t.closesAt)}`
      : t.state === "in_progress" && t.attempt
        ? `Ends ${timeOf(t.attempt.expiresAt)}`
        : t.state === "upcoming"
          ? timeOf(t.opensAt)
          : t.state === "submitted" && t.submittedAt
            ? dayMonth(t.submittedAt)
            : dayMonth(t.closesAt);
  const meta =
    t.state === "in_progress"
      ? resumeMeta(t, now, attempt)
      : t.state === "live"
        ? `${t.totalQuestions} Qs · ${t.durationMinutes} min · best on a laptop`
        : t.state === "upcoming"
          ? `${t.totalQuestions} Qs · ${t.durationMinutes} min${reminders ? ` · email reminder ${timeOf(reminderAt(t.opensAt))}` : ""}`
          : t.state === "ended"
            ? `Not attempted · closed ${timeOf(t.closesAt)} · practise these chapters`
            : v?.status === "published" && h
              ? h.rank
                ? `Rank ${h.rank.position}`
                : h.rankAvailableAt
                  ? `Rank on ${dayMonth(h.rankAvailableAt)}`
                  : "Result out"
              : v?.status === "pending"
                ? "Submitted · answers saved"
                : "Score not shared: your institute goes through it in class";

  const href = live || t.state === "upcoming" ? gateHref(t.id) : t.state === "ended" ? "/progress" : `/results/${encodeURIComponent(t.id)}`;
  return (
    <Link prefetch={false} href={href} className="card pad col cl-lift rise relative gap-2 text-ink" style={{ "--i": Math.min(i, 8) } as React.CSSProperties}>
      {best && (
        <Sticker float rotate={4} delay={1100} style={{ top: -12, right: 64, fontSize: 13, padding: "6px 10px 7px" }}>
          Personal best
        </Sticker>
      )}
      <div className="row between">
        <span className={`badge ${badge.cls}`}>
          {t.state === "live" && <LiveDot />}
          {badge.text}
        </span>
        <span className="xs muted">{when}</span>
      </div>
      <span className="h3">{t.name}</span>
      <span className="xs muted">{meta}</span>
      {v?.status === "published" && h && <Bar value={Math.max(0, h.percent)} max={100} style={{ height: 6 }} />}
      {live && <span className="btn btn-primary mt-1">{t.state === "in_progress" ? "Resume test" : "Start test"}</span>}
    </Link>
  );
}

/** Student-Tests / Phone-Tests "nothing-live": the next test and a practice set. */
function NothingLive({ next, reminders }: { next: TestCard | null; reminders: boolean | null }) {
  const remind = reminders ? " We email you 1 hour before." : "";
  return (
    <div className="card col fade items-center gap-2 p-12 text-center max-md:px-[18px] max-md:py-7">
      <span className="h3">Nothing live right now</span>
      {next ? (
        <>
          <span className="sm muted max-md:hidden">
            Next: {next.name} opens {dowDayMonthTime(next.opensAt)}.{remind}
          </span>
          <span className="sm muted md:hidden">
            Next: {next.name}, {dowDayMonthTime(next.opensAt)}.{remind}
          </span>
        </>
      ) : (
        <span className="sm muted">A test opens here at its start time.</span>
      )}
      <Link prefetch={false} href="/progress" className="btn btn-secondary mt-2 max-md:mt-0 max-md:w-full">
        Start a practice set
      </Link>
    </div>
  );
}

function EmptyTab({ tab, filtered, q }: { tab: TestsTab; filtered: boolean; q: string }) {
  const [title, body] = filtered
    ? [q ? `No tests match “${q}”` : "No tests here for this subject", "Try another filter, or check Upcoming."]
    : tab === "live"
      ? ["Nothing live right now", "A test opens here at its start time."]
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

/** Student-Tests / Phone-Tests "loading". */
function TestsSkeleton() {
  return (
    <>
      <div className="col gap-5 max-md:hidden" aria-busy="true" aria-label="Loading your tests">
        <Skel className="h-[72px] rounded-card" />
        <div className="row gap-2">
          <Skel className="h-11 w-[320px] rounded-xl" />
          <Skel className="h-9 w-[72px] rounded-full" />
          <Skel className="h-9 w-[72px] rounded-full" />
        </div>
        <div className="grid grid-cols-3 gap-5 max-lg:grid-cols-2">
          {[0, 1, 2].map((k) => (
            <Skel key={k} className="h-[260px] rounded-card" />
          ))}
        </div>
      </div>
      <div className="col gap-2.5 px-4 pt-3.5 md:hidden" aria-busy="true" aria-label="Loading your tests">
        {[0, 1, 2, 3].map((k) => (
          <Skel key={k} className="h-[104px] rounded-[14px]" />
        ))}
      </div>
    </>
  );
}
