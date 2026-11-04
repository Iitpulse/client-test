"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/shell/icons";

/**
 * After submit the NTA exam opens /result (its route is unchanged). It forwards to /results/:testId, which shows
 * the published, pending or hidden result from the server. The exam stores the submitted test id in
 * localStorage.result; the submitted flag is cleared here so /test does not bounce back to /result.
 */
export default function ResultForward() {
  const router = useRouter();
  // Read once: React runs this effect twice in development, and the first run clears what it read.
  const target = useRef<string | null>(null);
  useEffect(() => {
    if (target.current) {
      router.replace(target.current);
      return;
    }
    let testId: string | undefined;
    try {
      const raw = localStorage.getItem("result");
      if (raw && raw.startsWith("{")) testId = (JSON.parse(raw) as { testId?: string }).testId;
    } catch {
      testId = undefined;
    }
    localStorage.removeItem("IITP_TEST_SUBMITTED_KEY");
    localStorage.removeItem("result");
    target.current = testId ? `/results/${encodeURIComponent(testId)}` : "/tests?tab=completed";
    router.replace(target.current);
  }, [router]);

  return (
    <div className="col min-h-dvh items-center justify-center gap-3 text-brand" role="status">
      <Spinner size={28} />
      <span className="sm muted">Test submitted. Opening your result…</span>
    </div>
  );
}
