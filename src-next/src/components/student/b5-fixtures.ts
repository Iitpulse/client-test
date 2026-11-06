// Typed fixtures for the batch 5 state props of Home, Tests and Profile (Student-Home / Phone-Home, Student-Tests /
// Phone-Tests, Student-Profile / Phone-Profile). Loaded only when a page is opened with `?fixture=<state>` on dev or
// staging (lib/fixtures.ts), so every state can be screenshot without arranging the data. Sample data: Indore only.
import { StudentApiError } from "@/lib/student-api";
import type { LastResult, StudentHome, StudentTestsPage, TestCard, TestsTab, TrendPoint } from "@/types/m2-student";
import type { ProgressResponse, StudentProfile, StudyPlanResponse } from "@/types/m4";
import type { StudentGateResponse } from "@/types/m6";
import type { LocationsResponse } from "@/types/m6-locations";

const M = 60_000;
const H = 60 * M;
const D = 24 * H;
const IST = 5.5 * H;
const iso = (ms: number) => new Date(ms).toISOString();

function clock() {
  const now = Date.now();
  const day0 = Math.floor((now + IST) / D) * D - IST; // today 00:00 IST
  return { now, day0 };
}

type CardIn = Partial<TestCard> & Pick<TestCard, "id" | "name" | "opensAt" | "closesAt">;
function card(c: CardIn): TestCard {
  const full = c.kind !== "sectional";
  return {
    kind: "full",
    shortName: c.name.replace(/^JEE Main /, ""),
    exam: { id: "ex_jee", name: "JEE Main" },
    subjects: full ? ["Physics", "Chemistry", "Maths"] : ["Physics"],
    totalQuestions: full ? 75 : 25,
    durationMinutes: full ? 180 : 60,
    maxScore: full ? 300 : 100,
    state: "upcoming",
    attempt: null,
    submittedAt: null,
    result: null,
    ...c,
  };
}
const sectional = (subject: string, c: CardIn) => card({ kind: "sectional", subjects: [subject], totalQuestions: 25, durationMinutes: 60, maxScore: 100, ...c });

function published(score: number, max: number, position: number, of: number, best = false) {
  return {
    visibility: { status: "published" as const, mode: "immediately" as const, availableAt: null, publishedAt: null, reason: null },
    headline: {
      score,
      maxScore: max,
      percent: Math.round((100 * score) / max),
      rank: { position, of, percentile: Math.floor((100 * (of - position)) / of), topPercent: Math.ceil((100 * position) / of) },
      rankAvailableAt: null,
      delta: null,
      isPersonalBest: best,
    },
  };
}

const BATCH = { id: "bt_indore_a", name: "JEE 2027 · Indore A" };

