"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth.store";
import { StudentApiError } from "@/lib/student-api";
import { cn } from "@/lib/utils";

/**
 * Start or resume a test: the NTA flow is unchanged (remember the test id, open /instructions). /instructions is
 * in the frozen (exam) root layout, so this is a full page load and no student-app state follows the student in.
 */
export function useStartTest() {
  const router = useRouter();
  const setTestId = useAuthStore((s) => s.setTestId);
  return useCallback(
    (testId: string) => {
      setTestId(testId);
      router.push("/instructions");
    },
    [router, setTestId]
  );
}

/** A loading block (.skel shimmers only while loading; reduced motion holds it still). */
export function Skel({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <span className={cn("skel block", className)} style={style} aria-hidden="true" />;
}

/** A failed load: the API's own sentence, and Retry when a second try can help. */
export function ErrorCard({ error, onRetry, className }: { error: unknown; onRetry?: () => void; className?: string }) {
  const e = error instanceof StudentApiError ? error : null;
  const retryable = !e || e.status === 0 || e.status >= 500;
  return (
    <div className={cn("card col items-start gap-3 p-6", className)} role="alert">
      <span className="h3">{e?.code === "STUDENTS_ONLY" ? "This page is for students" : "Couldn't load this"}</span>
      <span className="sm muted">{e?.message || "Something went wrong. Please try again."}</span>
      {retryable && onRetry && (
        <button type="button" className="btn btn-secondary btn-sm" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

/** Shown when the account has no batch yet (contract: student.batch null, every list empty). */
export function NoBatchCard({ className }: { className?: string }) {
  return (
    <div className={cn("card col items-center gap-2 p-12 text-center max-md:p-8", className)}>
      <span className="h3">You&apos;re not in a batch yet</span>
      <span className="sm muted">Your tests appear here once your institute adds you to a batch.</span>
    </div>
  );
}
