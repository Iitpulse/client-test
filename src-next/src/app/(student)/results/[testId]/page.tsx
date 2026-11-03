"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuthStore, useAuthHydrated } from "@/stores";
import { api, type StudentResult } from "@/lib/api";
import { RenderLatex } from "@/components/render-latex";

type Option = { id: string; value: string };
type Question = {
  _id: string;
  type?: string;
  en?: { question?: string; options?: Option[]; solution?: string };
  correctAnswers?: string[];
  correctAnswer?: { from?: number; to?: number };
};
type SubSection = { id: string; name?: string; type?: string; questions?: Question[]; markingScheme?: { correct?: number[]; incorrect?: number } };
type Section = { id: string; name?: string; subSections?: SubSection[] };
type Response = { selectedOptions?: string[]; enteredAnswer?: number | string; marks?: number; status?: string; timeTakenInSeconds?: number };
type SubmissionSubSection = { id: string; questions?: Record<string, Response> | Array<Response & { id: string }> };
type SubmissionSection = { id: string; subSections?: SubmissionSubSection[] };

function responseFor(sub: StudentResult["submission"], sectionId: string, subSectionId: string, questionId: string): Response | undefined {
  const sections = (sub.sections || []) as SubmissionSection[];
  const ss = sections.find((s) => s.id === sectionId)?.subSections?.find((x) => x.id === subSectionId);
  if (!ss?.questions) return undefined;
  if (Array.isArray(ss.questions)) return ss.questions.find((q) => q.id === questionId);
  return ss.questions[questionId];
}

