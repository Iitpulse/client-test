"use client";

// One doubt thread about one question (testId + paper number n): find it, open it, send messages and stream answers.
// Contract: api-ai docs/m4-api.md "Doubt chat". The thread lives in the query cache (m4Keys.doubt); the answer being
// streamed is local state, flushed once per frame, and replaced by done.message (the stored text) when it ends.
// A dropped stream (batch 5 "Dropped"): the partial answer stays on screen while the thread is fetched again and
// polled ("Getting the rest…"); if that fails or takes over 3.5 minutes, "Try again" fetches it once more.
// Fixtures (lib/doubt-fixtures.ts, `?fixture=`) replace every call with local data for the board states.
import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { aiRetry } from "./ai-api";
import { streamDoubt } from "./doubt-stream";
import { fixtureReply, type DoubtFx } from "./doubt-fixtures";
import { m4Api, m4Keys, type DoubtsPage } from "./m4-api";
import { StudentApiError } from "./student-api";
import type { DoubtChip, DoubtMessage, DoubtQuota, DoubtSend, DoubtThread } from "@/types/m4";

export type ChatProblem =
  | { kind: "locked"; message: string; at: string | null }
  | { kind: "down"; message: string }
  | { kind: "full" }
  | { kind: "daily"; at: string | null }
  /** DOUBT_DAILY_LIMIT reason "attempts": the hidden ceiling of 40 sends a day (refused / failed ones included) */
  | { kind: "attempts"; at: string | null }
  | { kind: "error"; message: string; error?: unknown };

/** A dropped answer stream: what arrived before the drop, and whether the rest is still being fetched. */
export type Dropped = { text: string; phase: "getting" | "retry" };

const DEFAULT_CHIPS: DoubtChip[] = [
  { kind: "similar", label: "Similar question" },
  { kind: "hindi", label: "हिन्दी में समझाएं" },
];

/** How long a pending tutor message is polled before "Couldn't get the rest" (the server marks it failed after 3 min). */
const POLL_MS = 210_000;

export function problemOf(err: unknown): ChatProblem {
  const e = err instanceof StudentApiError ? err : null;
  const at = (k: string) => (typeof e?.details?.[k] === "string" ? (e.details[k] as string) : null);
  if (e?.code === "AI_NOT_AVAILABLE_YET") return { kind: "locked", message: e.message, at: at("availableAt") };
  if (e?.code === "AI_PAUSED") return { kind: "down", message: e.message || "The AI tutor is paused right now. Your solutions are all still here" };
  if (e?.code === "AI_UNAVAILABLE" || e?.code === "AI_RATE_LIMITED") return { kind: "down", message: e.message || "The AI tutor isn't answering right now. Please try again in a few minutes" };
  if (e?.code === "THREAD_FULL") return { kind: "full" };
  if (e?.code === "DOUBT_DAILY_LIMIT") return e.details?.reason === "attempts" ? { kind: "attempts", at: at("resetsAt") } : { kind: "daily", at: at("resetsAt") };
  return { kind: "error", message: e?.message || "Couldn't send that. Please try again", error: err };
}

/** A tutor message still being written on the server (after a dropped stream): poll the thread until it has a finish. */
const pending = (t: DoubtThread | undefined) => !!t && t.messages.some((m) => m.role === "tutor" && m.finish === null);

/** What to send again for a failed answer: the student message it answered (a chip goes as the chip). */
function resendOf(messages: DoubtMessage[], failedId: string, chips: DoubtChip[]): { body: DoubtSend; shown: string } | null {
  const i = messages.findIndex((m) => m.id === failedId);
  const mine = messages
    .slice(0, i < 0 ? messages.length : i)
    .reverse()
    .find((m) => m.role === "student");
  if (!mine) return null;
  const chip = [...DEFAULT_CHIPS, ...chips].find((c) => c.label === mine.text && c.kind !== "followUp");
  return { body: chip && chip.kind !== "followUp" ? { chip: chip.kind } : { text: mine.text }, shown: mine.text };
}

