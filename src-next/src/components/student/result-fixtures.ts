// Typed fixtures for Student-ResultStates and Student-ResultPDF (?fixture=…, dev and staging only, lib/fixtures.ts):
// the M6 result extras (key corrected, rank pending) and the summary and blank states, from the board's own data.
import { StudentApiError } from "@/lib/student-api";
import type { PublishedResult, QuestionCell, StudentResult } from "@/types/m2-student";
import type { SummaryResponse } from "@/types/m3-ai";
import type { StudentResultExtras } from "@/types/m6-student";
import type { SummaryState } from "./ai-review";

const iso = (ms: number) => new Date(ms).toISOString();

function cells(): QuestionCell[] {
  const subjects = ["Physics", "Chemistry", "Maths"];
  const wrong = new Set([3, 19, 32, 41, 55, 63, 70]);
  const skipped = new Set([22, 33, 66]);
  const partial = new Set([24]);
  return Array.from({ length: 75 }, (_, i) => {
    const n = i + 1;
    const outcome = wrong.has(n) ? "wrong" : skipped.has(n) ? "skipped" : partial.has(n) ? "partial" : "correct";
    return {
      n,
      shownAs: n,
      questionId: `fx-q${n}`,
      sectionId: `s${Math.floor(i / 25)}`,
      subject: subjects[Math.floor(i / 25)],
      type: n === 24 ? "matrix" : n >= 31 && n <= 33 ? "single" : n === 38 ? "multiple" : n === 63 ? "integer" : "single",
      outcome,
      marks: outcome === "correct" ? 4 : outcome === "wrong" ? -1 : outcome === "partial" ? 2 : 0,
      maxMarks: 4,
      timeSeconds: 100 + ((n * 37) % 140),
    } as QuestionCell;
  });
}

type ResultM6 = StudentResult & Partial<StudentResultExtras>;

function published(state: string): ResultM6 {
  const now = Date.now();
  const closes = new Date(now);
  closes.setUTCHours(15, 30, 0, 0); // 9:00 PM IST
  if (closes.getTime() < now) closes.setUTCDate(closes.getUTCDate() + 1);
  const rankPending = state === "rank-pending" || state === "summary-locked";
  const kc = state === "key-corrected";
  const sections = [
    { id: "s0", name: "Physics", subject: "Physics", score: 81, maxScore: 100, correct: 20, partial: 1, wrong: 3, skipped: 1, questionCount: 25, timeSeconds: 58 * 60 },
    { id: "s1", name: "Chemistry", subject: "Chemistry", score: 85, maxScore: 100, correct: 22, partial: 0, wrong: 2, skipped: 1, questionCount: 25, timeSeconds: 44 * 60 },
    { id: "s2", name: "Maths", subject: "Maths", score: 82, maxScore: 100, correct: 22, partial: 0, wrong: 2, skipped: 1, questionCount: 25, timeSeconds: 62 * 60 },
  ];
  const result: PublishedResult = {
    score: 248,
    maxScore: 300,
    percent: 83,
    rank: rankPending ? null : { position: 14, of: 212, percentile: 93, topPercent: 7 },
    rankAvailableAt: rankPending ? iso(closes.getTime()) : null,
    delta: { marks: 24, vsTestId: "fx-mock-10", vsTestName: "JEE Main Mock 10" },
    isPersonalBest: false,
    counts: { correct: 64, partial: 1, wrong: 7, skipped: 3, total: 75 },
    sections,
    questions: cells(),
  };
  return {
    now: iso(now),
    test: { id: "fx-mock-11", name: "JEE Main Mock 11", shortName: "M11", kind: "full", exam: null, subjects: ["Physics", "Chemistry", "Maths"], totalQuestions: 75, durationMinutes: 180, maxScore: 300, opensAt: iso(now - 5 * 86400e3), closesAt: rankPending ? iso(closes.getTime()) : iso(now - 4 * 86400e3) },
    submission: { receiptId: "TR-7F3A-21C9", submittedAt: iso(now - 5 * 86400e3 + 3 * 3600e3), autoSubmitted: false, attemptedCount: 72, totalQuestions: 75, timeUsedSeconds: 161 * 60, durationMinutes: 180 },
    visibility: { status: "published", mode: "immediately", availableAt: null, publishedAt: iso(now - 4 * 86400e3), reason: null },
    review: rankPending && state === "summary-locked" ? { available: false, availableAt: iso(closes.getTime()), reason: "Answers and solutions open when the test has closed for everyone" } : { available: true, availableAt: null, reason: null },
    result,
    publishedAt: iso(now - 4 * 86400e3),
    updatedAt: kc ? iso(now - 2 * 86400e3) : null,
    keyCorrections: kc
      ? [
          { n: 12, questionId: "fx-q12", correctedAt: iso(now - 2 * 86400e3), oldKey: { optionIds: ["C"] }, newKey: { optionIds: ["A"] }, yourMarks: { before: -1, after: 4 }, mode: "changeKey", yourScore: { before: 243, after: 248 }, yourRank: { before: 17, after: 14 } },
          { n: 38, questionId: "fx-q38", correctedAt: iso(now - 2 * 86400e3), oldKey: { optionIds: ["A", "C"] }, newKey: { optionIds: ["A", "C", "D"] }, yourMarks: { before: 2, after: 2 }, mode: "acceptAlso", yourScore: { before: 243, after: 248 }, yourRank: { before: 17, after: 14 } },
        ]
      : [],
    rank: rankPending ? null : { rank: 14, of: 212, percentile: 93 },
    rankPending: rankPending ? { availableAt: iso(closes.getTime()), submittedSoFar: 118, assigned: 212 } : null,
    timeUsedSeconds: 161 * 60,
    durationSeconds: 180 * 60,
    sections: sections.map((s) => ({ name: s.name, score: s.score, maxScore: s.maxScore, correct: s.correct, partial: s.partial, wrong: s.wrong, skipped: s.skipped, timeSeconds: s.timeSeconds })),
  };
}

