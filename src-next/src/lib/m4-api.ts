// M4 calls: progress and practice (/tests), the profile (/users), the study plan and doubt threads (/ai).
// Contract: Iitpulse/api-ai docs/m4-api.md; types in types/m4.ts. Same envelope and errors as M2 / M3, so this rides
// on lib/student-api.ts's fetch client. The doubt answer stream is lib/doubt-stream.ts.
//
// Only the signed-in student screens import this file; the exam route group ((exam): /instructions, /test) never does.
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { aiRetry, usePollWindow } from "./ai-api";
import { request, StudentApiError } from "./student-api";
import type {
  DoubtQuota,
  DoubtThread,
  DoubtThreadSummary,
  PasswordChange,
  PracticeCheck,
  PracticeRequest,
  PracticeSet,
  ProgressRange,
  ProgressResponse,
  StudentProfile,
  StudentProfilePatch,
  StudyPlanItem,
  StudyPlanResponse,
} from "@/types/m4";

type Now = { now: string };
const enc = encodeURIComponent;

export interface DoubtsPage extends Now {
  items: DoubtThreadSummary[];
  nextCursor: string | null;
  quota: DoubtQuota;
}

export const m4Api = {
  progress: (range: ProgressRange, signal?: AbortSignal) => request<ProgressResponse>("tests", "/student/progress", { range }, signal),
  practiceCreate: (body: PracticeRequest) => request<Now & { set: PracticeSet }>("tests", "/student/practice", undefined, undefined, body),
  practice: (setId: string, signal?: AbortSignal) => request<Now & { set: PracticeSet }>("tests", `/student/practice/${enc(setId)}`, undefined, signal),
  practiceCheck: (setId: string, n: number, body: { optionIds?: string[]; value?: number }) =>
    request<Now & { check: PracticeCheck }>("tests", `/student/practice/${enc(setId)}/questions/${n}/check`, undefined, undefined, body),

  me: (signal?: AbortSignal) => request<Now & { profile: StudentProfile }>("users", "/student/me", undefined, signal),
  patchMe: (patch: StudentProfilePatch) => request<Now & { profile: StudentProfile }>("users", "/student/me", undefined, undefined, patch, "PATCH"),
  password: (body: PasswordChange) => request<Now & { changed: true }>("users", "/student/me/password", undefined, undefined, body),

  studyPlan: (signal?: AbortSignal) => request<StudyPlanResponse>("ai", "/student/study-plan", undefined, signal),
  planAction: (action: "lighter" | "rebuild") => request<StudyPlanResponse>("ai", `/student/study-plan/${action}`, undefined, undefined, {}),
  tick: (itemId: string, done: boolean) => request<Now & { item: StudyPlanItem }>("ai", `/student/study-plan/items/${enc(itemId)}`, undefined, undefined, { done }, "PATCH"),

  doubts: (cursor: string | null, signal?: AbortSignal) => request<DoubtsPage>("ai", "/student/doubts", { cursor }, signal),
  doubtOpen: (testId: string, n: number) => request<Now & { thread: DoubtThread }>("ai", "/student/doubts", undefined, undefined, { testId, n }),
  doubt: (threadId: string, signal?: AbortSignal) => request<Now & { thread: DoubtThread }>("ai", `/student/doubts/${enc(threadId)}`, undefined, signal),
};

export const m4Keys = {
  progress: (range: ProgressRange) => ["student", "progress", range] as const,
  practice: (setId: string) => ["student", "practice", setId] as const,
  me: ["student", "me"] as const,
  plan: ["student", "study-plan"] as const,
  doubts: ["student", "doubts"] as const,
  doubtsPages: ["student", "doubts", "pages"] as const,
  doubt: (threadId: string) => ["student", "doubt", threadId] as const,
};

/** The study plan. "generating": poll every 3 s for up to 60 s, then `late`. */
export function useStudyPlan() {
  const [over, setOver] = useState(false);
  const [round, setRound] = useState(0);
  const query = useQuery({
    queryKey: m4Keys.plan,
    queryFn: ({ signal }) => m4Api.studyPlan(signal),
    staleTime: (q) => (q.state.data?.status === "generating" ? 0 : 60_000),
    retry: aiRetry,
    refetchInterval: (q) => (q.state.data?.status === "generating" && !over ? 3000 : false),
  });
  const generating = query.data?.status === "generating";
  usePollWindow(generating, 60_000, setOver, round);
  const retry = () => {
    setRound((r) => r + 1);
    query.refetch();
  };
  return { query, late: generating && over, retry, restartPolling: () => setRound((r) => r + 1) };
}

/** Tick a plan item: shows at once (in the same event, so the checkbox never flickers back), undone if the call fails. */
export function useTickItem() {
  const client = useQueryClient();
  const setDone = (id: string, done: boolean) =>
    client.setQueryData<StudyPlanResponse>(m4Keys.plan, (cur) =>
      cur?.plan ? { ...cur, plan: { ...cur.plan, days: cur.plan.days.map((d) => ({ ...d, items: d.items.map((i) => (i.id === id ? { ...i, done } : i)) })) } } : cur
    );
  const m = useMutation({
    mutationFn: ({ id, done }: { id: string; done: boolean }) => m4Api.tick(id, done),
    onError: (e, { id, done }) => {
      setDone(id, !done);
      // The plan changed under us (rebuilt elsewhere): fetch the current one.
      if (e instanceof StudentApiError && e.code === "ITEM_NOT_FOUND") client.invalidateQueries({ queryKey: m4Keys.plan });
    },
    onSuccess: (res) => setDone(res.item.id, res.item.done),
  });
  const toggle = (id: string, done: boolean) => {
    setDone(id, done);
    m.mutate({ id, done });
  };
  return { toggle, isError: m.isError };
}

/** "Practice 12 questions", "Timed drill · 10 min", plan items: make a set and open it. */
export function useStartPractice() {
  const router = useRouter();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (req: PracticeRequest) => m4Api.practiceCreate(req),
    onSuccess: (res) => {
      client.setQueryData(m4Keys.practice(res.set.id), res);
      router.push(`/practice/${enc(res.set.id)}`);
    },
  });
}

/** The signed-in student's profile (Student-Profile). */
export function useProfile() {
  return useQuery({ queryKey: m4Keys.me, queryFn: ({ signal }) => m4Api.me(signal), staleTime: 5 * 60_000 });
}
