// Typed fixtures for the batch 5 doubt states (Student-Doubts, Phone-Doubts, Phone-Doubt) that dev data can't reach
// on demand: a daily limit, a refused or failed answer, a dropped stream, a locked test, a full thread. Read only
// through lib/fixtures.ts (`?fixture=<state>`, never in production). Shapes are the M4 contract (types/m4.ts).
import type { DoubtsPage } from "./m4-api";
import type { DoubtMessage, DoubtQuota, DoubtThread, DoubtThreadSummary } from "@/types/m4";

export type DoubtFxState =
  | "threads"
  | "empty"
  | "daily"
  | "attempts"
  | "full"
  | "refused"
  | "failed"
  | "drop"
  | "drop-retry"
  | "error"
  | "locked"
  | "loading"
  | "offline"
  | "near"
  | "over";

export const DOUBT_FX_STATES: DoubtFxState[] = ["threads", "empty", "daily", "attempts", "full", "refused", "failed", "drop", "drop-retry", "error", "locked", "loading", "offline", "near", "over"];

/** The api-ai fixed ending of a refused or failed answer (docs/m4-api.md). */
export const FIXED_ENDING = "Sorry, I couldn't answer that one. It didn't count towards today's 20.";

export interface DoubtFx {
  state: DoubtFxState;
  page: DoubtsPage;
  threads: Record<string, DoubtThread>;
  /** draft text put in the input (near / over 600, offline) */
  draft: string;
  /** the composer behaves as offline (also reachable by really going offline) */
  offline: boolean;
}

const NEAR =
  "In the rod question I get that the torque is F·L/2 because the force acts at the midpoint, but I am stuck on the moment of inertia. My teacher used mL²/3 for a rod pivoted at one end, and in another question we used mL²/12. How do I know which one to use? Is it only about where the pivot is, or does it also depend on where the force acts? And if the rod was not uniform, say heavier towards the free end, would the angular acceleration be more or less than 3F/2mL? Please go through the parallel axis theorem step by step so I can see where each term comes from.";

let seq = 0;
function msg(role: DoubtMessage["role"], text: string, at: number, finish: DoubtMessage["finish"] = role === "tutor" ? "stop" : null): DoubtMessage {
  return { id: `fx-${++seq}`, role, kind: "text", text, question: null, finish, createdAt: new Date(at).toISOString() };
}

const META: Array<Omit<DoubtThreadSummary, "updatedAt" | "lastMessagePreview" | "turns"> & { ago: number; chat: Array<[DoubtMessage["role"], string]> }> = [
  {
    id: "fx-t1",
    testId: "fx-mock-11",
    testName: "JEE Main Mock 11",
    testShortName: "Mock 11",
    n: 12,
    shownAs: 12,
    questionPreview: "A uniform rod of mass $m$ and length $L$ is pivoted at one end. A force $F$ acts perpendicular to the rod at its midpoint…",
    ago: 2 * 3600_000,
    chat: [
      ["student", "Why not use the full length as the lever arm?"],
      ["tutor", "Torque uses the distance from the pivot to where the force acts.\nHere the force acts at the midpoint, which is $L/2$ from the pivot, so $\\tau = F \\cdot L/2$."],
    ],
  },
  {
    id: "fx-t2",
    testId: "fx-mock-11",
    testName: "JEE Main Mock 11",
    testShortName: "Mock 11",
    n: 27,
    shownAs: 27,
    questionPreview: "For $\\mathrm{N_2(g) + 3H_2(g) \\rightleftharpoons 2NH_3(g)}$ at equilibrium, increasing the total pressure at constant temperature will…",
    ago: 6 * 3600_000,
    chat: [
      ["student", "Why doesn’t Kp change when the pressure goes up?"],
      ["tutor", "$K_p$ depends only on temperature.\nRaising the pressure shifts the mixture towards $\\mathrm{NH_3}$, and at the new equilibrium the partial pressures still give the same $K_p$."],
      ["student", "हिन्दी में समझाएं"],
      ["tutor", "$K_p$ केवल ताप पर निर्भर करता है।\nदाब बढ़ाने पर साम्य $\\mathrm{NH_3}$ की ओर खिसकता है, पर नए साम्य पर आंशिक दाबों से $K_p$ का मान वही आता है।"],
    ],
  },
  {
    id: "fx-t3",
    testId: "fx-mock-11",
    testName: "JEE Main Mock 11",
    testShortName: "Mock 11",
    n: 55,
    shownAs: 55,
    questionPreview: "The value of $\\int_0^{\\pi/2} \\frac{\\sin x}{\\sin x + \\cos x}\\,dx$ is…",
    ago: 26 * 3600_000,
    chat: [
      ["student", "Is there a faster way than substitution?"],
      ["tutor", "Yes. Use $\\int_0^a f(x)\\,dx = \\int_0^a f(a-x)\\,dx$.\nReplacing $x$ with $\\pi/2 - x$ turns the integrand into $\\frac{\\cos x}{\\cos x + \\sin x}$. Adding the two forms gives $2I = \\pi/2$, so $I = \\pi/4$."],
    ],
  },
  {
    id: "fx-t4",
    testId: "fx-mock-10",
    testName: "JEE Main Mock 10",
    testShortName: "Mock 10",
    n: 19,
    shownAs: 19,
    questionPreview: "A block of mass $m$ rests on a rough incline of angle $\\theta$. The friction force on the block is…",
    ago: 3 * 86_400_000,
    chat: [
      ["student", "Why isn’t friction μmg cos θ here?"],
      ["tutor", "The block is at rest, so friction is static and only as large as it needs to be.\nIt balances the pull down the slope: $f = mg\\sin\\theta$. $\\mu mg\\cos\\theta$ is the most it can be, not what it is."],
    ],
  },
  {
    id: "fx-t5",
    testId: "fx-phy-3",
    testName: "Physics Sectional 3",
    testShortName: "Physics Sectional 3",
    n: 8,
    shownAs: 8,
    questionPreview: "Two point charges $+q$ and $-q$ are a distance $d$ apart. The electric field at the midpoint is…",
    ago: 16 * 86_400_000,
    chat: [
      ["student", "Why do the two fields add at the midpoint?"],
      ["tutor", "The field of $+q$ points away from it, towards $-q$. The field of $-q$ points towards $-q$ as well.\nBoth point the same way, so $E = 2 \\cdot \\frac{kq}{(d/2)^2} = \\frac{8kq}{d^2}$."],
    ],
  },
];

