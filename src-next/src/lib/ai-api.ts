// The M3 AI calls (post-test review): the leaks summary, "Why this happened" and its feedback.
// Contract: Iitpulse/api-ai docs/m3-ai-api.md; types in types/m3-ai.ts. Same envelope and errors as the M2 reads,
// so this rides on lib/student-api.ts's fetch client with the `/ai` base (`${NEXT_PUBLIC_API_GATEWAY}/ai`).
//
// Only the result and review screens import this file. The exam route group ((exam): /instructions, /test) must
// never import it: no AI on the exam, not even its code.
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isRetryable, request, StudentApiError } from "./student-api";
import type { AiErrorCode, ExplanationResponse, FeedbackResponse, SummaryResponse } from "@/types/m3-ai";

export const aiApi = {
  /** GET /ai/student/results/:testId/summary: the 1-3 biggest leaks */
  summary: (testId: string, signal?: AbortSignal) => request<SummaryResponse>("ai", `/student/results/${encodeURIComponent(testId)}/summary`, undefined, signal),
  /** GET /ai/student/results/:testId/questions/:n/explanation: "Why this happened" (n = the number the student saw) */
  explanation: (testId: string, n: number, signal?: AbortSignal) =>
    request<ExplanationResponse>("ai", `/student/results/${encodeURIComponent(testId)}/questions/${n}/explanation`, undefined, signal),
  /** POST /ai/student/explanations/:explanationId/feedback: "Was this helpful?" (the last answer wins) */
  feedback: (explanationId: string, helpful: boolean) =>
    request<FeedbackResponse>("ai", `/student/explanations/${encodeURIComponent(explanationId)}/feedback`, undefined, undefined, { helpful }),
};

export const aiKeys = {
  summary: (testId: string) => ["student", "ai", testId, "summary"] as const,
  explanation: (testId: string, n: number) => ["student", "ai", testId, "explanation", n] as const,
};

const AI_CODES: ReadonlySet<string> = new Set<AiErrorCode>(["AI_PAUSED", "AI_UNAVAILABLE", "AI_RATE_LIMITED"]);

/** The AI is paused, failed or rate limited: say so calmly, keep the rest of the page. */
export function isAiDown(err: unknown): boolean {
  return err instanceof StudentApiError && !!err.code && AI_CODES.has(err.code);
}

/** Retry only network errors and bare 5xx; never a coded answer (a paused AI stays paused on a second try). */
const aiRetry = (count: number, err: unknown) => count < 2 && isRetryable(err) && !(err instanceof StudentApiError && err.code);

/**
 * The contract's polling window: `setOver(true)` once `active` has stayed true for `ms`; back to false when `active`
 * drops or `round` changes (Try again). The flag lives in the caller's state because refetchInterval reads it.
 */
function usePollWindow(active: boolean, ms: number, setOver: (v: boolean) => void, round = 0) {
  useEffect(() => {
    if (!active) return;
    const t = setTimeout(() => setOver(true), ms);
    return () => {
      clearTimeout(t);
      setOver(false);
    };
  }, [active, ms, setOver, round]);
}

/**
 * True after the first paint has settled (idle, or 1 s at most): the AI summary waits for it, so the result's
 * hero is never behind an AI request.
 */
export function useAfterPaint(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void };
    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(() => setReady(true), { timeout: 1000 });
      return () => w.cancelIdleCallback?.(id);
    }
    const t = setTimeout(() => setReady(true), 300);
    return () => clearTimeout(t);
  }, []);
  return ready;
}

/** The leaks summary. "generating": poll every 3 s for up to 60 s, then `late` ("ready in a minute"). */
export function useAiSummary(testId: string, enabled: boolean) {
  const afterPaint = useAfterPaint();
  const [over, setOver] = useState(false);
  const query = useQuery({
    queryKey: aiKeys.summary(testId),
    queryFn: ({ signal }) => aiApi.summary(testId, signal),
    enabled: enabled && afterPaint,
    staleTime: (q) => (q.state.data?.status === "generating" ? 0 : 10 * 60_000),
    retry: aiRetry,
    refetchOnWindowFocus: (q) => q.state.data?.status === "generating",
    refetchInterval: (q) => (q.state.data?.status === "generating" && !over ? 3000 : false),
  });
  const generating = query.data?.status === "generating";
  usePollWindow(generating, 60_000, setOver);
  return { query, late: generating && over, waiting: enabled && !query.data && !query.error };
}

/**
 * One question's "Why this happened". "generating": poll every 2 s for up to 30 s, then `late` with Try again.
 * Explanations do not change once ready, so a ready one is kept for the session (no refetch on Next / Back).
 */
export function useAiExplanation(testId: string, n: number, enabled: boolean) {
  const [round, setRound] = useState(0);
  const [over, setOver] = useState(false);
  const query = useQuery({
    queryKey: aiKeys.explanation(testId, n),
    queryFn: ({ signal }) => aiApi.explanation(testId, n, signal),
    enabled,
    staleTime: (q) => (q.state.data?.status === "generating" ? 0 : 30 * 60_000),
    gcTime: 30 * 60_000,
    retry: aiRetry,
    refetchOnWindowFocus: false,
    refetchInterval: (q) => (q.state.data?.status === "generating" && !over ? 2000 : false),
  });
  const generating = query.data?.status === "generating";
  usePollWindow(generating, 30_000, setOver, round);
  const retry = () => {
    setRound((r) => r + 1);
    query.refetch();
  };
  return { query, late: generating && over, retry };
}

/** "Was this helpful? Yes / No": shows the choice at once, puts it back if the call fails. */
export function useAiFeedback(testId: string, n: number) {
  const client = useQueryClient();
  const key = aiKeys.explanation(testId, n);
  return useMutation({
    mutationFn: ({ id, helpful }: { id: string; helpful: boolean }) => aiApi.feedback(id, helpful),
    onMutate: ({ helpful }) => {
      const before = client.getQueryData<ExplanationResponse>(key);
      if (before) client.setQueryData<ExplanationResponse>(key, { ...before, myFeedback: helpful ? "helpful" : "not_helpful" });
      return { before };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.before) client.setQueryData(key, ctx.before);
    },
    onSuccess: (res) => {
      const cur = client.getQueryData<ExplanationResponse>(key);
      if (cur) client.setQueryData<ExplanationResponse>(key, { ...cur, myFeedback: res.myFeedback });
    },
  });
}
