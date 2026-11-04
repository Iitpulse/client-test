"use client";

// One doubt thread about one question (testId + paper number n): find it, open it, send messages and stream answers.
// Contract: api-ai docs/m4-api.md "Doubt chat". The thread lives in the query cache (m4Keys.doubt); the answer being
// streamed is local state, flushed once per frame, and replaced by done.message (the stored text) when it ends.
import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { aiRetry } from "./ai-api";
import { streamDoubt } from "./doubt-stream";
import { m4Api, m4Keys, type DoubtsPage } from "./m4-api";
import { StudentApiError } from "./student-api";
import type { DoubtChip, DoubtMessage, DoubtQuota, DoubtSend, DoubtThread } from "@/types/m4";

export type ChatProblem =
  | { kind: "locked"; message: string; at: string | null }
  | { kind: "down"; message: string }
  | { kind: "full" }
  | { kind: "daily"; at: string | null }
  | { kind: "error"; message: string };

const DEFAULT_CHIPS: DoubtChip[] = [
  { kind: "similar", label: "Similar question" },
  { kind: "hindi", label: "हिन्दी में समझाएं" },
];

function problemOf(err: unknown): ChatProblem {
  const e = err instanceof StudentApiError ? err : null;
  const at = (k: string) => (typeof e?.details?.[k] === "string" ? (e.details[k] as string) : null);
  if (e?.code === "AI_NOT_AVAILABLE_YET") return { kind: "locked", message: e.message, at: at("availableAt") };
  if (e?.code === "AI_PAUSED") return { kind: "down", message: e.message || "The AI tutor is paused right now. Your solutions are all still here" };
  if (e?.code === "AI_UNAVAILABLE" || e?.code === "AI_RATE_LIMITED") return { kind: "down", message: e.message || "The AI tutor isn't answering right now. Please try again in a few minutes" };
  if (e?.code === "THREAD_FULL") return { kind: "full" };
  if (e?.code === "DOUBT_DAILY_LIMIT") return { kind: "daily", at: at("resetsAt") };
  return { kind: "error", message: e?.message || "Couldn't send that. Please try again" };
}

/** A tutor message still being written on the server (after a dropped stream): poll the thread until it has a finish. */
const pending = (t: DoubtThread | undefined) => !!t && t.messages.some((m) => m.role === "tutor" && m.finish === null);