/** IST midnight after `now` (the daily reset). */
function nextMidnightIst(now: number): string {
  const IST = 5.5 * 3600_000;
  const d = new Date(now + IST);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1) - IST).toISOString();
}

export function doubtFixture(state: DoubtFxState, now: number): DoubtFx {
  seq = 0;
  const left = state === "empty" ? 20 : state === "daily" ? 0 : state === "attempts" ? 7 : 18;
  const quota = (leftInThread: number | null): DoubtQuota => ({ leftToday: left, perDay: 20, leftInThread, resetsAt: nextMidnightIst(now) });
  const threads: Record<string, DoubtThread> = {};
  const items: DoubtThreadSummary[] = [];
  for (const m of META) {
    const at = now - m.ago;
    const messages = m.chat.map(([role, text], i) => msg(role, text, at - (m.chat.length - i) * 60_000));
    if (m.id === "fx-t1") {
      const extra: DoubtMessage[] =
        state === "refused"
          ? [msg("student", "Can you help me with my English essay?", at), msg("tutor", FIXED_ENDING, at, "refused")]
          : state === "failed"
            ? [msg("student", "Explain it another way", at), msg("tutor", FIXED_ENDING, at, "failed")]
            : state === "drop" || state === "drop-retry"
              ? [msg("student", "Pivot at the centre?", at), msg("tutor", "Then $I = mL^2/12$, and a force at the end has lever arm $L/2$.\n$\\alpha = (FL/2) \\div$", at, null)]
              : [];
      messages.push(...extra);
    }
    const asked = messages.filter((x) => x.role === "student").length;
    const turnsLeft = state === "full" && m.id === "fx-t1" ? 0 : 15 - asked;
    const { ago: _ago, chat: _chat, ...base } = m;
    const summary: DoubtThreadSummary = {
      ...base,
      updatedAt: new Date(at).toISOString(),
      lastMessagePreview: [...messages].reverse().find((x) => x.role === "tutor")?.text.split("\n")[0] ?? "",
      turns: asked,
    };
    items.push(summary);
    threads[m.id] = { summary, messages, quota: quota(turnsLeft), suggestions: [{ kind: "similar", label: "Similar question" }, { kind: "hindi", label: "हिन्दी में समझाएं" }, { kind: "followUp", label: m.id === "fx-t1" ? "Pivot at the centre?" : "Explain it another way" }] };
  }
  return {
    state,
    page: { now: new Date(now).toISOString(), items: state === "empty" ? [] : items, nextCursor: null, quota: quota(null) },
    threads,
    draft: state === "near" ? NEAR : state === "over" ? `${NEAR} Also give me one more question like this to practise.` : state === "offline" ? "What if the force acts at the free end?" : "",
    offline: state === "offline",
  };
}

/** A canned reply for a message sent in fixture mode (no API call). */
export function fixtureReply(text: string): string {
  if (text === "हिन्दी में समझाएं") return "बल मध्य बिंदु पर लगता है, इसलिए आघूर्ण भुजा $L/2$ है।\n$\\tau = F \\cdot L/2$, $I = mL^2/3$, अतः $\\alpha = 3F/2mL$।";
  if (text === "Pivot at the centre?") return "Then $I = mL^2/12$, and a force at the end has lever arm $L/2$.\n$\\alpha = (FL/2) \\div (mL^2/12) = 6F/mL$.";
  return "Start from what the question fixes: the pivot and where the force acts. Measure $r$ from the pivot, then use $I$ for that axis. Which step feels unclear?";
}

/** The `?fixture=` value as a doubt state, or null. */
export function asDoubtFxState(v: string | null): DoubtFxState | null {
  return v && (DOUBT_FX_STATES as string[]).includes(v) ? (v as DoubtFxState) : null;
}