export function useDoubt({ testId, n, threadId: given, fx }: { testId: string; n: number; threadId?: string | null; fx?: DoubtFx | null }) {
  const client = useQueryClient();
  const live = !fx;
  // Without a thread id, find the student's latest thread about this question in the first page of the list
  // (opening one with POST /doubts would create an empty thread just by looking).
  const listQ = useQuery({
    queryKey: m4Keys.doubts,
    queryFn: ({ signal }) => m4Api.doubts(null, signal),
    enabled: live && !given,
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
    enabled: live && !!threadId,
    retry: aiRetry,
    staleTime: 30_000,
    // Poll a pending answer every 2.5 s for up to 3.5 minutes (the server marks it failed after 3).
    refetchInterval: (q) => {
      if (!pending(q.state.data?.thread)) {
        pendingSince.current = null;
        return false;
      }
      pendingSince.current ??= Date.now();
      return Date.now() - pendingSince.current < POLL_MS ? 2500 : false;
    },
  });

  // Fixture mode: the thread is local state seeded from the fixture.
  const fxThreadId = fx ? (given && fx.threads[given] ? given : Object.keys(fx.threads)[0]!) : null;
  const [fxThread, setFxThread] = useState<DoubtThread | null>(fx && fxThreadId ? fx.threads[fxThreadId]! : null);
  const thread = fx ? (fxThread ?? undefined) : threadQ.data?.thread;
  const isPending = pending(thread);

  const [local, setLocal] = useState<DoubtMessage[]>([]); // the student's message until the server echoes it
  const [draft, setDraft] = useState<string | null>(null); // the answer being streamed (null: none)
  const [thinking, setThinking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<ChatProblem | null>(null);
  const [dropped, setDropped] = useState<Dropped | null>(fx?.state === "drop-retry" ? { text: "", phase: "retry" } : null);
  const draftRef = useRef("");
  const frame = useRef<number | null>(null);
  const abort = useRef<AbortController | null>(null);
  useEffect(() => () => abort.current?.abort(), []);

  // A pending answer polled for too long: stop waiting and offer "Try again".
  useEffect(() => {
    if (!live || !isPending) return;
    const t = window.setTimeout(() => setDropped((d) => ({ text: d?.text ?? "", phase: "retry" })), POLL_MS);
    return () => window.clearTimeout(t);
  }, [live, isPending, threadQ.dataUpdatedAt]);
  // The rest arrived (the pending message has a finish): the drop is over (cleared while rendering, before it shows).
  if (live && dropped && !isPending && threadQ.isSuccess && !threadQ.isFetching && dropped.phase === "getting") setDropped(null);

  const setThread = useCallback(
    (id: string, fn: (t: DoubtThread) => DoubtThread) => {
      if (fx) {
        setFxThread((cur) => (cur ? fn(cur) : cur));
        return;
      }
      client.setQueryData<{ now: string; thread: DoubtThread }>(m4Keys.doubt(id), (cur) => (cur ? { ...cur, thread: fn(cur.thread) } : cur));
    },
    [client, fx]
  );

  const open = useCallback(async (): Promise<string> => {
    const res = await m4Api.doubtOpen(testId, n);
    client.setQueryData(m4Keys.doubt(res.thread.summary.id), res);
    setCreated(res.thread.summary.id);
    return res.thread.summary.id;
  }, [client, testId, n]);

  /** Fixture mode: echo the message and write a canned answer a word at a time (no API call). */
  const sendFixture = useCallback(
    (shown: string) => {
      const at = new Date().toISOString();
      const id = `fx-local-${Date.now()}`;
      setThread("", (t) => ({ ...t, messages: [...t.messages, { id: `${id}-s`, role: "student", kind: "text", text: shown, question: null, finish: null, createdAt: at }] }));
      setThinking(true);
      setBusy(true);
      const words = fixtureReply(shown).split(" ");
      let i = 0;
      window.setTimeout(() => {
        setThinking(false);
        const iv = window.setInterval(() => {
          i++;
          setDraft(words.slice(0, i).join(" "));
          if (i >= words.length) {
            window.clearInterval(iv);
            setDraft(null);
            setBusy(false);
            setThread("", (t) => ({ ...t, messages: [...t.messages, { id: `${id}-t`, role: "tutor", kind: "text", text: words.join(" "), question: null, finish: "stop", createdAt: at }] }));
          }
        }, 55);
      }, 800);
    },
    [setThread]
  );

  /** Sends a message; resolves to text to put back in the input when it was refused before streaming, else null. */
  const send = useCallback(
    async (body: DoubtSend, shown: string): Promise<string | null> => {
      if (busy) return null;
      if (fx) {
        sendFixture(shown);
        return null;
      }
      setBusy(true);
      setProblem(null);
      setDropped(null);
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
          // The connection ended before "done": keep what arrived on screen and fetch what the server kept.
          setDropped({ text: draftRef.current, phase: "getting" });
          setDraft(null);
          setLocal([]);
          const ok = await client
            .refetchQueries({ queryKey: m4Keys.doubt(id) }, { throwOnError: true })
            .then(() => true)
            .catch(() => false);
          const t = client.getQueryData<{ thread: DoubtThread }>(m4Keys.doubt(id))?.thread;
          if (!ok) setDropped((d) => (d ? { ...d, phase: "retry" } : d));
          else if (!pending(t)) setDropped(null);
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
        draftRef.current = "";
        setThinking(false);
        setBusy(false);
        client.invalidateQueries({ queryKey: m4Keys.doubts });
      }
    },
    [busy, fx, sendFixture, threadId, open, setThread, client]
  );

  /** "Try again" on a dropped answer: fetch the thread again (and poll it while the answer is still being written). */
  const retryDrop = useCallback(async () => {
    if (fx) return;
    setDropped((d) => (d ? { ...d, phase: "getting" } : { text: "", phase: "getting" }));
    pendingSince.current = null;
    const r = await threadQ.refetch();
    if (r.isError) setDropped((d) => (d ? { ...d, phase: "retry" } : d));
    else if (!pending(r.data?.thread)) setDropped(null);
  }, [fx, threadQ]);

  /** "Retry" on a failed answer: send the student's message again (it didn't count, so this is not a second use). */
  const retryFailed = useCallback(
    (failedId: string) => {
      const all = [...(thread?.messages ?? [])];
      const again = resendOf(all, failedId, thread?.suggestions ?? []);
      if (again) void send(again.body, again.shown);
    },
    [thread, send]
  );

  /** THREAD_FULL: start a new thread about the same question (POST /doubts answers a new one when the latest is full). */
  const startNew = useCallback(async () => {
    if (fx) return;
    setProblem(null);
    try {
      await open();
    } catch (e) {
      setProblem(problemOf(e));
    }
  }, [fx, open]);

  const list = (fx ? fx.page : listQ.data) as DoubtsPage | undefined;
  const quota: DoubtQuota | null = thread?.quota ?? list?.quota ?? null;
  const fxProblem: ChatProblem | null =
    fx?.state === "daily"
      ? { kind: "daily", at: fx.page.quota.resetsAt }
      : fx?.state === "attempts"
        ? { kind: "attempts", at: fx.page.quota.resetsAt }
        : fx?.state === "locked"
          ? { kind: "locked", message: "", at: lockedAt(Date.parse(fx.page.now)) }
          : null;
  const lookupError = live ? ((!given && !list && listQ.isError ? listQ.error : null) ?? (threadId && !thread && threadQ.isError ? threadQ.error : null)) : fx?.state === "error" ? new StudentApiError(503, "Couldn't load this chat") : null;
  const blocking = lookupError ? problemOf(lookupError) : null;
  const shown = problem ?? fxProblem ?? (blocking && blocking.kind !== "error" ? blocking : null);
  const daily = shown?.kind === "daily" || (quota ? quota.leftToday <= 0 : false);
  const full = shown?.kind === "full" || (thread ? thread.quota.leftInThread === 0 : false);

  return {
    thread,
    messages: [...(thread?.messages ?? []), ...local],
    draft,
    thinking,
    busy: busy || isPending,
    pendingOnServer: isPending,
    dropped,
    quota,
    chips: thread?.suggestions?.length ? thread.suggestions : DEFAULT_CHIPS,
    loading: fx ? fx.state === "loading" : (!given && listQ.isPending) || (!!threadId && threadQ.isPending),
    problem: shown,
    loadError: blocking?.kind === "error" ? (lookupError as unknown) : null,
    retryLoad: () => (fx ? undefined : threadId ? threadQ.refetch() : listQ.refetch()),
    daily,
    attempts: shown?.kind === "attempts",
    full,
    /** server time of the last response (for "ask again today, 12:00 AM") */
    now: fx ? Date.parse(fx.page.now) : Date.parse(threadQ.data?.now ?? listQ.data?.now ?? ""),
    send,
    retryDrop,
    retryFailed,
    startNew,
    fixture: fx ?? null,
  };
}

/** Fixture "locked": the test closes at 9:00 PM IST today. */
function lockedAt(now: number): string {
  const IST = 5.5 * 3600_000;
  const d = new Date(now + IST);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 21, 0) - IST).toISOString();
}
