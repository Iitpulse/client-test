// M6 (api-ai docs/m6-api.md, "Answer history and offline submit" and "Student exam payload"): what the exam store keeps in
// localStorage between saves and sends with save-progress / submit.
//   IITP_ANSWER_LOG_<testId>        AnswerLogEntry[]  every visit and answer change (sent as `answerLog`)
//   IITP_FULLSCREEN_EVENTS_<testId> FullscreenEvent[] fullscreen exits with their duration (sent as `events`)
// Entries are dropped only after a 2xx acknowledged them (the server dedupes: answer log by questionId + at + kind,
// events by `at`). Every storage access is guarded: blocked storage only loses the history, never the exam.
import type { AnswerLogEntry, AnswerLogValue, FullscreenEvent } from "@/types";
import { previewActive } from "./exam-preview";

const LOG_CAP = 2000;
const EVENTS_CAP = 200;
/** Consecutive answer changes of one question within this window are one entry (typing an integer, toggling options) */
const COALESCE_MS = 3000;

export const answerLogKey = (testId: string) => `IITP_ANSWER_LOG_${testId}`;
export const fullscreenEventsKey = (testId: string) => `IITP_FULLSCREEN_EVENTS_${testId}`;

function read<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    const v = raw ? JSON.parse(raw) : [];
    return Array.isArray(v) ? (v as T[]) : [];
  } catch {
    return [];
  }
}

function write<T>(key: string, items: T[]) {
  try {
    if (items.length) localStorage.setItem(key, JSON.stringify(items));
    else localStorage.removeItem(key);
  } catch {
    // storage full or blocked: the history is best effort
  }
}

/** Appends one entry; an "answer" right after an "answer" of the same question (within 3 s) replaces it. */
export function logAnswerEntry(testId: string | null | undefined, entry: Omit<AnswerLogEntry, "at"> & { at?: string }) {
  if (previewActive()) return; // "Preview as student": no exam log
  if (!testId || typeof window === "undefined") return;
  const at = entry.at ?? new Date().toISOString();
  const items = read<AnswerLogEntry>(answerLogKey(testId));
  const last = items[items.length - 1];
  const next: AnswerLogEntry = { questionId: entry.questionId, at, kind: entry.kind, ...(entry.value !== undefined ? { value: entry.value } : {}) };
  if (last && last.kind === "answer" && next.kind === "answer" && last.questionId === next.questionId && Date.parse(at) - Date.parse(last.at) <= COALESCE_MS) {
    items[items.length - 1] = next;
  } else {
    // two visits of the same question in a row add nothing
    if (last && last.kind === "visit" && next.kind === "visit" && last.questionId === next.questionId) return;
    items.push(next);
  }
  write(answerLogKey(testId), items.length > LOG_CAP ? items.slice(items.length - LOG_CAP) : items);
}

export const pendingAnswerLog = (testId: string): AnswerLogEntry[] => read<AnswerLogEntry>(answerLogKey(testId));
export const pendingFullscreenEvents = (testId: string): FullscreenEvent[] => read<FullscreenEvent>(fullscreenEventsKey(testId));

/** After a 2xx: drop exactly the entries that were sent (an entry changed meanwhile by coalescing stays). */
function acknowledge<T>(key: string, sent: T[]) {
  if (!sent.length) return;
  const sentSet = new Set(sent.map((e) => JSON.stringify(e)));
  write(key, read<T>(key).filter((e) => !sentSet.has(JSON.stringify(e))));
}
export const acknowledgeAnswerLog = (testId: string, sent: AnswerLogEntry[]) => acknowledge(answerLogKey(testId), sent);
export const acknowledgeFullscreenEvents = (testId: string, sent: FullscreenEvent[]) => acknowledge(fullscreenEventsKey(testId), sent);

/** The student left fullscreen: an event without a duration yet. */
export function recordFullscreenExit(testId: string | null | undefined, at = new Date().toISOString()) {
  if (previewActive()) return; // "Preview as student": no exam log
  if (!testId || typeof window === "undefined") return;
  const items = read<FullscreenEvent>(fullscreenEventsKey(testId));
  items.push({ kind: "fullscreenExit", at, durationSeconds: null });
  write(fullscreenEventsKey(testId), items.slice(-EVENTS_CAP));
}

/**
 * Back in fullscreen: the open exit gets its duration. When that exit was already sent without one, the same `at`
 * is queued again with the duration (the server keeps one row per `at`, a known duration wins).
 */
export function recordFullscreenReturn(testId: string | null | undefined, exitAt: string | null, now = Date.now()) {
  if (previewActive()) return; // "Preview as student": no exam log
  if (!testId || !exitAt || typeof window === "undefined") return;
  const durationSeconds = Math.max(0, Math.round((now - Date.parse(exitAt)) / 1000));
  const items = read<FullscreenEvent>(fullscreenEventsKey(testId));
  const open = items.find((e) => e.at === exitAt);
  if (open) open.durationSeconds = durationSeconds;
  else items.push({ kind: "fullscreenExit", at: exitAt, durationSeconds });
  write(fullscreenEventsKey(testId), items.slice(-EVENTS_CAP));
}

/** The exit that has no return yet (survives a refresh while out of fullscreen) */
export function openFullscreenExit(testId: string | null | undefined): string | null {
  if (!testId || typeof window === "undefined") return null;
  const last = read<FullscreenEvent>(fullscreenEventsKey(testId)).at(-1);
  return last && last.durationSeconds === null ? last.at : null;
}

export function clearExamLog(testId: string) {
  write(answerLogKey(testId), []);
  write(fullscreenEventsKey(testId), []);
}

/** The value an "answer" entry carries */
export function answerValue(q: { type: string; selectedOptions: string[]; enteredAnswer?: string; matrixAnswer?: Record<string, string[]> }): AnswerLogValue {
  if (q.type === "matrix") return { matrix: q.matrixAnswer ?? {} };
  if (q.type === "integer") {
    const v = q.enteredAnswer !== undefined && q.enteredAnswer !== "" ? parseFloat(q.enteredAnswer) : NaN;
    return Number.isFinite(v) ? { enteredAnswer: v } : null;
  }
  return { selectedOptions: [...q.selectedOptions] };
}
