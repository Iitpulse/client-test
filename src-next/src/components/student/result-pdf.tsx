"use client";

// Student-ResultPDF: the result as an A4 report, printed by the browser ("Save as PDF"; no server PDF). Same data as
// the result and review screens: GET /tests/student/results/:id (+ M6 extras), the review list (filter all) and the
// AI summary when it is ready. Page 1: header, stats, by subject, summary, the questions that lost marks; then every
// question. Page numbers come from the print engine (@page margin boxes).

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { aiApi, aiKeys } from "@/lib/ai-api";
import { m4Api, m4Keys } from "@/lib/m4-api";
import { qk, studentApi } from "@/lib/student-api";
import { fixtureParam } from "@/lib/fixtures";
import { ist } from "@/lib/time";
import { useAuthHydrated, useAuthStore } from "@/stores/auth.store";
import type { ReviewList, ReviewQuestion, StudentResult } from "@/types/m2-student";
import type { SummaryResponse } from "@/types/m3-ai";
import type { StudentResultExtras } from "@/types/m6-student";
import type { ReviewQuestionM6 } from "@/types/m6-review";
import { reviewExtras } from "@/types/m6-review";
import { resultFixture, summaryFixture } from "./result-fixtures";
import { correctionSummary } from "./result-states";
import { PageError } from "./states";
import { Skel } from "./common";

type ResultM6 = StudentResult & Partial<StudentResultExtras>;