export function useDoubt({ testId, n, threadId: given }: { testId: string; n: number; threadId?: string | null }) {
  const client = useQueryClient();
  // Without a thread id, find the student's latest thread about this question in the first page of the list
  // (opening one with POST /doubts would create an empty thread just by looking).
  const listQ = useQuery({
    queryKey: m4Keys.doubts,
    queryFn: ({ signal }) => m4Api.doubts(null, signal),
    enabled: !given,
    retry: aiRetry,
    staleTime: 60_000,
  });
  const found = listQ.data?.items
    .filter((t) => t.testId === testId && t.n === n)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
  const [created, setCreated] = useState<string | null>(null);
  const threadId = created ?? given ?? found?.id ?? null;

  const pendingSince = useRef<number | null>(null);
  const threadQ = useQuery({
    queryKey: m4Keys.doubt(threadId ?? "-"),
    queryFn: ({ signal }) => m4Api.doubt(threadId!, signal),
    enabled: !!threadId,
    retry: aiRetry,
    staleTime: 30_000,
    // Poll a pending answer every 2.5 s for up to 3.5 minutes (the server marks it failed after 3).
    refetchInterval: (q) => {
      if (!pending(q.state.data?.thread)) {
        pendingSince.current = null;
        return false;
      }
      pendingSince.current ??= Date.now();
      return Date.now() - pendingSince.current < 210_000 ? 2500 : false;
    },
  });
  const thread = threadQ.data?.thread;
  const isPending = pending(thread);

  const [local, setLocal] = useState<DoubtMessage[]>([]); // the student's message until the server echoes it
  const [draft, setDraft] = useState<string | null>(null); // the answer being streamed (null: none)
  const [thinking, setThinking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<ChatProblem | null>(null);
  const draftRef = useRef("");
  const frame = useRef<number | null>(null);
  const abort = useRef<AbortController | null>(null);
  useEffect(() => () => abort.current?.abort(), []);

  const setThread = useCallback(
    (id: string, fn: (t: DoubtThread) => DoubtThread) => {
      client.setQueryData<{ now: string; thread: DoubtThread }>(m4Keys.doubt(id), (cur) => (cur ? { ...cur, thread: fn(cur.thread) } : cur));
    },
    [client]
  );

  const open = useCallback(async (): Promise<string> => {
    const res = await m4Api.doubtOpen(testId, n);
    client.setQueryData(m4Keys.doubt(res.thread.summary.id), res);
    setCreated(res.thread.summary.id);
    return res.thread.summary.id;
  }, [client, testId, n]);

  /** Sends a message; resolves to text to put back in the input when it was refused before streaming, else null. */
  const send = useCallback(
    async (body: DoubtSend, shown: string): Promise<string | null> => {
      if (busy) return null;
      setBusy(true);
      setProblem(null);
      const mine: DoubtMessage = { id: `local-${Date.now()}`, role: "student", kind: "text", text: shown, question: null, finish: null, createdAt: new Date().toISOString() };
      setLocal([mine]);
      setThinking(true);
      let id = threadId;
      const ctl = new AbortController();
      abort.current = ctl;
      const flush = () => {
        frame.current = null;
        setDraft(draftRef.current);
      };
      try {
        if (!id) id = await open();
        draftRef.current = "";
        const end = await streamDoubt(
          id,
          body,
          (ev) => {
            if (ev.event === "start") {
              setThread(id!, (t) => ({ ...t, messages: [...t.messages, ev.data.studentMessage], quota: ev.data.quota }));
              setLocal([]);
            } else if (ev.event === "delta") {
              setThinking(false);
              draftRef.current += ev.data.text;
              if (frame.current === null) frame.current = requestAnimationFrame(flush);
            } else if (ev.event === "question") {
              setThinking(false);
              setThread(id!, (t) => ({ ...t, messages: [...t.messages, ev.data.message] }));
            } else if (ev.event === "done") {
              if (frame.current !== null) cancelAnimationFrame(frame.current);
              frame.current = null;
              draftRef.current = "";
              setDraft(null);
              setThinking(false);
              setThread(id!, (t) => ({
                ...t,
                messages: [...t.messages.filter((m) => m.id !== ev.data.message.id), ev.data.message],
                quota: ev.data.quota,
                suggestions: ev.data.suggestions,
              }));
            }
          },
          ctl.signal
        );
        if (end === "dropped") {
          // The connection ended before "done": the thread has what the server kept (maybe still being written).
          await client.refetchQueries({ queryKey: m4Keys.doubt(id) });
          setDraft(null);
          setLocal([]);
        }
        return null;
      } catch (e) {
        if ((e as Error)?.name === "AbortError") return null;
        setLocal([]);
        setDraft(null);
        const p = problemOf(e);
        setProblem(p);
        if (p.kind === "full" && id) setThread(id, (t) => ({ ...t, quota: { ...t.quota, leftInThread: 0 } }));
        return "text" in body ? body.text : null;
      } finally {
        if (frame.current !== null) cancelAnimationFrame(frame.current);
        frame.current = null;
        setThinking(false);
        setBusy(false);
        client.invalidateQueries({ queryKey: m4Keys.doubts });
      }
    },
    [busy, threadId, open, setThread, client]
  );

  /** THREAD_FULL: start a new thread about the same question (POST /doubts answers a new one when the latest is full). */
  const startNew = useCallback(async () => {
    setProblem(null);
    try {
      await open();
    } catch (e) {
      setProblem(problemOf(e));
    }
  }, [open]);

  const list = listQ.data as DoubtsPage | undefined;
  const quota: DoubtQuota | null = thread?.quota ?? list?.quota ?? null;
  const lookupError = (!given && !list && listQ.isError ? listQ.error : null) ?? (threadId && !thread && threadQ.isError ? threadQ.error : null);
  const blocking = lookupError ? problemOf(lookupError) : null;
  const daily = problem?.kind === "daily" || (quota ? quota.leftToday <= 0 : false);
  const full = problem?.kind === "full" || (thread ? thread.quota.leftInThread === 0 : false);

  return {
    thread,
    messages: [...(thread?.messages ?? []), ...local],
    draft,
    thinking,
    busy: busy || isPending,
    pendingOnServer: isPending,
    quota,
    chips: thread?.suggestions?.length ? thread.suggestions : DEFAULT_CHIPS,
    loading: (!given && listQ.isPending) || (!!threadId && threadQ.isPending),
    problem: problem ?? (blocking && blocking.kind !== "error" ? blocking : null),
    loadError: blocking?.kind === "error" ? (lookupError as unknown) : null,
    retryLoad: () => (threadId ? threadQ.refetch() : listQ.refetch()),
    daily,
    full,
    /** server time of the last response (for "ask again today, 12:00 AM") */
    now: Date.parse(threadQ.data?.now ?? listQ.data?.now ?? ""),
    send,
    startNew,
  };
}