export default function StudentResultPage() {
  const router = useRouter();
  const params = useParams();
  const testId = params.testId as string;
  const { checkAuth, isAuthenticated } = useAuthStore();
  const [result, setResult] = useState<StudentResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSolutions, setShowSolutions] = useState(false);
  // Wait for the persisted test id / session to be restored (SSR-safe)
  const hydrated = useAuthHydrated();

  useEffect(() => {
    if (!hydrated) return;
    if (!checkAuth() || !isAuthenticated) {
      router.push("/login");
      return;
    }
    api.tests
      .getResult(testId)
      .then((r) => setResult(r.data?.data ?? null))
      .catch((err: unknown) => {
        const e = err as { response?: { data?: { message?: string } } };
        setError(e?.response?.data?.message || "Could not load this result.");
      });
  }, [hydrated, checkAuth, isAuthenticated, router, testId]);

  const sections = useMemo(() => {
    if (!result) return [];
    const out: Array<{ name: string; marks: number; max: number; correct: number; wrong: number; skipped: number; questions: Array<{ n: number; q: Question; r?: Response; max: number }> }> = [];
    let n = 0;
    for (const section of (result.test.sections || []) as Section[]) {
      const row = { name: section.name || "Section", marks: 0, max: 0, correct: 0, wrong: 0, skipped: 0, questions: [] as Array<{ n: number; q: Question; r?: Response; max: number }> };
      for (const ss of section.subSections || []) {
        const max = Math.max(...(ss.markingScheme?.correct || [1]));
        for (const q of ss.questions || []) {
          n++;
          const r = responseFor(result.submission, section.id, ss.id, q._id);
          const marks = r?.marks ?? 0;
          row.marks += marks;
          row.max += max;
          const answered = (r?.selectedOptions?.length ?? 0) > 0 || (r?.enteredAnswer !== undefined && r?.enteredAnswer !== "");
          if (!answered) row.skipped++;
          else if (marks > 0) row.correct++;
          else row.wrong++;
          row.questions.push({ n, q, r, max });
        }
      }
      out.push(row);
    }
    return out;
  }, [result]);

  const total = sections.reduce((a, s) => a + s.marks, 0);
  const totalMax = sections.reduce((a, s) => a + s.max, 0);

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="flex items-center justify-between px-4 py-2 border-b bg-white">
        <span className="text-2xl font-bold text-blue-600">IIT Pulse</span>
        <button type="button" onClick={() => router.push("/tests")} className="px-3 py-1 border rounded text-sm hover:bg-gray-50">
          Back to your tests
        </button>
      </header>
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-8">
        {error && (
          <div className="rounded border border-amber-200 bg-amber-50 p-4 text-amber-900">
            <p className="font-medium">{error}</p>
          </div>
        )}
        {!error && !result && <p className="text-gray-500">Loading result…</p>}
        {result && (
          <>
            <h1 className="text-xl font-semibold">{result.test.name}</h1>
            <p className="text-sm text-gray-500 mb-6">
              Submitted {result.submission.submittedAt ? new Date(result.submission.submittedAt).toLocaleString() : ""}
              {result.totalTimeTaken ? ` · ${Math.round(result.totalTimeTaken / 60)} min` : ""}
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <div className="rounded-lg border p-4">
                <p className="text-xs uppercase text-gray-500">Score</p>
                <p className="text-2xl font-bold">
                  {total} <span className="text-base font-normal text-gray-500">/ {totalMax}</span>
                </p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-xs uppercase text-gray-500">Correct</p>
                <p className="text-2xl font-bold text-green-700">{sections.reduce((a, s) => a + s.correct, 0)}</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-xs uppercase text-gray-500">Wrong</p>
                <p className="text-2xl font-bold text-red-700">{sections.reduce((a, s) => a + s.wrong, 0)}</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-xs uppercase text-gray-500">Skipped</p>
                <p className="text-2xl font-bold text-gray-600">{sections.reduce((a, s) => a + s.skipped, 0)}</p>
              </div>
            </div>

            <h2 className="font-semibold mb-2">Sections</h2>
            <div className="overflow-x-auto rounded-lg border mb-8">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left">
                  <tr>
                    <th className="p-2">Section</th>
                    <th className="p-2 text-right">Marks</th>
                    <th className="p-2 text-right">Correct</th>
                    <th className="p-2 text-right">Wrong</th>
                    <th className="p-2 text-right">Skipped</th>
                  </tr>
                </thead>
                <tbody>
                  {sections.map((s) => (
                    <tr key={s.name} className="border-t">
                      <td className="p-2">{s.name}</td>
                      <td className="p-2 text-right font-medium">
                        {s.marks} / {s.max}
                      </td>
                      <td className="p-2 text-right">{s.correct}</td>
                      <td className="p-2 text-right">{s.wrong}</td>
                      <td className="p-2 text-right">{s.skipped}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold">Answer review</h2>
              <label className="text-sm flex items-center gap-2">
                <input type="checkbox" checked={showSolutions} onChange={(e) => setShowSolutions(e.target.checked)} />
                Show solutions
              </label>
            </div>
            <div className="space-y-4">
              {sections.flatMap((s) =>
                s.questions.map(({ n, q, r, max }) => {
                  const chosen = new Set(r?.selectedOptions || []);
                  const correct = new Set(q.correctAnswers || []);
                  const marks = r?.marks ?? 0;
                  const answered = chosen.size > 0 || (r?.enteredAnswer !== undefined && r?.enteredAnswer !== "");
                  const tone = !answered ? "border-gray-200" : marks > 0 ? "border-green-300" : "border-red-300";
                  return (
                    <div key={q._id} className={`rounded-lg border ${tone} p-4`}>
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <span className="text-sm font-semibold">Q{n}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${!answered ? "bg-gray-100 text-gray-700" : marks > 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                          {!answered ? "Skipped" : marks > 0 ? `Correct +${marks}` : `Wrong ${marks}`} · max {max}
                        </span>
                      </div>
                      <RenderLatex content={q.en?.question || ""} />
                      {q.en?.options?.length ? (
                        <ul className="mt-2 space-y-1">
                          {q.en.options.map((o, i) => {
                            const isCorrect = correct.has(o.id);
                            const isChosen = chosen.has(o.id);
                            return (
                              <li key={o.id} className={`flex gap-2 rounded px-2 py-1 text-sm ${isCorrect ? "bg-green-50" : isChosen ? "bg-red-50" : ""}`}>
                                <span className="font-medium w-5">{String.fromCharCode(65 + i)}.</span>
                                <span className="flex-1 min-w-0">
                                  <RenderLatex content={o.value} />
                                </span>
                                <span className="text-xs text-gray-500">{isCorrect && isChosen ? "your answer, correct" : isCorrect ? "correct" : isChosen ? "your answer" : ""}</span>
                              </li>
                            );
                          })}
                        </ul>
                      ) : (
                        <p className="mt-2 text-sm">
                          Your answer: <strong>{answered ? String(r?.enteredAnswer) : "—"}</strong>
                          {q.correctAnswer && (
                            <>
                              {" "}
                              · Correct: <strong>{q.correctAnswer.from === q.correctAnswer.to ? q.correctAnswer.from : `${q.correctAnswer.from} to ${q.correctAnswer.to}`}</strong>
                            </>
                          )}
                        </p>
                      )}
                      {showSolutions && q.en?.solution && (
                        <div className="mt-3 rounded bg-gray-50 p-3 text-sm">
                          <p className="text-xs uppercase text-gray-500 mb-1">Solution</p>
                          <RenderLatex content={q.en.solution} />
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