/** The result query's answer (or error) for a ResultStates fixture. */
export async function resultFixture(state: string): Promise<StudentResult> {
  const now = Date.now();
  switch (state) {
    case "score-hidden":
      throw new StudentApiError(403, "Your institute isn't sharing scores for this test", "RESULT_HIDDEN", { submittedAt: iso(now - 20 * 86400e3), receiptId: "TR-91C2-04AB" });
    case "not-submitted-in-progress":
      throw new StudentApiError(404, "You have not submitted this test", "NO_SUBMISSION", { state: "inProgress", opensAt: iso(now - 3600e3), closesAt: iso(now + 8 * 3600e3), attempt: { answered: 41, total: 75, secondsLeft: 107 * 60 } });
    case "not-submitted-upcoming":
      throw new StudentApiError(404, "You have not submitted this test", "NO_SUBMISSION", { state: "upcoming", opensAt: iso(now + 9 * 86400e3), closesAt: iso(now + 9 * 86400e3 + 3 * 3600e3), attempt: null });
    case "not-submitted-missed":
      throw new StudentApiError(404, "You have not submitted this test", "NO_SUBMISSION", { state: "missed", opensAt: iso(now - 17 * 86400e3), closesAt: iso(now - 16 * 86400e3), attempt: null });
    case "not-found":
      throw new StudentApiError(404, "Test not found", "TEST_NOT_FOUND");
    // batch 8 Student-ErrorPages
    case "test-removed":
      throw new StudentApiError(404, "This test was removed", "TEST_REMOVED", { name: "Physics Sectional 3", removedAt: "2026-11-03T05:30:00.000Z" });
    case "not-yours":
      throw new StudentApiError(404, "This test isn't yours", "NOT_YOUR_TEST");
  }
  return published(state);
}

const READY: SummaryResponse = {
  now: new Date().toISOString(),
  status: "ready",
  reason: null,
  marksLost: 52,
  marksExplained: 33,
  leaks: [
    { title: "Rotational motion", marksLost: 10, note: "You used the full length as the lever arm in Q3 and Q19.", questionNs: [3, 19], kind: "concept" },
    { title: "Rushed chemistry", marksLost: 15, note: "Answered in the last 12 minutes: Q41 and two others went wrong.", questionNs: [41], kind: "time" },
    { title: "Skipped integrals", marksLost: 8, note: "Q22 and Q66 were skipped; you had solved the same kind in Mock 10.", questionNs: [22, 66], kind: "skip" },
  ],
  other: { marksLost: 19, note: "Single slips across the paper." },
  generatedAt: new Date().toISOString(),
  review: { state: "ready", triesPerDay: 3, triesLeft: 2, nextAutomaticRetryAt: null, supportCode: null, lastFailedAt: null, queuedAt: null, queueAhead: null, stale: null, generatedAt: new Date().toISOString() },
};

/** The AI summary for a fixture: the board's states (writing, late, locked, paused, failed; batch 8 queued, generating, failed-final, stale) or a ready summary. */
export function summaryFixture(state: string, retry: () => void): SummaryState | null {
  switch (state) {
    case "summary-writing":
      return { kind: "loading" };
    case "summary-late":
      return { kind: "late" };
    case "summary-locked": {
      const closes = new Date();
      closes.setUTCHours(15, 30, 0, 0);
      if (closes.getTime() < Date.now()) closes.setUTCDate(closes.getUTCDate() + 1);
      return { kind: "locked", message: "", at: closes.toISOString() };
    }
    case "summary-paused":
      return { kind: "paused" };
    case "summary-failed":
      return { kind: "failed", retry, triesLeft: 2 };
    // Batch 8 Review-NotGenerated
    case "summary-queued":
      return { kind: "queued", ahead: 9 };
    case "summary-generating":
      return { kind: "loading", marksLost: 52 };
    case "summary-failed-final":
      return { kind: "failedFinal", code: "E-AI7C" };
    case "summary-stale":
      return { kind: "stale", before: 243, after: 248, qs: [38] };
    case "key-corrected":
    case "rank-pending":
    case "pdf":
      return { kind: "ready", s: READY };
  }
  return null;
}
