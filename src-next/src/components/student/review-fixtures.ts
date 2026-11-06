// Typed fixtures for Student-Review / Phone-Review (M6 batch 5): every question type × key corrected × AI state,
// with the board's data. Read only when fixtures are allowed (lib/fixtures.ts: dev, staging hosts or
// NEXT_PUBLIC_M6_FIXTURES=1) through `?fixture=<type>&kc=1&ai=<state>` on /results/[testId]/q/[n].
//   type  single | multiple | numerical | paragraph | matrix   (the question shown first: Q12, Q38, Q63, Q32, Q24)
//   kc    1 = the answer key of that question was corrected
//   ai    not-asked | generating | ready | failed | refused | rate-limited | paused | credits-out | locked | no-solution
import { fixtureParam } from "@/lib/fixtures";
import type { QuestionCell, QuestionOutcome, ReviewOption, ReviewQuestion, StudentResult } from "@/types/m2-student";
import type { Explanation } from "@/types/m3-ai";
import type { ReviewQuestionM6, StudentKeyCorrectionNote } from "@/types/m6-review";
import { WHY_FIXTURE_STATES, type WhyFixture, type WhyFixtureState } from "./review-ai";

export type ReviewFixtureType = "single" | "multiple" | "numerical" | "paragraph" | "matrix";
export const REVIEW_FIXTURE_TYPES: ReviewFixtureType[] = ["single", "multiple", "numerical", "paragraph", "matrix"];
const FIRST: Record<ReviewFixtureType, number> = { single: 12, multiple: 38, numerical: 63, paragraph: 32, matrix: 24 };

export interface ReviewFixture {
  type: ReviewFixtureType;
  kc: boolean;
  ai: WhyFixtureState;
  /** the question the fixture opens on (paper number) */
  firstN: number;
  result: StudentResult;
  items: ReviewQuestionM6[];
  why: (n: number) => WhyFixture;
  /** the query string to keep on links (fixture=…&kc=…&ai=…) */
  search: string;
}

const NOW = "2026-11-04T13:20:00.000Z"; // Wed 4 Nov, 6:50 PM IST
const CORRECTED_AT = "2026-11-04T06:30:00.000Z"; // Wed 4 Nov, 12:00 PM IST
const RATE_AT = Date.parse("2026-11-04T13:42:00.000Z"); // 7:12 PM IST
const LOCKED_AT = "2026-11-04T15:30:00.000Z"; // 9:00 PM IST

/** The fixture asked for in the URL, or null (no fixture, or fixtures not allowed). Call in an effect. */
export function reviewFixtureFromUrl(testId: string): ReviewFixture | null {
  const t = fixtureParam();
  if (!t || !(REVIEW_FIXTURE_TYPES as string[]).includes(t)) return null;
  const sp = new URLSearchParams(window.location.search);
  const kc = sp.get("kc") === "1";
  const a = sp.get("ai");
  const ai = a && (WHY_FIXTURE_STATES as string[]).includes(a) ? (a as WhyFixtureState) : "ready";
  return buildReviewFixture(testId, t as ReviewFixtureType, kc, ai);
}

const opt = (id: string, key: string, en: string, isCorrect: boolean, isYours: boolean, hi?: string): ReviewOption => ({ id, key, text: { en, hi: hi ?? null }, isCorrect, isYours });
const NO_EXTRAS = { set: null, matrix: null, marking: { correct: 4, incorrect: -1, partial: [] }, keyCorrection: null };

function outcomeOf(n: number, kc: boolean): QuestionOutcome {
  if (n === 12) return kc ? "correct" : "wrong";
  if ([3, 19, 32, 41, 55, 63].includes(n)) return "wrong";
  if ([24, 38, 47].includes(n)) return "partial";
  if ([22, 33, 66].includes(n)) return "skipped";
  return "correct";
}
const MARKS: Record<QuestionOutcome, number> = { correct: 4, partial: 2, wrong: -1, skipped: 0 };
const subjectOf = (n: number) => (n <= 25 || (n >= 31 && n <= 33) || n === 63 ? "Physics" : n <= 50 ? "Chemistry" : "Maths");