function cards() {
  const { now, day0 } = clock();
  const mock12 = card({ id: "fx_m12", name: "JEE Main Mock 12", state: "live", opensAt: iso(now - H), closesAt: iso(now + 2 * H + 14 * M + 36_000) });
  const resume12 = card({
    ...mock12,
    state: "in_progress",
    attempt: { startedAt: iso(now - 73 * M), expiresAt: iso(now + 107 * M), remainingSeconds: 107 * 60 },
  });
  const chem4live = sectional("Chemistry", { id: "fx_c4l", name: "Chemistry Sectional 4", state: "live", opensAt: iso(now - 2 * H), closesAt: iso(day0 + D + 13 * H) });
  const maths4live = sectional("Maths", { id: "fx_m4l", name: "Maths Sectional 4", state: "live", opensAt: iso(now - 3 * H), closesAt: iso(day0 + 4 * D + 18 * H) });
  const p4 = sectional("Physics", { id: "fx_p4", name: "Physics Sectional 4", opensAt: iso(day0 + 13 * D + 10 * H), closesAt: iso(day0 + 13 * D + 13 * H) });
  const c4 = sectional("Chemistry", { id: "fx_c4", name: "Chemistry Sectional 4", opensAt: iso(day0 + 16 * D + 10 * H), closesAt: iso(day0 + 16 * D + 13 * H) });
  const m13 = card({ id: "fx_m13", name: "JEE Main Mock 13", opensAt: iso(day0 + 20 * D + 9 * H), closesAt: iso(day0 + 20 * D + 21 * H) });
  const m11 = card({
    id: "fx_m11",
    name: "JEE Main Mock 11",
    state: "submitted",
    opensAt: iso(day0 - D + 9 * H),
    closesAt: iso(day0 - D + 21 * H),
    submittedAt: iso(day0 - D + 12 * H + 4 * M),
    result: published(248, 300, 14, 212, true),
  });
  const ms3 = sectional("Maths", {
    id: "fx_ms3",
    name: "Maths Sectional 3",
    state: "submitted",
    opensAt: iso(day0 - 3 * D + 10 * H),
    closesAt: iso(day0 - 3 * D + 13 * H),
    submittedAt: iso(day0 - 3 * D + 11 * H),
    result: { visibility: { status: "pending", mode: "autoAfterXDays", availableAt: iso(day0 + 18 * D + 17 * H), publishedAt: null, reason: null }, headline: null },
  });
  const m10 = card({ id: "fx_m10", name: "JEE Main Mock 10", state: "submitted", opensAt: iso(day0 - 8 * D + 9 * H), closesAt: iso(day0 - 8 * D + 21 * H), submittedAt: iso(day0 - 8 * D + 12 * H), result: published(224, 300, 22, 208) });
  const ps3 = sectional("Physics", { id: "fx_ps3", name: "Physics Sectional 3", state: "ended", opensAt: iso(day0 - 13 * D + 10 * H), closesAt: iso(day0 - 13 * D + 13 * H) });
  const cs3 = sectional("Chemistry", {
    id: "fx_cs3",
    name: "Chemistry Sectional 3",
    state: "submitted",
    opensAt: iso(day0 - 17 * D + 10 * H),
    closesAt: iso(day0 - 17 * D + 13 * H),
    submittedAt: iso(day0 - 17 * D + 11 * H),
    result: { visibility: { status: "hidden", mode: "hidden", availableAt: null, publishedAt: null, reason: "Your institute goes through this test in class" }, headline: null },
  });
  const m9 = card({ id: "fx_m9", name: "JEE Main Mock 9", state: "submitted", opensAt: iso(day0 - 22 * D + 9 * H), closesAt: iso(day0 - 22 * D + 21 * H), submittedAt: iso(day0 - 22 * D + 12 * H), result: published(201, 300, 31, 204) });
  return { now, day0, mock12, resume12, chem4live, maths4live, p4, c4, m13, m11, ms3, m10, ps3, cs3, m9 };
}

function lastResultOf(c: ReturnType<typeof cards>): LastResult {
  const h = c.m11.result!.headline!;
  return {
    test: c.m11,
    submittedAt: c.m11.submittedAt!,
    visibility: c.m11.result!.visibility,
    headline: { ...h, delta: { marks: 24, vsTestId: "fx_m10", vsTestName: "JEE Main Mock 10" } },
  };
}

function trendOf(c: ReturnType<typeof cards>): TrendPoint[] {
  const scores = [176, 190, 201, 212, 224, 248];
  return scores.map((s, i) => ({
    testId: i === 5 ? "fx_m11" : `fx_m${6 + i}`,
    testName: `JEE Main Mock ${6 + i}`,
    submittedAt: iso(c.day0 - (6 - i) * 7 * D),
    score: s,
    maxScore: 300,
    percent: Math.round((100 * s) / 300),
    accuracyPercent: 60 + 4 * i,
    rank: { position: [40, 35, 31, 27, 22, 14][i]!, of: 200 + 2 * i },
  }));
}

