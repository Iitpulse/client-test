// Typed fixtures for the batch 5 practice states (Student-Practice / Phone-Practice `variant` × `state`). Read only
// through lib/fixtures.ts (`?fixture=<name>`, never in production). Passage and matrix questions exist only here until
// the tests service sends them. Checks in fixture mode are graded locally against the keys below.
import type { PracticeCheck } from "@/types/m4";
import type { MatrixAnswer, PracticeAnswer, PracticeCheckM6, PracticeQuestionM6, PracticeSetM6 } from "@/types/practice-m6";

export type PracticeFxName = "page" | "drill" | "finished" | "loading" | "error" | "notfound" | "held" | "noleft" | "limit" | "unavailable" | "multi" | "num" | "para" | "mx";
export const PRACTICE_FX: PracticeFxName[] = ["page", "drill", "finished", "loading", "error", "notfound", "held", "noleft", "limit", "unavailable", "multi", "num", "para", "mx"];

export function asPracticeFx(v: string | null): PracticeFxName | null {
  return v && (PRACTICE_FX as string[]).includes(v) ? (v as PracticeFxName) : null;
}

type Key = { optionIds?: string[]; range?: { min: number; max: number }; matrix?: MatrixAnswer };
type Bank = { q: Omit<PracticeQuestionM6, "n" | "questionId" | "checked">; key: Key; solution: string; solutionHi?: string };

const opt = (key: string, en: string, hi: string | null = null) => ({ id: `o${key}`, key, en, hi });

