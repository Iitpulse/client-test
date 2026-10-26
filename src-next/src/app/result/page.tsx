"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTestStore } from "@/stores";
import { CheckCircle2 } from "lucide-react";

interface StoredOutcome {
  testId?: string;
  totalMarks?: number;
  resultVisible: boolean;
  resultReason?: string;
  resultAvailableAt?: string;
}

function readOutcome(): StoredOutcome | null {
  try {
    const raw = localStorage.getItem("result");
    if (!raw) return null;
    if (raw.startsWith("{")) return JSON.parse(raw) as StoredOutcome;
    return { totalMarks: Number(raw), resultVisible: true }; // older format: just the score
  } catch {
    return null;
  }
}

export default function ResultPage() {
  const router = useRouter();
  const { reset } = useTestStore();
  const [outcome, setOutcome] = useState<StoredOutcome | null>(null);
  const [countdown, setCountdown] = useState(15);

  useEffect(() => {
    const isSubmitted = localStorage.getItem("IITP_TEST_SUBMITTED_KEY") === "true";
    if (!isSubmitted) {
      router.push("/tests");
      return;
    }
    setOutcome(readOutcome());
  }, [router]);

  useEffect(() => {
    const timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const leave = (to: string) => {
    localStorage.removeItem("IITP_TEST_SUBMITTED_KEY");
    localStorage.removeItem("result");
    reset();
    router.push(to);
  };

  useEffect(() => {
    if (countdown < 1) leave("/tests");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countdown]);

  const availableAt = outcome?.resultAvailableAt ? new Date(outcome.resultAvailableAt) : null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-lg border bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <CheckCircle2 className="h-8 w-8 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Test submitted</h1>
        <p className="text-gray-600 mb-6">Your answers have been recorded.</p>

        {outcome?.resultVisible && typeof outcome.totalMarks === "number" ? (
          <div className="rounded-md bg-gray-100 p-4 mb-6">
            <p className="text-sm text-gray-500">Your score</p>
            <p className="text-3xl font-bold">{outcome.totalMarks}</p>
          </div>
        ) : (
          <div className="rounded-md bg-blue-50 p-4 mb-6 text-blue-900">
            <p className="font-medium">{outcome?.resultReason || "Results will be published later"}</p>
            {availableAt && !Number.isNaN(availableAt.getTime()) && (
              <p className="text-sm mt-1">
                Available from {availableAt.toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
              </p>
            )}
            <p className="text-sm mt-2 text-blue-800">You will find it under <strong>Your tests</strong> when it is ready.</p>
          </div>
        )}

        <div className="flex flex-col gap-2">
          {outcome?.resultVisible && outcome.testId && (
            <button type="button" onClick={() => leave(`/results/${outcome.testId}`)} className="w-full rounded bg-blue-600 px-4 py-2 text-white font-medium">
              View detailed result
            </button>
          )}
          <button type="button" onClick={() => leave("/tests")} className="w-full rounded border px-4 py-2 font-medium">
            Back to your tests
          </button>
        </div>
        <p className="mt-4 text-xs text-gray-400">Returning to your tests in {Math.max(countdown, 0)}s</p>
      </div>
    </div>
  );
}