function home(fx: string): StudentHome {
  const c = cards();
  const base: StudentHome = {
    now: iso(c.now),
    student: { id: "fx_student", name: "Aarav Jain", batch: BATCH },
    live: c.mock12,
    liveCount: 1,
    lastResult: lastResultOf(c),
    latestPending: null,
    trend: trendOf(c),
    upcoming: [c.p4, c.c4, c.m13],
    weakTopics: null,
    studyPlan: null,
  };
  switch (fx) {
    case "day-one":
      return { ...base, live: null, liveCount: 0, lastResult: null, trend: [] };
    case "next-opens":
      return { ...base, live: null, liveCount: 0 };
    case "nothing-now":
      return { ...base, live: null, liveCount: 0, upcoming: [] };
    case "many-live":
      return { ...base, liveCount: 3 };
    case "resume":
      return { ...base, live: c.resume12 };
    case "no-batch":
      return { ...base, student: { ...base.student, batch: null }, live: null, liveCount: 0, lastResult: null, trend: [], upcoming: [] };
    default:
      return base;
  }
}

function testsPage(fx: string, q: { tab: TestsTab; subject?: string; q?: string }): StudentTestsPage {
  const c = cards();
  const resume = fx === "resume";
  const noLive = fx === "nothing-live" || fx === "nothing-now";
  const noBatch = fx === "no-batch";
  const all: Record<TestsTab, TestCard[]> = {
    live: noLive || noBatch ? [] : resume ? [c.resume12] : fx === "many-live" ? [c.mock12, c.chem4live, c.maths4live] : [c.mock12],
    upcoming: noBatch ? [] : [c.p4, c.c4, c.m13],
    completed: noBatch ? [] : [c.m11, c.ms3, c.m10, c.ps3, c.cs3, c.m9],
  };
  const needle = (q.q ?? "").toLowerCase();
  const items = all[q.tab].filter((t) => (!q.subject || t.kind === "full" || t.subjects.includes(q.subject)) && (!needle || t.name.toLowerCase().includes(needle)));
  const older = q.tab === "completed" && !noBatch && !q.subject && !needle;
  return {
    now: iso(c.now),
    batch: noBatch ? null : BATCH,
    tab: q.tab,
    counts: { live: all.live.length, upcoming: all.upcoming.length, completed: noBatch ? 0 : 11 },
    subjects: noBatch ? [] : ["Physics", "Chemistry", "Maths"],
    items,
    nextCursor: older ? "fx_older" : null,
    remaining: older ? 5 : 0,
  };
}

function gate(testId: string): StudentGateResponse {
  const c = cards();
  return {
    now: iso(c.now),
    state: "resume",
    test: { testId, name: c.mock12.name, questions: 75, durationMinutes: 180, maxMarks: 300, subjects: c.mock12.subjects, opensAt: c.mock12.opensAt, closesAt: c.mock12.closesAt },
    batches: null,
    attempt: { startedAt: c.resume12.attempt!.startedAt, expiresAt: c.resume12.attempt!.expiresAt, answered: 41, total: 75, lastSavedAt: iso(c.now - 3 * M), fullscreenExits: 0, exitsAllowed: null },
    submission: null,
    fullscreenPolicy: { enabled: false, maxExits: 3, action: "warn" },
    reminderEmailOn: true,
  };
}

function progress(): ProgressResponse {
  const c = cards();
  const weak = (subject: string, chapter: string, percent: number) => ({
    subject,
    chapter,
    topic: null,
    percent,
    attempted: 24,
    correct: Math.round((24 * percent) / 100),
    skipped: 3,
    insight: { kind: "accuracy" as const, text: `${percent}% correct over your last tests` },
    action: { kind: "practice" as const, label: "Practice 12 questions", practice: { subject, chapter, count: 12 } },
  });
  return {
    now: iso(c.now),
    range: "90d",
    from: iso(c.day0 - 90 * D),
    testsCount: 6,
    headline: { average: null, accuracy: null, timePerQuestion: null, bestRank: null },
    scoreTrend: [],
    chapterMastery: { tests: [], rows: [] },
    weakTopics: [weak("Physics", "Rotational motion", 38), weak("Chemistry", "Chemical equilibrium", 46), weak("Maths", "Definite integrals", 52)],
    strengths: [],
    heldBackCount: 0,
  };
}

