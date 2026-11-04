"use client";

import { useStartPractice } from "@/lib/m4-api";
import { StudentApiError } from "@/lib/student-api";
import { resetsAt } from "@/lib/time";
import type { PracticeRequest } from "@/types/m4";
import { Spinner } from "@/components/shell/icons";
import { cn } from "@/lib/utils";
import { sentence } from "./labels";

/** Why a practice set could not be made, in a sentence a student can act on. */
export function practiceProblem(err: unknown, chapter: string, now: number): string {
  const e = err instanceof StudentApiError ? err : null;
  if (e?.code === "NO_PRACTICE_QUESTIONS") return `No new questions are left for ${chapter} right now. Try another chapter, or ask your teacher to add some.`;
  if (e?.code === "PRACTICE_LIMIT") {
    const at = typeof e.details?.resetsAt === "string" ? e.details.resetsAt : null;
    return `That's 30 practice sets today, the most for one day.${at ? ` You can make more ${resetsAt(now, at)}.` : " You can make more tomorrow."}`;
  }
  return sentence(e?.message || "Couldn't make the practice set. Please try again");
}

/**
 * A button that makes a practice set (POST /tests/student/practice) and opens it: "Practice 12 questions",
 * "Timed drill · 10 min", a plan item's "Start". The problem, if any, shows under it.
 */
export function PracticeButton({
  req,
  label,
  now,
  className = "btn btn-secondary btn-sm",
  wrapClassName,
}: {
  req: PracticeRequest;
  label: React.ReactNode;
  now: number;
  className?: string;
  wrapClassName?: string;
}) {
  const m = useStartPractice();
  return (
    <span className={cn("col items-start gap-1.5", wrapClassName)}>
      <button type="button" className={className} disabled={m.isPending || m.isSuccess} aria-busy={m.isPending || undefined} onClick={() => m.mutate(req)}>
        {(m.isPending || m.isSuccess) && <Spinner size={14} />}
        {label}
      </button>
      {m.isError && (
        <span className="xs muted" role="status">
          {practiceProblem(m.error, req.chapter, now)}
        </span>
      )}
    </span>
  );
}
