"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore, useTestStore } from "@/stores";
import { api, type AvailableTest } from "@/lib/api";

const STATE_LABEL: Record<AvailableTest["state"], { text: string; className: string }> = {
  live: { text: "Live now", className: "bg-green-100 text-green-800" },
  in_progress: { text: "In progress", className: "bg-amber-100 text-amber-800" },
  upcoming: { text: "Upcoming", className: "bg-blue-100 text-blue-800" },
  submitted: { text: "Submitted", className: "bg-gray-200 text-gray-700" },
  ended: { text: "Ended", className: "bg-gray-200 text-gray-700" },
};

function formatWhen(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function TestsPage() {
  const router = useRouter();
  const { checkAuth, isAuthenticated, currentUser, setTestId, logout } = useAuthStore();
  const { reset } = useTestStore();
  const [tests, setTests] = useState<AvailableTest[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const response = await api.tests.getAvailable();
      setTests(response.data?.data ?? []);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e?.response?.data?.message || "Could not load your tests. Please try again.");
      setTests([]);
    }
  }, []);

  useEffect(() => {
    if (!checkAuth() || !isAuthenticated) {
      router.push("/login");
      return;
    }
    load();
  }, [checkAuth, isAuthenticated, router, load]);

  const open = (test: AvailableTest) => {
    reset(); // drop any previously loaded test so instructions fetch this one
    setTestId(test._id);
    router.push("/instructions");
  };

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="flex items-center justify-between px-4 py-2 border-b bg-white">
        <span className="text-2xl font-bold text-blue-600">IIT Pulse</span>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-gray-600">{currentUser?.email}</span>
          <button
            type="button"
            onClick={() => {
              logout();
              router.push("/login");
            }}
            className="px-3 py-1 border rounded hover:bg-gray-50"
          >
            Log out
          </button>
        </div>
      </header>

      <main className="flex-1 w-full max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-xl font-semibold mb-1">Your tests</h1>
        <p className="text-sm text-gray-500 mb-6">Tests assigned to your batch. A test can be started between its start and end time.</p>

        {tests === null && <p className="text-gray-500">Loading tests…</p>}
        {error && (
          <div className="rounded border border-red-200 bg-red-50 p-4 text-red-700 mb-4">
            {error}
            <button type="button" onClick={load} className="ml-3 underline">
              Retry
            </button>
          </div>
        )}
        {tests !== null && tests.length === 0 && !error && (
          <div className="rounded border border-dashed p-8 text-center text-gray-500">
            No tests are scheduled for your batch right now. Check back later or ask your institute.
          </div>
        )}

        <ul className="space-y-3">
          {(tests ?? []).map((t) => {
            const label = STATE_LABEL[t.state];
            const canOpen = t.state === "live" || t.state === "in_progress";
            const examName = typeof t.exam === "string" ? t.exam : t.exam?.name;
            return (
              <li key={t._id} className="rounded-lg border p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-medium">{t.name}</h2>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${label.className}`}>{label.text}</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {[examName, `${t.totalQuestions} questions`, `${t.durationInMinutes} min`, t.totalMarks ? `${t.totalMarks} marks` : null]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatWhen(t.validity.from)} to {formatWhen(t.validity.to)}
                  </p>
                </div>
                {t.state === "submitted" ? (
                  t.result?.visible ? (
                    <button type="button" onClick={() => router.push(`/results/${t._id}`)} className="px-4 py-2 rounded border border-blue-600 text-blue-700 text-sm font-medium hover:bg-blue-50">
                      View result
                    </button>
                  ) : (
                    <span className="text-xs text-gray-500 sm:text-right max-w-[180px]" title={t.result?.reason}>
                      {t.result?.availableAt
                        ? `Result on ${formatWhen(t.result.availableAt)}`
                        : t.result?.reason || "Result not published yet"}
                    </span>
                  )
                ) : (
                  <button
                    type="button"
                    disabled={!canOpen}
                    onClick={() => open(t)}
                    className="px-4 py-2 rounded bg-blue-600 text-white text-sm font-medium disabled:bg-gray-300 disabled:text-gray-600"
                  >
                    {t.state === "in_progress" ? "Resume" : t.state === "upcoming" ? "Not started" : t.state === "ended" ? "Ended" : "Start"}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </main>
    </div>
  );
}
