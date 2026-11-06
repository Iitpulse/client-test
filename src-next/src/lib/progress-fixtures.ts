// Typed fixtures for the Student-Progress / Phone-Progress state boards (batch 5). Read only when fixtures are allowed
// (lib/fixtures.ts: dev, staging, NEXT_PUBLIC_M6_FIXTURES=1) via `/progress?fixture=<name>`; production never reads them.
// Sample data follows the boards (chapters, marks); the shapes are the M4 contract's (types/m4.ts).
import { StudentApiError } from "./student-api";
import type { ProgressResponse, StudyPlan, StudyPlanItem, StudyPlanResponse, WeakTopic } from "@/types/m4";

export const PROGRESS_FIXTURES = [
  "page",
  "one",
  "empty",
  "loading",
  "error",
  "plan-generating",
  "plan-slow",
  "plan-paused",
  "plan-locked",
  "plan-none",
  "plan-rebuilding",
  "plan-limit",
] as const;
export type ProgressFixtureName = (typeof PROGRESS_FIXTURES)[number];

/** What the plan cards show for a fixture: the GET answer or its error, the 60 s window, the last action's error. */
export interface PlanFixture {
  r: StudyPlanResponse | null;
  error: StudentApiError | null;
  late: boolean;
  actionError: StudentApiError | null;
}

export interface ProgressFixture {
  progress: ProgressResponse | "loading" | "error";
  plan: PlanFixture | null;
}

const DAY = 86_400_000;
const IST = 330 * 60_000;
const iso = (ms: number) => new Date(ms).toISOString();
/** YYYY-MM-DD of the IST calendar day of `ms` */
const istDate = (ms: number) => new Date(ms + IST).toISOString().slice(0, 10);
/** Next IST midnight as UTC ms */
const nextMidnight = (ms: number) => Math.floor((ms + IST) / DAY) * DAY + DAY - IST;

const weak = (chapter: string, subject: string, percent: number, text: string, kind: WeakTopic["action"]["kind"], label: string, count: number, minutes: number | null): WeakTopic => ({
  subject,
  chapter,
  topic: null,
  percent,
  attempted: 11,
  correct: Math.round((11 * percent) / 100),
  skipped: 2,
  insight: { kind: kind === "timedDrill" ? "timePressure" : "accuracy", text },
  action: { kind, label, practice: { subject, chapter, count, minutes } },
});

function fullProgress(now: number): ProgressResponse {
  const mocks = ["Mock 6", "Mock 7", "Mock 8", "Mock 9", "Mock 10", "Mock 11"];
  const scores = [168, 181, 196, 205, 226, 248];
  const tests = mocks.map((m, i) => ({ testId: `fx-mock-${i + 6}`, shortName: m }));
  const rows: Array<[string, string, number[]]> = [
    ["Physics", "Rotational motion", [30, 42, 35, 40, 38, 45]],
    ["Physics", "Electrostatics", [70, 78, 85, 88, 90, 92]],
    ["Physics", "Modern physics", [80, 86, 88, 92, 94, 95]],
    ["Physics", "Work, energy and power", [62, 68, 70, 74, 77, 80]],
    ["Chemistry", "Chemical equilibrium", [55, 50, 48, 44, 46, 42]],
    ["Chemistry", "Organic reactions", [85, 88, 92, 94, 96, 95]],
    ["Chemistry", "Thermodynamics", [60, 66, 70, 72, 75, 80]],
    ["Chemistry", "Ionic equilibrium", [50, 55, 58, 60, 63, 66]],
    ["Mathematics", "Definite integrals", [40, 50, 55, 48, 52, 58]],
    ["Mathematics", "Matrices", [78, 82, 86, 90, 92, 91]],
    ["Mathematics", "Coordinate geometry", [66, 70, 72, 75, 78, 82]],
  ];
  return {
    now: iso(now),
    range: "90d",
    from: iso(now - 90 * DAY),
    testsCount: 11,
    headline: {
      average: { score: 203, maxScore: 300, basis: "fullMocks", deltaSinceFrom: 35 },
      accuracy: { percent: 84, deltaPoints: 9 },
      timePerQuestion: { seconds: 128, targetSeconds: 120, targetLabel: "JEE Main" },
      bestRank: { rank: 14, of: 212, testId: "fx-mock-11", testShortName: "Mock 11" },
    },
    scoreTrend: mocks.map((m, i) => ({
      testId: `fx-mock-${i + 6}`,
      shortName: m,
      name: `JEE Main ${m}`,
      submittedAt: iso(now - (6 - i) * 7 * DAY),
      score: scores[i]!,
      maxScore: 300,
      percent: Math.round((scores[i]! / 300) * 100),
    })),
    chapterMastery: {
      tests,
      rows: rows.map(([subject, chapter, vals]) => ({
        subject,
        chapter,
        overallPercent: Math.round(vals.reduce((a, v) => a + v, 0) / vals.length),
        cells: vals.map((percent, i) => ({ testId: tests[i]!.testId, percent })),
      })),
    },
    weakTopics: [
      weak("Rotational motion", "Physics", 38, "7 of 11 mistakes use the wrong lever arm or moment of inertia axis. It's one idea, not the whole chapter.", "practice", "Practice 12 questions", 12, null),
      weak("Chemical equilibrium", "Chemistry", 46, "You know the concept (9 of 10 right untimed) but slip when rushed in the last 15 minutes.", "timedDrill", "Timed drill · 10 min", 10, 10),
      weak("Definite integrals", "Mathematics", 52, "You skip these more than you get them wrong. Attempt rate 41% vs 78% overall.", "practice", "Practice 8 questions", 8, null),
    ],
    strengths: [
      { subject: "Chemistry", chapter: "Organic reactions", percent: 94 },
      { subject: "Physics", chapter: "Modern physics", percent: 91 },
      { subject: "Mathematics", chapter: "Matrices", percent: 90 },
      { subject: "Physics", chapter: "Electrostatics", percent: 88 },
    ],
    heldBackCount: 0,
  };
}

