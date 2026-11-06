import type { Metadata } from "next";
import "@/app/m4.css";
import "katex/dist/katex.min.css"; // questions and solutions render with MathText (KaTeX)
import { PracticeView, type PracticeProblem } from "@/components/student/practice-view";

export const metadata: Metadata = { title: "Practice · IIT-PULSE" };

const CODES = ["NO_PRACTICE_QUESTIONS", "PRACTICE_LIMIT", "PRACTICE_UNAVAILABLE"] as const;
type Q = Record<string, string | string[] | undefined>;
const one = (q: Q, k: string) => (typeof q[k] === "string" ? (q[k] as string) : undefined);

// A practice set (M4), made from Progress or the study plan. /practice/new?problem=… says why a set couldn't be made
// (practice-button.tsx); its query holds the request so "Try again" can send it again.
export default async function PracticePage({ params, searchParams }: { params: Promise<{ setId: string }>; searchParams: Promise<Q> }) {
  const { setId } = await params;
  const q = await searchParams;
  const code = one(q, "problem");
  const chapter = one(q, "chapter");
  const count = Number(one(q, "count"));
  const minutes = Number(one(q, "minutes"));
  const problem: PracticeProblem | null =
    setId === "new" && code && (CODES as readonly string[]).includes(code) && chapter
      ? {
          code: code as PracticeProblem["code"],
          req: {
            chapter,
            count: Number.isInteger(count) && count > 0 ? Math.min(count, 20) : 10,
            ...(one(q, "subject") ? { subject: one(q, "subject") } : {}),
            ...(one(q, "topic") ? { topic: one(q, "topic") } : {}),
            ...(Number.isFinite(minutes) && minutes > 0 ? { minutes } : {}),
          },
          resetsAt: one(q, "resetsAt") ?? null,
        }
      : null;
  return <PracticeView setId={setId} problem={problem} />;
}
