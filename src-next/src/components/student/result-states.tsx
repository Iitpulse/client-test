"use client";

// Student-ResultStates: the states at the top of /results/[id] (key corrected and re-scored, rank after the close,
// the summary notes are in ai-review.tsx) and the blank states that replace the result (score not shared, not
// submitted: in progress / upcoming / missed, not found). From GET /tests/student/results/:id (M6
// StudentResultExtras; 403 RESULT_HIDDEN, 404 NO_SUBMISSION details, 404 TEST_NOT_FOUND).

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { qk, studentApi, StudentApiError } from "@/lib/student-api";
import { ist } from "@/lib/time";
import type { NoSubmissionDetails, ResultHiddenDetails, StudentKeyCorrectionNote } from "@/types/m6-student";
import { ChevronLeftIcon } from "./icons";
import { Facts, PageError, StateCard } from "./states";
import { useStartTestGate } from "./start-link";

const dayOnly = (at: string) => {
  const p = ist(at);
  return `${p.dow} ${p.day} ${p.mon}`;
};
const dayTime = (at: string) => {
  const p = ist(at);
  return `${p.dow} ${p.day} ${p.mon}, ${p.time}`;
};
function hm(seconds: number): string {
  const m = Math.max(0, Math.round(seconds / 60));
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`;
}
/** "Q12 and Q38", "Q4, Q9 and Q12" */
function qList(ns: number[]): string {
  const q = [...new Set(ns)].sort((a, b) => a - b).map((n) => `Q${n}`);
  return q.length <= 1 ? q.join("") : `${q.slice(0, -1).join(", ")} and ${q[q.length - 1]}`;
}

/* ───────────── key corrected ───────────── */

/** The score before the first correction and after the last, the rank likewise (null while not final). */
export function correctionSummary(notes: StudentKeyCorrectionNote[]) {
  if (!notes.length) return null;
  const byTime = [...notes].sort((a, b) => Date.parse(a.correctedAt) - Date.parse(b.correctedAt));
  const first = byTime[0];
  const last = byTime[byTime.length - 1];
  return {
    at: last.correctedAt,
    ns: notes.map((n) => n.n),
    firstN: Math.min(...notes.map((n) => n.n)),
    score: { before: first.yourScore.before, after: last.yourScore.after },
    rank: { before: first.yourRank.before, after: last.yourRank.after },
  };
}

function PencilIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="var(--navy)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
    </svg>
  );
}

/** "Answer key corrected on Wed 4 Nov." with what changed for this student and "See what changed". */
export function KeyCorrectedNote({ notes, testId, compact }: { notes: StudentKeyCorrectionNote[]; testId: string; compact?: boolean }) {
  const c = correctionSummary(notes);
  if (!c) return null;
  const href = `/results/${encodeURIComponent(testId)}/q/${c.firstN}?filter=all`;
  const rankMoved = c.rank.before !== null && c.rank.after !== null && c.rank.before !== c.rank.after;
  if (compact) {
    const p = ist(c.at);
    return (
      <div className="kc" role="note" style={{ fontSize: 13 }}>
        <span className="col" style={{ gap: 4 }}>
          <b>Answer key corrected on {p.day} {p.mon}.</b>
          <span>
            {qList(c.ns)} re-marked: score {c.score.before} → {c.score.after}
            {rankMoved ? `, rank ${c.rank.before} → ${c.rank.after}` : ""}.
          </span>
          <Link prefetch={false} href={href} style={{ fontWeight: 600 }}>
            See what changed
          </Link>
        </span>
      </div>
    );
  }
  return (
    <div className="kc" role="note">
      <PencilIcon />
      <span className="col grow" style={{ gap: 2 }}>
        <b>Answer key corrected on {dayOnly(c.at)}.</b>
        <span>
          Your teacher fixed the key for {qList(c.ns)} and every result was re-marked. Your score went from {c.score.before} to {c.score.after}
          {rankMoved ? ` and your rank from ${c.rank.before} to ${c.rank.after}` : ""}.
        </span>
      </span>
      <Link prefetch={false} href={href} className="btn btn-secondary btn-sm" style={{ flex: "none" }}>
        See what changed
      </Link>
    </div>
  );
}

/* ───────────── Download PDF ───────────── */

function DownloadIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />
    </svg>
  );
}

/** Student-ResultStates "Download PDF": opens the print view (Student-ResultPDF), the browser saves it as PDF. */
export function DownloadPdf({ testId, icon }: { testId: string; icon?: boolean }) {
  const href = `/results/${encodeURIComponent(testId)}/print`;
  if (icon)
    return (
      <Link prefetch={false} href={href} className="btn btn-ghost btn-icon" aria-label="Download PDF" style={{ width: 44, height: 44 }}>
        <DownloadIcon size={18} />
      </Link>
    );
  return (
    <Link prefetch={false} href={href} className="btn btn-secondary" style={{ flex: "none" }}>
      <DownloadIcon />
      Download PDF
    </Link>
  );
}

/* ───────────── blank states ───────────── */

function PhoneBack() {
  return (
    <header className="sticky top-0 z-(--z-topbar) row between h-[60px] border-b border-line bg-white/90 pr-3 pl-1 pt-[env(safe-area-inset-top)] backdrop-blur-md box-content md:hidden">
      <Link prefetch={false} href="/tests?tab=completed" className="btn btn-ghost btn-icon size-11" aria-label="Back to tests">
        <ChevronLeftIcon />
      </Link>
      <span className="sm font-semibold">Result</span>
      <span style={{ width: 44 }} />
    </header>
  );
}

/**
 * The result can't be shown: says why and what to do. Each blank names its test (read from the gate, which every
 * student who can see the test may call).
 */
export function ResultBlank({ error, testId, onRetry }: { error: unknown; testId: string; onRetry: () => void }) {
  const e = error instanceof StudentApiError ? error : null;
  const known = e?.code === "RESULT_HIDDEN" || e?.code === "NO_SUBMISSION";
  const gate = useQuery({ queryKey: qk.gate(testId), queryFn: ({ signal }) => studentApi.gate(testId, signal), enabled: known, staleTime: 60_000, retry: false });
  const startGate = useStartTestGate();
  const [shownAt] = useState(() => Date.now());
  const name = gate.data?.test?.name ?? "";
  const back = { label: "Back to tests", href: "/tests?tab=completed" };

  let card: React.ReactNode;
  if (e?.code === "RESULT_HIDDEN") {
    const d = (e.details ?? {}) as Partial<ResultHiddenDetails>;
    card = (
      <StateCard tone="grey" icon="clipboard" eyebrow={name} title="Your institute isn't sharing scores for this test" body="Your answers were submitted and saved. Your teacher will go through this test in class." primary={back} headingLevel={1}>
        <Facts items={[...(d.submittedAt ? [{ k: "Submitted", v: dayTime(d.submittedAt) }] : []), ...(d.receiptId ? [{ k: "Receipt", v: <span className="mono">{d.receiptId}</span> }] : [])]} className="mt-1 max-md:hidden" />
      </StateCard>
    );
  } else if (e?.code === "NO_SUBMISSION") {
    const d = (e.details ?? {}) as Omit<Partial<NoSubmissionDetails>, "state"> & { state?: string };
    // pre-M6 servers said in_progress / live
    const state = d.state === "in_progress" ? "inProgress" : d.state === "live" ? "upcoming" : d.state;
    if (state === "inProgress") {
      const a = d.attempt;
      card = (
        <StateCard tone="navy" icon="clipboard" eyebrow={name} title="You haven't submitted this test yet" body={a ? `${a.answered} of ${a.total} answered, ${hm(a.secondsLeft)} left. The timer keeps running, so go back now.` : "The timer keeps running, so go back now."} primary={{ label: "Resume test", onClick: () => startGate(testId) }} headingLevel={1} />
      );
    } else if (state === "upcoming") {
      const opensAt = d.opensAt ?? gate.data?.test?.opensAt ?? null;
      const open = opensAt ? Date.parse(opensAt) <= shownAt : false;
      card = open ? (
        // open now and not started (not on the board: the same card with "Start test")
        <StateCard tone="navy" icon="clipboard" eyebrow={name} title="You haven't taken this test yet" body={`It's open${d.closesAt ? ` until ${dayTime(d.closesAt)}` : ""}. Your result shows here after you take it.`} primary={{ label: "Start test", onClick: () => startGate(testId) }} secondary={back} headingLevel={1} />
      ) : (
        <StateCard tone="navy" icon="clipboard" eyebrow={name} title="This test hasn't opened yet" body={opensAt ? `It opens ${dayOnly(opensAt)} at ${ist(opensAt).time}. Your result shows here after you take it.` : "Your result shows here after you take it."} primary={back} headingLevel={1} />
      );
    } else {
      const closedAt = d.closesAt ?? gate.data?.test?.closesAt ?? null;
      card = (
        <StateCard tone="grey" icon="clipboard" eyebrow={name} title="You didn't take this test" body={`${closedAt ? `It closed on ${dayOnly(closedAt)} at ${ist(closedAt).time}, so there's no result.` : "It closed before you took it, so there's no result."} You can still practise its chapters.`} primary={{ label: "Practise these chapters", href: "/progress" }} secondary={back} headingLevel={1} />
      );
    }
  } else if (e?.code === "TEST_NOT_FOUND" || e?.status === 404) {
    card = <StateCard tone="amber" icon="clipboard" eyebrow="404" title="We couldn't find this result" body="The link may be old, or your institute removed the test. Your other results are safe." primary={back} headingLevel={1} />;
  } else {
    card = <PageError what="your result" error={error} onRetry={onRetry} />;
  }
  return (
    <div className="col">
      <PhoneBack />
      <div className="col gap-5 max-md:p-4">
        <Link prefetch={false} href="/tests?tab=completed" className="sm row gap-1.5 self-start font-semibold text-muted max-md:hidden">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M19 12H5M11 6l-6 6 6 6" />
          </svg>
          Tests
        </Link>
        <div className="md:mt-6">{card}</div>
      </div>
    </div>
  );
}