function oneProgress(now: number): ProgressResponse {
  return {
    now: iso(now),
    range: "90d",
    from: iso(now - 90 * DAY),
    testsCount: 1,
    headline: {
      average: { score: 186, maxScore: 300, basis: "fullMocks", deltaSinceFrom: null },
      accuracy: { percent: 71, deltaPoints: null },
      timePerQuestion: { seconds: 151, targetSeconds: 120, targetLabel: "JEE Main" },
      bestRank: { rank: 41, of: 212, testId: "fx-mock-1", testShortName: "Mock 1" },
    },
    scoreTrend: [{ testId: "fx-mock-1", shortName: "Mock 1", name: "JEE Main Mock 1", submittedAt: iso(now - 3 * DAY), score: 186, maxScore: 300, percent: 62 }],
    chapterMastery: { tests: [{ testId: "fx-mock-1", shortName: "Mock 1" }], rows: [] },
    weakTopics: [
      weak("Rotational motion", "Physics", 33, "4 of 6 wrong. Most mix up the axis for moment of inertia.", "practice", "Practice 12 questions", 12, null),
      weak("Chemical equilibrium", "Chemistry", 45, "Slipped on the last few, when time was short.", "timedDrill", "Timed drill · 10 min", 10, 10),
      weak("Definite integrals", "Mathematics", 50, "Skipped 3 of 6.", "practice", "Practice 8 questions", 8, null),
    ],
    strengths: [],
    heldBackCount: 0,
  };
}

function emptyProgress(now: number): ProgressResponse {
  return {
    now: iso(now),
    range: "90d",
    from: iso(now - 90 * DAY),
    testsCount: 0,
    headline: { average: null, accuracy: null, timePerQuestion: null, bestRank: null },
    scoreTrend: [],
    chapterMastery: { tests: [], rows: [] },
    weakTopics: [],
    strengths: [],
    heldBackCount: 0,
  };
}

let seq = 0;
const item = (kind: StudyPlanItem["kind"], title: string, minutes: number | null, done = false, redo?: { short: string; qs: number[] }): StudyPlanItem => ({
  id: `fx-item-${++seq}`,
  kind,
  title,
  minutes,
  done,
  practice: kind === "practice" || kind === "drill" ? { chapter: title, count: 10, minutes: kind === "drill" ? minutes : null } : null,
  redo: redo ? { testId: "fx-mock-11", testShortName: redo.short, questions: redo.qs.map((n) => ({ n, shownAs: n })) } : null,
});