function note(n: number, questionId: string, p: Pick<StudentKeyCorrectionNote, "oldKey" | "newKey" | "yourMarks" | "mode"> & { score?: [number, number]; rank?: [number, number] }): StudentKeyCorrectionNote {
  const [sb, sa] = p.score ?? [243, 243];
  const [rb, ra] = p.rank ?? [17, 17];
  return { n, questionId, correctedAt: CORRECTED_AT, oldKey: p.oldKey, newKey: p.newKey, yourMarks: p.yourMarks, mode: p.mode, yourScore: { before: sb, after: sa }, yourRank: { before: rb, after: ra } };
}

function cell(n: number, kc: boolean, type: QuestionCell["type"], timeSeconds: number): QuestionCell {
  const outcome = outcomeOf(n, kc);
  return { n, shownAs: n, questionId: `QS_fixture_${n}`, sectionId: `SE_fixture_${subjectOf(n)}`, subject: subjectOf(n), type, outcome, marks: MARKS[outcome], maxMarks: 4, timeSeconds };
}

/** A plain single-correct question for the cells the board does not open. */
function filler(c: QuestionCell): ReviewQuestionM6 {
  const yours = c.outcome === "correct" ? "a" : c.outcome === "wrong" ? "b" : null;
  const ids = ["a", "b", "c", "d"].map((k) => `OP_fx${c.n}${k}`);
  return {
    ...c,
    stem: { en: `<p>Sample question ${c.n}: if $x^2 = 9$ and $x > 0$, then $x$ is</p>`, hi: null },
    options: [opt(ids[0]!, "A", "$3$", true, yours === "a"), opt(ids[1]!, "B", "$-3$", false, yours === "b"), opt(ids[2]!, "C", "$9$", false, false), opt(ids[3]!, "D", "$\\sqrt{3}$", false, false)],
    yourAnswer: { optionIds: yours ? [`OP_fx${c.n}${yours}`] : [], value: null },
    correctAnswer: { optionIds: [ids[0]!], range: null },
    solution: { en: "<p>$x = \\sqrt{9} = 3$, since $x > 0$.</p>", hi: null },
    averageTimeSeconds: 70,
    correctPercent: 64,
    ...NO_EXTRAS,
  };
}

function explanation(why: string, steps: string[]): Explanation {
  return { mistakeType: "concept", why, steps, keyIdea: "", trap: "" };
}

const EXPL: Record<number, (kc: boolean) => Explanation> = {
  12: (kc) =>
    kc
      ? explanation("You picked A, which is right. The key first said C by mistake; your teacher corrected it.", ["The force acts at the midpoint, so the lever arm is $L/2$ and $\\tau = FL/2$. With $I = mL^2/3$ about the end, $\\alpha = \\dfrac{3F}{2mL}$."])
      : explanation("You used the full length $L$ as the lever arm, so you wrote $\\tau = F\\cdot L$.", [
          "The force acts at the midpoint, so the lever arm is $L/2$ and $\\tau = F\\cdot L/2$.",
          "For a rod about one end, $I = mL^2/3$. Then $\\alpha = \\tau / I = \\dfrac{3F}{2mL}$, option A.",
          "Your answer is exactly twice this: the lever-arm slip. You made the same slip in Q3.",
        ]),
  38: () =>
    explanation("Aromatic means a flat ring, fully conjugated, with $4n + 2$ π electrons.", [
      "Benzene and pyridine both have 6, and you picked both: +1 each.",
      "Furan is aromatic too: the oxygen gives one lone pair to the ring, making 6 π electrons. That is the one you missed.",
      "Cyclooctatetraene has 8 π electrons and is not flat, so leaving it was right.",
    ]),
  63: () =>
    explanation("Speed comes from the derivative: $v = \\dfrac{dx}{dt} = 6t^2 - 6t$.", [
      "At $t = 1.5$ s: $6 \\times 2.25 = 13.5$, and $6 \\times 1.5 = 9$, so $v = 4.5$ m/s.",
      "You entered 4. The method is likely right; it looks like 2.25 was rounded to 2 along the way. Keep decimals until the last step.",
    ]),
  32: () =>
    explanation("Friction is μ times the normal force, and on an incline the normal force is $mg\\cos 30^\\circ$, not $mg$.", [
      "$N = 2 \\times 10 \\times \\dfrac{\\sqrt{3}}{2} = 10\\sqrt{3}$ N, so $f = 0.2 \\times 10\\sqrt{3} = 2\\sqrt{3}$ N, option A.",
      "Your 4 N is $\\mu mg$: the $\\cos 30^\\circ$ was dropped. In Q31 you used the right N.",
    ]),
  24: () =>
    explanation("Moment of inertia is mass × distance², so $[ML^2]$, which is R. You matched it with S.", [
      "Power is work done per second: $[ML^2T^{-2}] \\div [T] = [ML^2T^{-3}]$, which is S. You left D empty.",
      "A and B were right: +1 each.",
    ]),
};

