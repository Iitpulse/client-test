// POST /ai/student/doubts/:threadId/messages answers text/event-stream (contract: docs/m4-api.md, DoubtStreamEvent).
// Read with fetch() and a stream reader so the token stays in the Authorization header: never EventSource, never a
// token in the URL. A JSON body instead of a stream is an error from before the stream started.
import { auth } from "./session";
import { API_GATEWAY, signOutToLogin, StudentApiError, unwrap } from "./student-api";
import type { DoubtSend, DoubtStreamEvent } from "@/types/m4";

export type StreamEnd = "done" | "dropped";

/**
 * Sends one message and calls `onEvent` for each event in order. Resolves "done" after the done event, "dropped"
 * if the connection ends or fails before it (the caller then GETs the thread). Rejects with StudentApiError when
 * the server refused before streaming (THREAD_FULL, DOUBT_DAILY_LIMIT, AI_NOT_AVAILABLE_YET, ...).
 */
export async function streamDoubt(threadId: string, body: DoubtSend, onEvent: (e: DoubtStreamEvent) => void, signal?: AbortSignal): Promise<StreamEnd> {
  const token = await auth.ensureToken();
  let res: Response;
  try {
    res = await fetch(`${API_GATEWAY}/ai/student/doubts/${encodeURIComponent(threadId)}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "text/event-stream", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(body),
      cache: "no-store",
      signal,
    });
  } catch (e) {
    if ((e as Error)?.name === "AbortError") throw e;
    throw new StudentApiError(0, "You seem to be offline. Check your connection and try again.");
  }
  if (res.status === 401) {
    signOutToLogin();
    throw new StudentApiError(401, "Please sign in again.");
  }
  const type = res.headers.get("content-type") || "";
  if (!res.ok || !type.includes("text/event-stream") || !res.body) {
    const json = await res.json().catch(() => null);
    // A 2xx JSON answer is not a stream: treat it as dropped (the thread has whatever the server kept).
    if (res.ok && json && (json as { success?: boolean }).success === true) return "dropped";
    unwrap(res.ok ? 500 : res.status, json as never);
    return "dropped";
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let finished = false;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      let cut: number;
      while ((cut = nextBreak(buf)) >= 0) {
        const block = buf.slice(0, cut);
        buf = buf.slice(cut).replace(/^(\r?\n){2}/, "");
        const ev = parseBlock(block);
        if (!ev) continue;
        onEvent(ev);
        if (ev.event === "done") finished = true;
      }
    }
  } catch (e) {
    if ((e as Error)?.name === "AbortError") throw e;
    return "dropped";
  } finally {
    reader.releaseLock?.();
  }
  return finished ? "done" : "dropped";
}

function nextBreak(s: string): number {
  const a = s.indexOf("\n\n");
  const b = s.indexOf("\r\n\r\n");
  if (a < 0) return b;
  if (b < 0) return a;
  return Math.min(a, b);
}

/** One SSE block: `event:` and `data:` lines; `:` lines (": ping") are comments. */
function parseBlock(block: string): DoubtStreamEvent | null {
  let event = "message";
  const data: string[] = [];
  for (const raw of block.split(/\r?\n/)) {
    if (!raw || raw.startsWith(":")) continue;
    const i = raw.indexOf(":");
    const field = i < 0 ? raw : raw.slice(0, i);
    const val = i < 0 ? "" : raw.slice(i + 1).replace(/^ /, "");
    if (field === "event") event = val;
    else if (field === "data") data.push(val);
  }
  if (!data.length || !["start", "delta", "question", "done"].includes(event)) return null;
  try {
    return { event, data: JSON.parse(data.join("\n")) } as DoubtStreamEvent;
  } catch {
    return null;
  }
}
