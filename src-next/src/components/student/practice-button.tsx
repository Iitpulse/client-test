"use client";

import { useRouter } from "next/navigation";
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

/** The three reasons a set can't be made that get their own page (Student-Practice / Phone-Practice states). */
const PAGE_CODES = new Set(["NO_PRACTICE_QUESTIONS", "PRACTICE_LIMIT", "PRACTICE_UNAVAILABLE"]);

/** /practice/new?problem=…: the request rides along so "Try again" can send it again. */
export function problemHref(req: PracticeRequest, e: StudentApiError): string {
  const p = new URLSearchParams({ problem: String(e.code), chapter: req.chapter, count: String(req.count) });
  if (req.subject) p.set("subject", req.subject);
  if (req.topic) p.set("topic", req.topic);
  if (req.minutes) p.set("minutes", String(req.minutes));
  if (typeof e.details?.resetsAt === "string") p.set("resetsAt", e.details.resetsAt);
  return `/practice/new?${p.toString()}`;
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
  const router = useRouter();
  const start = () =>
    m.mutate(req, {
      onError: (e) => {
        if (e instanceof StudentApiError && e.code && PAGE_CODES.has(e.code)) router.push(problemHref(req, e));
      },
    });
  const pageProblem = m.error instanceof StudentApiError && !!m.error.code && PAGE_CODES.has(m.error.code);
  return (
    <span className={cn("col items-start gap-1.5", wrapClassName)}>
      <button type="button" className={className} disabled={m.isPending || m.isSuccess} aria-busy={m.isPending || undefined} onClick={start}>
        {(m.isPending || m.isSuccess) && <Spinner size={14} />}
        {label}
      </button>
      {m.isError && !pageProblem && (
        <span className="xs muted" role="status">
          {practiceProblem(m.error, req.chapter, now)}
        </span>
      )}
    </span>
  );
}