export function buildReviewFixture(testId: string, type: ReviewFixtureType, kcAsked: boolean, ai: WhyFixtureState): ReviewFixture {
  // The key correction is on the question the fixture opens on (the board's one note), not on every type's.
  const kcOf = (t: ReviewFixtureType) => kcAsked && t === type;
  const kc = kcOf("single");
  const TYPES: Record<number, QuestionCell["type"]> = { 24: "matrix", 38: "multiple", 63: "integer" };
  const TIMES: Record<number, number> = { 12: 192, 38: 108, 63: 160, 32: 70, 24: 140 };
  const cells = Array.from({ length: 75 }, (_, i) => cell(i + 1, kc, TYPES[i + 1] ?? "single", TIMES[i + 1] ?? 60 + ((i * 37) % 120)));
  const byN = (n: number) => cells[n - 1]!;

  // Q12 single correct (Physics); key corrected: the key said C, it is A, and the student answered A.
  const q12: ReviewQuestionM6 = {
    ...byN(12),
    stem: {
      en: "<p>A uniform rod of mass $m$ and length $L$ is pivoted at one end. A force $F$ acts perpendicular to the rod at its midpoint. The angular acceleration of the rod about the pivot is</p>",
      hi: "<p>द्रव्यमान $m$ और लंबाई $L$ की एक समान छड़ एक सिरे पर कीलकित है। छड़ के मध्य बिंदु पर उसके लंबवत बल $F$ लगता है। कीलक के परितः छड़ का कोणीय त्वरण है</p>",
    },
    options: [
      opt("OP_12a", "A", "$\\dfrac{3F}{2mL}$", true, kc),
      opt("OP_12b", "B", "$\\dfrac{3F}{mL}$", false, !kc),
      opt("OP_12c", "C", "$\\dfrac{F}{2mL}$", false, false),
      opt("OP_12d", "D", "$\\dfrac{6F}{mL}$", false, false),
    ],
    yourAnswer: { optionIds: [kc ? "OP_12a" : "OP_12b"], value: null },
    correctAnswer: { optionIds: ["OP_12a"], range: null },
    solution: { en: "<p>Lever arm $r = L/2$, so $\\tau = FL/2$.</p><p>$I$ (about one end) $= mL^2/3$.</p><p>$\\alpha = \\tau / I = \\dfrac{FL/2}{mL^2/3} = \\dfrac{3F}{2mL}$.</p>", hi: null },
    averageTimeSeconds: 100,
    correctPercent: 41,
    ...NO_EXTRAS,
    keyCorrection: kc ? note(12, byN(12).questionId, { mode: "changeKey", oldKey: { optionIds: ["OP_12c"] }, newKey: { optionIds: ["OP_12a"] }, yourMarks: { before: -1, after: 4 }, score: [243, 248], rank: [17, 14] }) : null,
  };

  // Q38 one or more correct (Chemistry), partly correct +2; key corrected: D (furan) added.
  const q38: ReviewQuestionM6 = {
    ...byN(38),
    stem: { en: "<p>Which of these compounds are aromatic? (One or more options are correct.)</p>", hi: "<p>निम्नलिखित में से कौन-से यौगिक ऐरोमैटिक हैं? (एक या अधिक विकल्प सही हैं)</p>" },
    options: [opt("OP_38a", "A", "Benzene", true, true), opt("OP_38b", "B", "Cyclooctatetraene", false, false), opt("OP_38c", "C", "Pyridine", true, true), opt("OP_38d", "D", "Furan", true, false)],
    yourAnswer: { optionIds: ["OP_38a", "OP_38c"], value: null },
    correctAnswer: { optionIds: ["OP_38a", "OP_38c", "OP_38d"], range: null },
    solution: {
      en: "<p>Benzene: 6 π e⁻, planar → aromatic.</p><p>Pyridine: 6 π e⁻ (N lone pair not in the ring system) → aromatic.</p><p>Furan: 4 π e⁻ from C=C plus one O lone pair = 6 → aromatic.</p><p>Cyclooctatetraene: 8 π e⁻, tub-shaped → not aromatic.</p>",
      hi: null,
    },
    averageTimeSeconds: 90,
    correctPercent: 22,
    set: null,
    matrix: null,
    marking: { correct: 4, incorrect: -2, partial: [{ count: 1, marks: 1 }, { count: 2, marks: 2 }, { count: 3, marks: 3 }] },
    keyCorrection: kcOf("multiple") ? note(38, byN(38).questionId, { mode: "acceptAlso", oldKey: { optionIds: ["OP_38a", "OP_38c"] }, newKey: { optionIds: ["OP_38a", "OP_38c", "OP_38d"] }, yourMarks: { before: 2, after: 2 } }) : null,
  };

  // Q63 numerical (Physics), wrong; accepted 4.4 to 4.6; key corrected: the range was widened from 4.5.
  const q63: ReviewQuestionM6 = {
    ...byN(63),
    stem: {
      en: "<p>A particle moves along a line with $x = 2t^3 - 3t^2$ m. Find its speed (in m/s) at $t = 1.5$ s.</p>",
      hi: "<p>एक कण की स्थिति $x = 2t^3 - 3t^2$ m है। $t = 1.5$ s पर इसकी चाल (m/s में) ज्ञात कीजिए।</p>",
    },
    options: [],
    yourAnswer: { optionIds: [], value: 4 },
    correctAnswer: { optionIds: [], range: { from: 4.4, to: 4.6 } },
    solution: { en: "<p>$v = \\dfrac{dx}{dt} = 6t^2 - 6t$</p><p>$v(1.5) = 6(2.25) - 6(1.5) = 13.5 - 9 = 4.5$ m/s</p><p>Accepted range: 4.4 to 4.6</p>", hi: null },
    averageTimeSeconds: 125,
    correctPercent: 35,
    ...NO_EXTRAS,
    keyCorrection: kcOf("numerical") ? note(63, byN(63).questionId, { mode: "changeKey", oldKey: { range: { from: 4.5, to: 4.5 } }, newKey: { range: { from: 4.4, to: 4.6 } }, yourMarks: { before: -1, after: -1 } }) : null,
  };

  // Q31–Q33 one passage (Physics): Q31 correct, Q32 wrong, Q33 skipped.
  const passage = {
    en: "<p>A block of mass 2 kg slides down a rough incline of angle 30°. The coefficient of kinetic friction is $\\mu = 0.2$. Take $g = 10\\ \\text{m/s}^2$.</p>",
    hi: "<p>2 kg द्रव्यमान का एक गुटका 30° कोण वाले खुरदरे आनत तल पर नीचे फिसलता है। गतिज घर्षण गुणांक $\\mu = 0.2$ है। $g = 10\\ \\text{m/s}^2$ लें।</p>",
  };
  const set = (index: number) => ({ setId: "SET_fixture_incline", index, count: 3, nFrom: 31, nTo: 33, passage });
  const paraMarking = { correct: 4, incorrect: -1, partial: [] };
  const q31: ReviewQuestionM6 = {
    ...byN(31),
    stem: { en: "<p>The normal force on the block is</p>", hi: "<p>गुटके पर अभिलंब बल है</p>" },
    options: [opt("OP_31a", "A", "$10\\sqrt{3}$ N", true, true), opt("OP_31b", "B", "$20$ N", false, false), opt("OP_31c", "C", "$10$ N", false, false), opt("OP_31d", "D", "$5\\sqrt{3}$ N", false, false)],
    yourAnswer: { optionIds: ["OP_31a"], value: null },
    correctAnswer: { optionIds: ["OP_31a"], range: null },
    solution: { en: "<p>$N = mg\\cos 30^\\circ = 2 \\times 10 \\times \\dfrac{\\sqrt{3}}{2} = 10\\sqrt{3}$ N</p>", hi: null },
    averageTimeSeconds: 60,
    correctPercent: 70,
    set: set(0),
    matrix: null,
    marking: paraMarking,
    keyCorrection: null,
  };
  const q32: ReviewQuestionM6 = {
    ...byN(32),
    stem: { en: "<p>The friction force on the block is</p>", hi: "<p>गुटके पर लगने वाला घर्षण बल है</p>" },
    options: [opt("OP_32a", "A", "$2\\sqrt{3}$ N", true, false), opt("OP_32b", "B", "$4$ N", false, true), opt("OP_32c", "C", "$2$ N", false, false), opt("OP_32d", "D", "$\\sqrt{3}$ N", false, false)],
    yourAnswer: { optionIds: ["OP_32b"], value: null },
    correctAnswer: { optionIds: ["OP_32a"], range: null },
    solution: { en: "<p>$N = mg\\cos 30^\\circ = 10\\sqrt{3}$ N</p><p>$f = \\mu N = 0.2 \\times 10\\sqrt{3} = 2\\sqrt{3}$ N</p>", hi: null },
    averageTimeSeconds: 85,
    correctPercent: 38,
    set: set(1),
    matrix: null,
    marking: paraMarking,
    keyCorrection: kcOf("paragraph") ? note(32, byN(32).questionId, { mode: "changeKey", oldKey: { optionIds: ["OP_32d"] }, newKey: { optionIds: ["OP_32a"] }, yourMarks: { before: -1, after: -1 } }) : null,
  };
  const q33: ReviewQuestionM6 = {
    ...byN(33),
    stem: { en: "<p>The acceleration of the block down the incline (in m/s²) is</p>", hi: "<p>आनत तल पर नीचे की ओर गुटके का त्वरण (m/s² में) है</p>" },
    options: [opt("OP_33a", "A", "$5 - \\sqrt{3}$", true, false), opt("OP_33b", "B", "$5 + \\sqrt{3}$", false, false), opt("OP_33c", "C", "$5$", false, false), opt("OP_33d", "D", "$5 - 2\\sqrt{3}$", false, false)],
    yourAnswer: { optionIds: [], value: null },
    correctAnswer: { optionIds: ["OP_33a"], range: null },
    solution: { en: "<p>$a = g\\sin 30^\\circ - \\mu g\\cos 30^\\circ = 5 - 0.2 \\times 10 \\times \\dfrac{\\sqrt{3}}{2} = 5 - \\sqrt{3}$ m/s²</p>", hi: null },
    averageTimeSeconds: 95,
    correctPercent: 30,
    set: set(2),
    matrix: null,
    marking: paraMarking,
    keyCorrection: null,
  };

  // Q24 match the lists (Physics), partly correct +2: A, B right; C wrong (S, key R); D empty.
  const q24: ReviewQuestionM6 = {
    ...byN(24),
    stem: { en: "<p>Match each quantity in List I with its dimensions in List II.</p>", hi: "<p>सूची I की प्रत्येक राशि को सूची II में उसकी विमा से मिलाइए।</p>" },
    options: [],
    yourAnswer: { optionIds: [], value: null },
    correctAnswer: { optionIds: [], range: null },
    solution: { en: "<p>A Torque → P $[ML^2T^{-2}]$</p><p>B Angular momentum → Q $[ML^2T^{-1}]$</p><p>C Moment of inertia → R $[ML^2]$</p><p>D Power → S $[ML^2T^{-3}]$</p>", hi: null },
    averageTimeSeconds: 130,
    correctPercent: 27,
    set: null,
    matrix: {
      rows: [
        { id: "A", en: "Torque", hi: "बल आघूर्ण" },
        { id: "B", en: "Angular momentum", hi: "कोणीय संवेग" },
        { id: "C", en: "Moment of inertia", hi: "जड़त्व आघूर्ण" },
        { id: "D", en: "Power", hi: "शक्ति" },
      ],
      columns: [
        { id: "P", en: "$[ML^2T^{-2}]$", hi: null },
        { id: "Q", en: "$[ML^2T^{-1}]$", hi: null },
        { id: "R", en: "$[ML^2]$", hi: null },
        { id: "S", en: "$[ML^2T^{-3}]$", hi: null },
      ],
      yours: { A: ["P"], B: ["Q"], C: ["S"] },
      key: { A: ["P"], B: ["Q"], C: ["R"], D: ["S"] },
      rowOutcomes: { A: "right", B: "right", C: "wrong", D: "blank" },
    },
    marking: { correct: 4, incorrect: 0, partial: [{ count: 1, marks: 1 }, { count: 2, marks: 2 }, { count: 3, marks: 3 }] },
    keyCorrection: kcOf("matrix") ? note(24, byN(24).questionId, { mode: "changeKey", oldKey: { matches: { A: ["P"], B: ["Q"], C: ["Q"], D: ["S"] } }, newKey: { matches: { A: ["P"], B: ["Q"], C: ["R"], D: ["S"] } }, yourMarks: { before: 2, after: 2 } }) : null,
  };

  const full = new Map<number, ReviewQuestionM6>([q12, q24, q31, q32, q33, q38, q63].map((q) => [q.n, q]));
  const items = cells.map((c) => full.get(c.n) ?? filler(c));
  const counts = { correct: 0, partial: 0, wrong: 0, skipped: 0, total: cells.length };
  for (const c of cells) counts[c.outcome]++;
  const score = kc ? 248 : 243;
  const result: StudentResult = {
    now: NOW,
    test: {
      id: testId,
      name: "JEE Main Mock 11",
      kind: "full",
      shortName: "M11",
      exam: { id: "EX_fixture_jee_main", name: "JEE Main" },
      subjects: ["Physics", "Chemistry", "Maths"],
      totalQuestions: 75,
      durationMinutes: 180,
      maxScore: 300,
      opensAt: "2026-11-04T03:30:00.000Z",
      closesAt: "2026-11-04T12:30:00.000Z",
    },
    submission: { receiptId: "TR-7F3A-21C9", submittedAt: "2026-11-04T07:12:00.000Z", autoSubmitted: false, attemptedCount: 72, totalQuestions: 75, timeUsedSeconds: 9840, durationMinutes: 180 },
    visibility: { status: "published", mode: "immediately", availableAt: null, publishedAt: "2026-11-04T07:12:00.000Z", reason: null },
    review: { available: true, availableAt: null, reason: null },
    result: {
      score,
      maxScore: 300,
      percent: Math.round((100 * score) / 300),
      rank: null,
      rankAvailableAt: null,
      delta: null,
      isPersonalBest: false,
      counts,
      sections: [],
      questions: cells,
    },
  };
  const why = (n: number): WhyFixture => ({ state: ai, explanation: (EXPL[n] ?? EXPL[12]!)(kc && n === 12), rateAt: RATE_AT, lockedAt: LOCKED_AT });
  const search = `fixture=${type}${kcAsked ? "&kc=1" : ""}&ai=${ai}`;
  return { type, kc: kcAsked, ai, firstN: FIRST[type], result, items, why, search };
}

/** The filtered list and neighbours of `n`, as GET …/questions/:n would answer (filter review = not correct). */
export function fixtureItem(f: ReviewFixture, n: number, inFilter: (o: QuestionOutcome) => boolean) {
  const list = f.items.filter((q) => inFilter(q.outcome));
  const i = list.findIndex((q) => q.n === n);
  const item: ReviewQuestion | undefined = f.items.find((q) => q.n === n);
  return {
    item,
    position: i >= 0 ? { index: i + 1, of: list.length } : null,
    prevN: i > 0 ? list[i - 1]!.n : null,
    nextN: i >= 0 && i < list.length - 1 ? list[i + 1]!.n : null,
  };
}