function plan(now: number, one: boolean, generatedAt = now - 20 * 3_600_000): StudyPlan {
  const todayMs = Math.floor((now + IST) / DAY) * DAY - IST;
  const dow = new Date(todayMs + IST).getUTCDay(); // 0 Sun
  const monday = todayMs - ((dow + 6) % 7) * DAY;
  const short = one ? "Mock 1" : "Mock 11";
  const redo = one ? [8, 19, 27] : [12, 41, 55];
  const days: StudyPlanItem[][] = [
    [item("read", "Re-read torque about an axis", 20, true), item("practice", "12 practice Qs: rotational motion", 30), item("read", "Revise Le Chatelier's principle", 25), item("redo", `Redo ${short} ${redo.map((q) => `Q${q}`).join(", ")}`, 15, false, { short, qs: redo })],
    [item("read", "Rolling motion", 25), item("drill", "Equilibrium timed drill", 10)],
    [item("read", "King's property integrals", 30), item("practice", "8 Qs definite integrals", null)],
    [item("read", "Ionic equilibrium", 25), item("drill", "Work-energy drill", 20)],
    [item("practice", "Mixed 20 Qs", 40)],
    [item("rest", "Rest or light revision", null)],
    [item("mockPrep", "Physics Sectional 4 prep", 30)],
  ];
  // Today's tasks first: the board's "today" column holds the four tasks wherever today falls in the week.
  const todayIdx = Math.round((todayMs - monday) / DAY);
  const order = days.slice(1);
  order.splice(todayIdx, 0, days[0]!);
  return {
    id: "fx-plan",
    weekStart: istDate(monday),
    generatedAt: iso(generatedAt),
    basedOn: one ? [{ testId: "fx-mock-1", shortName: "Mock 1" }] : [{ testId: "fx-mock-9", shortName: "Mock 9" }, { testId: "fx-mock-10", shortName: "Mock 10" }, { testId: "fx-mock-11", shortName: "Mock 11" }],
    minutesPerDay: one ? 60 : 75,
    days: order.map((items, i) => ({ date: istDate(monday + i * DAY), isToday: i === todayIdx, minutes: items.reduce((a, x) => a + (x.minutes ?? 0), 0), items })),
  };
}

const available = { available: true, nextAt: null };
const ready = (now: number, p: StudyPlan, over: Partial<StudyPlanResponse> = {}): StudyPlanResponse => ({
  now: iso(now),
  status: "ready",
  reason: null,
  plan: p,
  actions: { lighter: available, rebuild: available },
  ...over,
});

/** The fixture for `name`, or null when it isn't one. */
export function progressFixture(name: string | null): ProgressFixture | null {
  if (!name || !(PROGRESS_FIXTURES as readonly string[]).includes(name)) return null;
  const n = name as ProgressFixtureName;
  const now = Date.now();
  seq = 0;
  const live = (r: StudyPlanResponse | null, extra: Partial<PlanFixture> = {}): PlanFixture => ({ r, error: null, late: false, actionError: null, ...extra });
  switch (n) {
    case "loading":
      return { progress: "loading", plan: null };
    case "error":
      return { progress: "error", plan: null };
    case "empty":
      return { progress: emptyProgress(now), plan: null };
    case "one":
      return { progress: oneProgress(now), plan: live(ready(now, plan(now, true))) };
    case "page":
      return { progress: fullProgress(now), plan: live(ready(now, plan(now, false))) };
    case "plan-generating":
    case "plan-slow":
      return { progress: fullProgress(now), plan: live({ now: iso(now), status: "generating", reason: null, plan: null, actions: { lighter: available, rebuild: available } }, { late: n === "plan-slow" }) };
    case "plan-paused":
      return {
        progress: fullProgress(now),
        plan: live(ready(now, plan(now, false, now - 30 * 3_600_000)), { actionError: new StudentApiError(503, "AI help is paused right now. Your plan is still here.", "AI_PAUSED") }),
      };
    case "plan-locked":
      return { progress: fullProgress(now), plan: live(null, { error: new StudentApiError(403, "Your plan appears once answers for your last test are open.", "AI_NOT_AVAILABLE_YET") }) };
    case "plan-none":
      return { progress: fullProgress(now), plan: live(null, { error: new StudentApiError(503, "Your study plan couldn't be made right now. Try again in a few minutes.", "AI_UNAVAILABLE") }) };
    case "plan-rebuilding":
      return { progress: fullProgress(now), plan: live(ready(now, plan(now, false), { status: "generating" })) };
    case "plan-limit": {
      const at = nextMidnight(now);
      return {
        progress: fullProgress(now),
        plan: live(ready(now, plan(now, false, now - 40 * 60_000), { actions: { lighter: available, rebuild: { available: false, nextAt: iso(at) } } })),
      };
    }
  }
}