const day = (at: string, year = false) => {
  const p = ist(at);
  return `${p.dow} ${p.day} ${p.mon}${year ? ` ${p.year}` : ""}`;
};
const hmm = (seconds: number) => {
  const m = Math.round(seconds / 60);
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`;
};
const mins = (seconds: number) => {
  const m = Math.round(seconds / 60);
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`;
};
const mss = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.round(seconds % 60)).padStart(2, "0")}`;
const hoursLabel = (minutes: number) => (minutes % 60 === 0 ? `${minutes / 60} ${minutes === 60 ? "hour" : "hours"}` : `${minutes} minutes`);
const signedMarks = (m: number) => (m > 0 ? `+${m}` : m < 0 ? `−${Math.abs(m)}` : "0");

const TYPE_LABEL: Record<string, string> = { single: "single", multiple: "one or more", integer: "numerical", matrix: "match the lists", paragraph: "passage" };

/** "C", "A, C", "4", "A-P, B-Q, C-S, D —", "—" */
function yoursText(q: ReviewQuestionM6): string {
  const x = reviewExtras(q);
  if (x.matrix) {
    const rows = x.matrix.rows.map((r) => {
      const ticked = x.matrix!.yours[r.id] ?? [];
      return ticked.length ? `${r.id}-${ticked.join("")}` : `${r.id} —`;
    });
    return Object.values(x.matrix.yours).some((v) => v.length) ? rows.join(", ") : "—";
  }
  if (q.type === "integer") return q.yourAnswer.value === null ? "—" : String(q.yourAnswer.value);
  const keys = q.options.filter((o) => q.yourAnswer.optionIds.includes(o.id)).map((o) => o.key);
  return keys.length ? keys.join(", ") : "—";
}

/** "A", "A, C, D", "4.5 (4.4 to 4.6)", "A-P, B-Q, C-R, D-S", "A (corrected from C)" */
function keyText(q: ReviewQuestionM6): string {
  const x = reviewExtras(q);
  let text: string;
  if (x.matrix) text = x.matrix.rows.map((r) => `${r.id}-${(x.matrix!.key[r.id] ?? []).join("")}`).join(", ");
  else if (q.type === "integer" && q.correctAnswer.range) {
    const { from, to } = q.correctAnswer.range;
    text = from === to ? String(from) : `${Math.round(((from + to) / 2) * 100) / 100} (${from} to ${to})`;
  } else text = q.options.filter((o) => q.correctAnswer.optionIds.includes(o.id)).map((o) => o.key).join(", ") || "—";
  const kc = x.keyCorrection;
  const old = kc?.oldKey && Array.isArray((kc.oldKey as { optionIds?: string[] }).optionIds) ? ((kc.oldKey as { optionIds?: string[] }).optionIds ?? []) : null;
  if (kc && old) {
    const oldLetters = q.options.filter((o) => old.includes(o.id) || old.includes(o.key)).map((o) => o.key);
    if (oldLetters.length) return `${text} (corrected from ${oldLetters.join(", ")})`;
  }
  return text;
}

function typeLabel(q: ReviewQuestionM6): string {
  const x = reviewExtras(q);
  if (x.set) return `passage (Q${x.set.nFrom}–${x.set.nTo})`;
  return TYPE_LABEL[q.type] ?? q.type;
}

function Pill({ q }: { q: ReviewQuestion }) {
  const cls = q.outcome === "correct" ? "ok" : q.outcome === "wrong" ? "bad" : q.outcome === "partial" ? "part" : "skip";
  return <span className={`pill ${cls}`}>{signedMarks(q.marks)}</span>;
}

function QuestionTable({ items }: { items: ReviewQuestion[] }) {
  return (
    <table className="t">
      <thead>
        <tr>
          <th scope="col">Q</th>
          <th scope="col">Subject · type</th>
          <th scope="col">Your answer</th>
          <th scope="col">Key</th>
          <th scope="col" className="r">Marks</th>
          <th scope="col" className="r">Time</th>
        </tr>
      </thead>
      <tbody>
        {items.map((q) => (
          <tr key={q.n}>
            <td className="m">{q.shownAs}</td>
            <td>
              {q.subject ?? "—"} · {typeLabel(q)}
            </td>
            <td className="m">{yoursText(q)}</td>
            <td className="m">{keyText(q)}</td>
            <td className="r">
              <Pill q={q} />
            </td>
            <td className="r">{mss(q.timeSeconds)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** The summary in one paragraph: "Your 3 biggest leaks cost 33 of the 52 marks you lost: rotational motion (−10, …), …" */
function summaryText(s: SummaryResponse): string | null {
  if (s.status !== "ready" || !s.leaks.length) return null;
  const n = s.leaks.length;
  const lead = n === 1 ? "Your biggest leak cost" : `Your ${n} biggest leaks cost`;
  const part = s.marksExplained >= s.marksLost ? `all ${s.marksLost} marks you lost` : `${s.marksExplained} of the ${s.marksLost} marks you lost`;
  const leaks = s.leaks.map((l) => `${l.title.charAt(0).toLowerCase()}${l.title.slice(1)} (−${l.marksLost}, ${l.note.charAt(0).toLowerCase()}${l.note.slice(1).replace(/\.$/, "")})`);
  const list = leaks.length > 1 ? `${leaks.slice(0, -1).join(", ")}, and ${leaks[leaks.length - 1]}` : leaks[0];
  return `${lead} ${part}: ${list}.`;
}

export function ResultPdf({ testId }: { testId: string }) {
  const hydrated = useAuthHydrated();
  const user = useAuthStore((s) => s.currentUser);
  const [fixture, setFixture] = useState<string | null>(null);
  const [made] = useState(() => new Date().toISOString());
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads the URL once after mount
    setFixture(fixtureParam());
  }, []);

  const fx = fixture !== null;
  const result = useQuery({
    queryKey: fx ? ["fixture", "result", fixture] : qk.result(testId),
    queryFn: ({ signal }) => (fx ? resultFixture(fixture === "pdf" ? "key-corrected" : fixture!) : studentApi.result(testId, signal)),
    enabled: hydrated,
    retry: fx ? false : undefined,
  });
  const data = result.data as ResultM6 | undefined;
  const reviewOk = !!data?.review.available;
  const review = useQuery({
    queryKey: qk.reviewList(testId, "all"),
    queryFn: ({ signal }) => studentApi.reviewList(testId, "all", signal),
    enabled: hydrated && !fx && reviewOk,
  });
  const summary = useQuery({
    queryKey: aiKeys.summary(testId),
    queryFn: ({ signal }) => aiApi.summary(testId, signal),
    enabled: hydrated && !fx && reviewOk,
    retry: false,
    staleTime: 10 * 60_000,
  });
  const profile = useQuery({ queryKey: m4Keys.me, queryFn: ({ signal }) => m4Api.me(signal), enabled: hydrated && !fx, retry: false, staleTime: 5 * 60_000 });

  // Fixture review rows: the board's question table (dev and staging only)
  const fxItems = useMemo(() => (fx ? pdfFixtureItems() : null), [fx]);
  const items: ReviewQuestion[] | null = fxItems ?? (review.data as ReviewList | undefined)?.items ?? null;
  const fxSummary = fx ? summaryFixture("pdf", () => {}) : null;
  const sumText = fxSummary && fxSummary.kind === "ready" ? summaryText(fxSummary.s) : summary.data ? summaryText(summary.data) : null;

  if (!data) {
    return (
      <div className="pdf-screen">
        {result.isError ? (
          <div className="mx-auto max-w-[560px] p-4">
            <PageError what="your result" error={result.error} onRetry={() => result.refetch()} />
          </div>
        ) : (
          <div className="pdf-page" aria-busy="true" aria-label="Loading your report">
            <Skel style={{ height: 40, width: 200 }} />
            <Skel style={{ height: 28, width: 320 }} />
            <Skel style={{ height: 70 }} />
            <Skel style={{ height: 160 }} />
          </div>
        )}
      </div>
    );
  }

  const r = data.result;
  const kc = correctionSummary(data.keyCorrections ?? []);
  const p = profile.data?.profile;
  const studentName = p ? `${p.firstName} ${p.lastName}`.trim() : fx ? "Aarav Jain" : user?.name ?? "";
  const email = p?.email ?? (fx ? "aarav.jain@example.com" : user?.email ?? "");
  const batch = p?.batch?.name ?? (fx ? "JEE 2027 · Indore A" : null);
  const institute = p?.institute?.name ?? "IIT-PULSE";
  const rank = data.rank ? { rank: data.rank.rank, of: data.rank.of, percentile: data.rank.percentile } : r?.rank ? { rank: r.rank.position, of: r.rank.of, percentile: r.rank.percentile } : null;
  const used = data.timeUsedSeconds ?? data.submission.timeUsedSeconds;
  const dur = data.durationSeconds ?? data.submission.durationMinutes * 60;
  const sections = data.sections?.length ? data.sections : (r?.sections ?? []).map((s) => ({ name: s.subject ?? s.name, score: s.score, maxScore: s.maxScore, correct: s.correct, partial: s.partial, wrong: s.wrong, skipped: s.skipped, timeSeconds: s.timeSeconds }));
  const lost = items?.filter((q) => q.outcome !== "correct" || reviewExtras(q).keyCorrection) ?? [];
  const sub = [
    `Taken ${day(data.submission.submittedAt, true)}`,
    `${data.test.totalQuestions} questions`,
    hoursLabel(data.test.durationMinutes),
    data.visibility.publishedAt ? `result published ${day(data.visibility.publishedAt)}` : null,
    kc ? `key corrected and re-scored ${day(kc.at)}` : null,
  ].filter(Boolean);
  const madeP = ist(made);

  return (
    <div className="pdf-screen">
      <div className="pdf-tools" role="toolbar" aria-label="Report">
        <Link prefetch={false} href={`/results/${encodeURIComponent(testId)}`} className="btn btn-ghost">
          Back to result
        </Link>
        <button type="button" className="btn btn-primary" onClick={() => window.print()}>
          Save as PDF
        </button>
      </div>
      <article className="pdf-page" aria-label={`Result report, ${data.test.name}`}>
        <header className="pdf-head">
          <div className="col" style={{ gap: 6 }}>
            <span role="img" aria-label="IIT-PULSE" className="relative block h-[27px] w-[139px] overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element -- the logo is a fixed, unchanged PNG cropped by CSS */}
              <img src="/iitpulse-logo.png" alt="" className="absolute top-[-7px] left-0 h-[44px] w-auto max-w-none" />
            </span>
            <span className="pdf-k">{institute} · Result report</span>
          </div>
          <div className="col" style={{ gap: 2, alignItems: "flex-end", textAlign: "right" }}>
            <span style={{ fontSize: 16, fontWeight: 650 }}>{studentName}</span>
            <span className="pdf-k">{[email, batch].filter(Boolean).join(" · ")}</span>
          </div>
        </header>

        <section className="col" style={{ gap: 4 }}>
          <h1 className="pdf-h1">{data.test.name}</h1>
          <span className="pdf-k">{sub.join(" · ")}</span>
        </section>

        {r && (
          <section className="pdf-stats">
            <div className="stat">
              <span className="k">Score</span>
              <span className="v">
                {r.score} <small>/ {r.maxScore}</small>
              </span>
            </div>
            <div className="stat">
              <span className="k">Rank in batch</span>
              <span className="v">{rank ? <>{rank.rank} <small>of {rank.of}</small></> : <small>After the test closes</small>}</span>
            </div>
            <div className="stat">
              <span className="k">Percentile</span>
              <span className="v">{rank ? rank.percentile : "—"}</span>
            </div>
            <div className="stat">
              <span className="k">Time used</span>
              <span className="v">
                {hmm(used)} <small>of {hmm(dur)}</small>
              </span>
            </div>
          </section>
        )}

        {sections.length > 0 && r && (
          <section className="col" style={{ gap: 8 }}>
            <h2 className="pdf-h2">By subject</h2>
            <table className="t">
              <thead>
                <tr>
                  <th scope="col">Subject</th>
                  <th scope="col" className="r">Score</th>
                  <th scope="col" className="r">Correct</th>
                  <th scope="col" className="r">Partly</th>
                  <th scope="col" className="r">Wrong</th>
                  <th scope="col" className="r">Skipped</th>
                  <th scope="col" className="r">Time</th>
                </tr>
              </thead>
              <tbody>
                {sections.map((s) => (
                  <tr key={s.name}>
                    <td>{s.name}</td>
                    <td className="r">
                      {s.score} / {s.maxScore}
                    </td>
                    <td className="r">{s.correct}</td>
                    <td className="r">{s.partial}</td>
                    <td className="r">{s.wrong}</td>
                    <td className="r">{s.skipped}</td>
                    <td className="r">{mins(s.timeSeconds)}</td>
                  </tr>
                ))}
                <tr>
                  <td style={{ fontWeight: 650 }}>Total</td>
                  <td className="r" style={{ fontWeight: 650 }}>
                    {r.score} / {r.maxScore}
                  </td>
                  <td className="r">{r.counts.correct}</td>
                  <td className="r">{r.counts.partial}</td>
                  <td className="r">{r.counts.wrong}</td>
                  <td className="r">{r.counts.skipped}</td>
                  <td className="r">{mins(used)}</td>
                </tr>
              </tbody>
            </table>
          </section>
        )}

        {sumText && (
          <section className="pdf-sum">
            <h2 className="pdf-h2">
              Summary <span className="pdf-k" style={{ fontWeight: 500 }}>· written by AI, checked against the answer key</span>
            </h2>
            <p>{sumText}</p>
          </section>
        )}

        {items && lost.length > 0 && (
          <section className="col" style={{ gap: 8 }}>
            <h2 className="pdf-h2">
              Question by question{" "}
              <span className="pdf-k" style={{ fontWeight: 500 }}>
                · questions you lost marks on; the full list of {items.length} follows
              </span>
            </h2>
            <QuestionTable items={lost} />
          </section>
        )}
        {!reviewOk && !fx && (
          <p className="pdf-k">Answers and the question list open when the test has closed for everyone{data.review.availableAt ? ` (${day(data.review.availableAt)}, ${ist(data.review.availableAt).time})` : ""}.</p>
        )}

        {items && items.length > 0 && (
          <section className="col pdf-break" style={{ gap: 8 }}>
            <h2 className="pdf-h2">All {items.length} questions</h2>
            <QuestionTable items={items} />
          </section>
        )}

        <footer className="pdf-foot">
          <span>
            Made {madeP.dow} {madeP.day} {madeP.mon} {madeP.year}, {madeP.time} IST · from your IIT-PULSE account
          </span>
        </footer>
      </article>
    </div>
  );
}

/** The board's question rows (fixture). */
function pdfFixtureItems(): ReviewQuestionM6[] {
  const opts = (keys: string[], yours: string[], correct: string[]) =>
    keys.map((k) => ({ id: k, key: k, text: { en: k, hi: null }, isCorrect: correct.includes(k), isYours: yours.includes(k) }));
  const row = (n: number, subject: string, type: ReviewQuestion["type"], outcome: ReviewQuestion["outcome"], marks: number, t: number, yours: string[], key: string[], extra: Partial<ReviewQuestionM6> = {}): ReviewQuestionM6 => ({
    n,
    shownAs: n,
    questionId: `fx-q${n}`,
    sectionId: subject,
    subject,
    type,
    outcome,
    marks,
    maxMarks: 4,
    timeSeconds: t,
    stem: { en: "", hi: null },
    options: type === "integer" ? [] : opts(["A", "B", "C", "D"], yours, key),
    yourAnswer: { optionIds: yours, value: null },
    correctAnswer: { optionIds: key, range: null },
    solution: { en: null, hi: null },
    averageTimeSeconds: null,
    correctPercent: null,
    ...extra,
  });
  const rows: ReviewQuestionM6[] = [
    row(3, "Physics", "single", "wrong", -1, 125, ["C"], ["A"]),
    row(12, "Physics", "single", "correct", 4, 192, ["A"], ["A"], { keyCorrection: { n: 12, questionId: "fx-q12", correctedAt: new Date().toISOString(), oldKey: { optionIds: ["C"] }, newKey: { optionIds: ["A"] }, yourMarks: { before: -1, after: 4 }, mode: "changeKey", yourScore: { before: 243, after: 248 }, yourRank: { before: 17, after: 14 } } } as Partial<ReviewQuestionM6>),
    row(19, "Physics", "single", "wrong", -1, 100, ["D"], ["B"]),
    row(22, "Physics", "single", "skipped", 0, 250, [], ["C"]),
    row(24, "Physics", "matrix", "partial", 2, 140, [], [], {
      matrix: {
        rows: ["A", "B", "C", "D"].map((id) => ({ id, en: "", hi: null })),
        columns: ["P", "Q", "R", "S"].map((id) => ({ id, en: "", hi: null })),
        yours: { A: ["P"], B: ["Q"], C: ["S"], D: [] },
        key: { A: ["P"], B: ["Q"], C: ["R"], D: ["S"] },
        rowOutcomes: { A: "right", B: "right", C: "wrong", D: "blank" },
      },
    } as Partial<ReviewQuestionM6>),
    row(32, "Physics", "single", "wrong", -1, 70, ["B"], ["A"], { set: { setId: "s1", index: 2, count: 3, nFrom: 31, nTo: 33, passage: { en: "", hi: null } } } as Partial<ReviewQuestionM6>),
    row(33, "Physics", "single", "skipped", 0, 40, [], ["D"], { set: { setId: "s1", index: 3, count: 3, nFrom: 31, nTo: 33, passage: { en: "", hi: null } } } as Partial<ReviewQuestionM6>),
    row(38, "Chemistry", "multiple", "partial", 2, 108, ["A", "C"], ["A", "C", "D"]),
    row(41, "Chemistry", "single", "wrong", -1, 22, ["B"], ["A"]),
    row(55, "Maths", "single", "wrong", -1, 170, ["D"], ["C"]),
    { ...row(63, "Maths", "integer", "wrong", -1, 160, [], []), yourAnswer: { optionIds: [], value: 4 }, correctAnswer: { optionIds: [], range: { from: 4.4, to: 4.6 } } },
    row(66, "Maths", "single", "skipped", 0, 185, [], ["B"]),
  ];
  return rows;
}