const BANK: Record<string, Bank> = {
  sphere: {
    q: { type: "single", stem: { en: "<p>A solid sphere rolls without slipping on a horizontal floor. The fraction of its total kinetic energy that is rotational is</p>", hi: null }, options: [opt("A", "$\\frac{2}{7}$"), opt("B", "$\\frac{2}{5}$"), opt("C", "$\\frac{5}{7}$"), opt("D", "$\\frac{1}{2}$")] },
    key: { optionIds: ["oA"] },
    solution: "<p>For a solid sphere $I = \\frac{2}{5}mR^2$, and rolling means $v = \\omega R$. Rotational KE $= \\frac{1}{2}I\\omega^2 = \\frac{1}{5}mv^2$. Total KE $= \\frac{1}{2}mv^2 + \\frac{1}{5}mv^2 = \\frac{7}{10}mv^2$, so the fraction is $\\frac{2}{7}$, option A.</p>",
  },
  disc: {
    q: { type: "integer", stem: { en: "<p>A disc with moment of inertia 2 kg m² spins at 10 rad s⁻¹. A constant torque brings it to rest in 5 s. The magnitude of the torque, in N m, is</p>", hi: null }, options: [] },
    key: { range: { min: 4, max: 4 } },
    solution: "<p>$\\alpha = \\frac{\\omega}{t} = \\frac{10}{5} = 2$ rad s⁻², so $\\tau = I\\alpha = 2 \\times 2 = 4$ N m.</p>",
  },
  ring: {
    q: {
      type: "single",
      stem: {
        en: "<p>A thin uniform ring of mass $M$ and radius $R$ rotates about a tangent lying in its own plane. Its moment of inertia about this axis is</p>",
        hi: "<p>द्रव्यमान $M$ और त्रिज्या $R$ की एक पतली एकसमान वलय अपने ही तल में स्थित एक स्पर्श रेखा के परितः घूमती है। इस अक्ष के परितः उसका जड़त्व आघूर्ण है</p>",
      },
      options: [opt("A", "$\\frac{1}{2}MR^2$", "$\\frac{1}{2}MR^2$"), opt("B", "$\\frac{3}{2}MR^2$", "$\\frac{3}{2}MR^2$"), opt("C", "$2MR^2$", "$2MR^2$"), opt("D", "$\\frac{5}{4}MR^2$", "$\\frac{5}{4}MR^2$")],
    },
    key: { optionIds: ["oB"] },
    solution: "<p>About a diameter, $I = \\frac{1}{2}MR^2$. A tangent in the plane is parallel to a diameter at distance $R$, so by the parallel-axis theorem $I = \\frac{1}{2}MR^2 + MR^2 = \\frac{3}{2}MR^2$, option B.</p>",
  },
  pcl: {
    q: { type: "integer", stem: { en: "<p>At 500 K, for $\\mathrm{PCl_5(g) \\rightleftharpoons PCl_3(g) + Cl_2(g)}$, $K_c = 0.04$ mol L⁻¹. If $[\\mathrm{PCl_3}] = [\\mathrm{Cl_2}] = 0.2$ mol L⁻¹ at equilibrium, $[\\mathrm{PCl_5}]$ in mol L⁻¹ is</p>", hi: null }, options: [] },
    key: { range: { min: 1, max: 1 } },
    solution: "<p>$K_c = \\frac{[\\mathrm{PCl_3}][\\mathrm{Cl_2}]}{[\\mathrm{PCl_5}]}$, so $[\\mathrm{PCl_5}] = \\frac{0.2 \\times 0.2}{0.04} = 1$ mol L⁻¹.</p>",
  },
  so3: {
    q: {
      type: "single",
      stem: { en: "<p>For $\\mathrm{2SO_2(g) + O_2(g) \\rightleftharpoons 2SO_3(g)}$, $\\Delta H &lt; 0$. The equilibrium yield of $\\mathrm{SO_3}$ increases when</p>", hi: null },
      options: [opt("A", "the temperature is lowered"), opt("B", "the total pressure is lowered"), opt("C", "an inert gas is added at constant volume"), opt("D", "a catalyst is added")],
    },
    key: { optionIds: ["oA"] },
    solution: "<p>The forward reaction is exothermic, so cooling favours $\\mathrm{SO_3}$. Lower pressure favours the side with more moles of gas, which is the left. An inert gas at constant volume and a catalyst leave the equilibrium where it is. Option A.</p>",
  },
  multi: {
    q: {
      type: "multiple",
      stem: { en: "<p>A solid cylinder rolls without slipping down a rough incline of angle $\\theta$. Which of these are true?</p>", hi: null },
      options: [opt("A", "The friction on it acts up the incline"), opt("B", "Friction does negative work on it"), opt("C", "Its acceleration is $\\frac{2}{3}g\\sin\\theta$"), opt("D", "Its total mechanical energy stays the same")],
    },
    key: { optionIds: ["oA", "oC", "oD"] },
    solution: "<p>Rolling down, friction acts up the incline and $a = \\dfrac{g\\sin\\theta}{1 + I/mR^2}$. For a solid cylinder $I = \\frac{1}{2}mR^2$, so $a = \\frac{2}{3}g\\sin\\theta$. The contact point does not slide, so friction does no work and mechanical energy stays the same. A, C and D are correct.</p>",
  },
  num: {
    q: { type: "integer", stem: { en: "<p>A wheel with moment of inertia 0.8 kg m² starts from rest. A constant torque of 1.2 N m acts on it for 3 s. Its angular speed at the end, in rad s⁻¹, is</p>", hi: null }, options: [] },
    key: { range: { min: 4.4, max: 4.6 } },
    solution: "<p>$\\alpha = \\frac{\\tau}{I} = \\frac{1.2}{0.8} = 1.5$ rad s⁻², so $\\omega = \\alpha t = 1.5 \\times 3 = 4.5$ rad s⁻¹. Anything from 4.4 to 4.6 is accepted.</p>",
  },
  mx: {
    q: {
      type: "matrix",
      stem: { en: "<p>Match each body in List I with its moment of inertia in List II, about the axis given. Each body has mass $M$ and radius $R$.</p>", hi: null },
      options: [],
      matrix: {
        rows: [
          { id: "A", en: "Ring, central axis", hi: null },
          { id: "B", en: "Disc, central axis", hi: null },
          { id: "C", en: "Solid sphere, a diameter", hi: null },
          { id: "D", en: "Hollow sphere, a diameter", hi: null },
        ],
        columns: [
          { id: "P", en: "$MR^2$", hi: null },
          { id: "Q", en: "$\\frac{1}{2}MR^2$", hi: null },
          { id: "R", en: "$\\frac{2}{5}MR^2$", hi: null },
          { id: "S", en: "$\\frac{2}{3}MR^2$", hi: null },
        ],
      },
    },
    key: { matrix: { A: ["P"], B: ["Q"], C: ["R"], D: ["S"] } },
    solution: "<p>Ring: all the mass is at $R$, so $MR^2$ (P). Disc: $\\frac{1}{2}MR^2$ (Q). Solid sphere: $\\frac{2}{5}MR^2$ (R). Hollow sphere: $\\frac{2}{3}MR^2$ (S).</p>",
  },
};