function plan(fx: string): StudyPlanResponse {
  const c = cards();
  const actions = { lighter: { available: true, nextAt: null }, rebuild: { available: true, nextAt: null } };
  if (fx === "day-one") return { now: iso(c.now), status: "not_applicable", reason: "NO_RESULTS", plan: null, actions };
  const today = new Date(c.day0 + IST).toISOString().slice(0, 10);
  return {
    now: iso(c.now),
    status: "ready",
    reason: null,
    actions,
    plan: {
      id: "fx_plan",
      weekStart: today,
      generatedAt: iso(c.now - D),
      basedOn: [{ testId: "fx_m11", shortName: "Mock 11" }],
      minutesPerDay: 90,
      days: [
        {
          date: today,
          isToday: true,
          minutes: 90,
          items: [
            { id: "fx_i1", kind: "read", title: "Re-read torque about an axis", minutes: 20, done: true, practice: null, redo: null },
            { id: "fx_i2", kind: "practice", title: "12 practice questions: rotational motion", minutes: 30, done: false, practice: { subject: "Physics", chapter: "Rotational motion", count: 12 }, redo: null },
            { id: "fx_i3", kind: "read", title: "Revise Le Chatelier's principle", minutes: 25, done: false, practice: null, redo: null },
            {
              id: "fx_i4",
              kind: "redo",
              title: "Redo 3 questions you got wrong",
              minutes: 15,
              done: false,
              practice: null,
              redo: { testId: "fx_m11", testShortName: "Mock 11", questions: [{ n: 12, shownAs: 12 }, { n: 41, shownAs: 41 }, { n: 55, shownAs: 55 }] },
            },
          ],
        },
      ],
    },
  };
}

function profile(): { now: string; profile: StudentProfile } {
  return {
    now: new Date().toISOString(),
    profile: {
      id: "fx_student",
      firstName: "Aarav",
      lastName: "Jain",
      email: "aarav.jain@example.com",
      rollNo: null,
      phone: "+919826012345",
      city: "Indore",
      cityOptions: ["Indore"],
      parentPhone: "+919826054321",
      targetLabel: "JEE 2027",
      batch: { id: "bt_indore_a", name: "Indore A" },
      institute: { name: "IIT-PULSE Indore" },
      preferences: { questionLanguage: "en", emailResults: true, testReminders: true, rebuildPlanAfterResult: true },
    },
  };
}

function locations(): LocationsResponse {
  return { now: new Date().toISOString(), cities: ["Indore"], states: ["Madhya Pradesh"], standards: [], streams: [], mediums: [] };
}

const never = <T,>() => new Promise<T>(() => {});

/** One fixture by page state and name. `loading` never answers; `error` fails like a 500 would. */
export async function fixture(fx: string, name: string, arg?: unknown): Promise<unknown> {
  if (fx === "loading" && name !== "locations") return never();
  if (fx === "error" && name !== "locations") throw new StudentApiError(500, "Something went wrong. Please try again.");
  await new Promise((r) => setTimeout(r, 150));
  switch (name) {
    case "home":
      return home(fx);
    case "tests":
      return testsPage(fx, arg as { tab: TestsTab; subject?: string; q?: string });
    case "tests-older":
      return { ...testsPage(fx, { tab: "completed" }), items: [], nextCursor: null, remaining: 0 };
    case "gate":
      return gate(String(arg));
    case "progress":
      return progress();
    case "plan":
      return plan(fx);
    case "profile":
      return profile();
    case "locations":
      return locations();
    default:
      throw new Error(`no fixture ${name}`);
  }
}