const PASSAGE = {
  en: "<p>A solid sphere of mass 2 kg and radius 0.1 m starts from rest and rolls without slipping down an incline of angle 30°. Take $g = 10$ m s⁻².</p>",
  hi: null,
};
const PARA: Bank[] = [
  {
    q: { type: "paragraph", stem: { en: "<p>The acceleration of the sphere along the incline, in m s⁻², is</p>", hi: null }, options: [opt("A", "$\\frac{25}{7}$"), opt("B", "$5$"), opt("C", "$\\frac{10}{3}$"), opt("D", "$\\frac{5}{2}$")] },
    key: { optionIds: ["oA"] },
    solution: "<p>For a solid sphere $\\frac{I}{mR^2} = \\frac{2}{5}$, so $a = \\frac{5}{7}g\\sin 30° = \\frac{5}{7} \\times 5 = \\frac{25}{7}$ m s⁻², option A. $\\frac{10}{3}$ is the answer for a solid cylinder.</p>",
  },
  {
    q: { type: "paragraph", stem: { en: "<p>The friction force on the sphere, in N, is</p>", hi: null }, options: [opt("A", "$\\frac{20}{7}$"), opt("B", "$5$"), opt("C", "$\\frac{10}{7}$"), opt("D", "$2$")] },
    key: { optionIds: ["oA"] },
    solution: "<p>$f = mg\\sin 30° - ma = 10 - \\frac{50}{7} = \\frac{20}{7}$ N, option A.</p>",
  },
  {
    q: { type: "paragraph", stem: { en: "<p>The speed of the sphere after it has rolled 1.4 m along the incline, in m s⁻¹, is</p>", hi: null }, options: [opt("A", "$\\sqrt{10}$"), opt("B", "$2$"), opt("C", "$\\sqrt{14}$"), opt("D", "$3$")] },
    key: { optionIds: ["oA"] },
    solution: "<p>$v^2 = 2as = 2 \\times \\frac{25}{7} \\times 1.4 = 10$, so $v = \\sqrt{10}$ m s⁻¹, option A.</p>",
  },
];

export interface PracticeFx {
  name: PracticeFxName;
  now: string;
  set: PracticeSetM6;
  keys: Record<number, { key: Key; solution: { en: string; hi: string | null } }>;
  /** questions shown as "hidden for now" (in a live test) */
  held: number[];
  /** the question to open first */
  start: number;
}

/** Grades an answer the way the tests service does (practice.ts gradePractice), plus matrix rows. */
export function gradeFx(type: string, key: Key, a: PracticeAnswer): PracticeCheck["outcome"] {
  if (type === "integer") {
    const v = Number(a.value.replace(",", "."));
    return key.range && v >= key.range.min && v <= key.range.max ? "correct" : "wrong";
  }
  if (type === "matrix") {
    const rows = Object.keys(key.matrix ?? {});
    const right = rows.filter((r) => sameSet(a.matrix[r] ?? [], key.matrix![r]!)).length;
    return right === rows.length ? "correct" : right > 0 ? "partial" : "wrong";
  }
  const right = new Set(key.optionIds ?? []);
  const chosen = new Set(a.optionIds);
  if (!chosen.size || [...chosen].some((o) => !right.has(o))) return "wrong";
  if (chosen.size === right.size) return "correct";
  return type === "multiple" ? "partial" : "wrong";
}
function sameSet(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((x) => b.includes(x));
}

export function fxCheck(fx: PracticeFx, q: PracticeQuestionM6, a: PracticeAnswer): PracticeCheckM6 {
  const k = fx.keys[q.n]!;
  return {
    outcome: gradeFx(q.type, k.key, a),
    yourAnswer: q.type === "integer" ? { value: Number(a.value.replace(",", ".")) } : q.type === "matrix" ? { matrix: a.matrix } : { optionIds: a.optionIds },
    correctAnswer: k.key,
    solution: k.solution,
  };
}

/** An answer that produces the board's sample outcome (for the pre-checked questions). */
function sample(b: Bank, right: boolean): PracticeAnswer {
  if (b.q.type === "integer") return { optionIds: [], value: right ? String(b.key.range!.min) : "8", matrix: {} };
  const ids = b.q.options.map((o) => o.id);
  return { optionIds: right ? (b.key.optionIds ?? []) : [ids.find((i) => !b.key.optionIds?.includes(i))!], value: "", matrix: {} };
}

export function practiceFixture(name: PracticeFxName, now: number): PracticeFx {
  const drill = name === "drill";
  const count = drill ? 10 : 12;
  const cycle = drill ? ["pcl", "so3"] : ["sphere", "disc", "ring"];
  const banks: Bank[] = Array.from({ length: count }, (_, i) => BANK[cycle[i % cycle.length]!]!);
  if (name === "multi") banks[5] = BANK.multi!;
  if (name === "num") banks[5] = BANK.num!;
  if (name === "mx") banks[5] = BANK.mx!;
  if (name === "para") [banks[5], banks[6], banks[7]] = PARA as [Bank, Bank, Bank];
  const fx: PracticeFx = {
    name,
    now: new Date(now).toISOString(),
    set: {
      id: "fx-set",
      title: drill ? "Chemical equilibrium · 10 questions" : "Rotational motion · 12 questions",
      createdAt: new Date(now - 1000).toISOString(),
      minutes: drill ? 10 : null,
      questions: [],
    },
    keys: {},
    held: name === "held" ? [7] : [],
    start: name === "finished" ? 12 : name === "held" ? 7 : drill ? 1 : 6,
  };
  banks.forEach((b, i) => {
    const n = i + 1;
    fx.keys[n] = { key: b.key, solution: { en: b.solution, hi: b.solutionHi ?? null } };
    const q: PracticeQuestionM6 = { ...b.q, n, questionId: `fx-q${n}`, checked: null };
    if (name === "para" && n >= 6 && n <= 8) q.set = { setId: "fx-passage", index: n - 6, count: 3, nFrom: 6, nTo: 8, passage: PASSAGE };
    fx.set.questions.push(q);
  });
  // Already checked: Practice Q1–Q5 (Q2 and Q3 wrong), Finished every question (Q2, Q3, Q9 wrong), held: Q6 too.
  const pre: Record<number, boolean> = drill
    ? {}
    : name === "finished"
      ? Object.fromEntries(Array.from({ length: 12 }, (_, i) => [i + 1, ![2, 3, 9].includes(i + 1)]))
      : { 1: true, 2: false, 3: false, 4: true, 5: true, ...(name === "held" ? { 6: true } : {}) };
  for (const [ns, right] of Object.entries(pre)) {
    const q = fx.set.questions[Number(ns) - 1]!;
    q.checked = fxCheck(fx, q, sample(banks[Number(ns) - 1]!, right));
  }
  return fx;
}
