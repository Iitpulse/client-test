// The exam hands /result a submit it could not finish (offline, 5xx) so Student-Submitted can send it, retry and
// show "Your answers are safe on this device" (offline-saved) or "We couldn't submit yet" (failed).
// Contract for the exam store (frozen; its owner wires it): on a failed POST /tests/test/submit, write
//   localStorage.IITP_SUBMIT_PENDING = JSON.stringify({ testId, testName, answered, total, submittedAtDevice, body })
// where body is the exact submit body (sections, submittedAtDevice, answerLog, events, ...), then open /result.
// The server's submit rules make a late arrival safe: the recorded time is submittedAtDevice when it is not after
// the deadline, and nothing changed after the deadline counts (api-ai docs/m6-api.md "Answer history and offline submit").

export const PENDING_SUBMIT_KEY = "IITP_SUBMIT_PENDING";

export interface PendingSubmit {
  testId: string;
  testName: string;
  answered: number;
  total: number;
  submittedAtDevice: string;
  body: Record<string, unknown>;
}

export function readPendingSubmit(): PendingSubmit | null {
  try {
    const raw = localStorage.getItem(PENDING_SUBMIT_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<PendingSubmit>;
    if (!p.testId || !p.body || typeof p.body !== "object") return null;
    return {
      testId: p.testId,
      testName: p.testName ?? "",
      answered: Number(p.answered) || 0,
      total: Number(p.total) || 0,
      submittedAtDevice: p.submittedAtDevice ?? new Date().toISOString(),
      body: { ...p.body, testId: p.testId },
    };
  } catch {
    return null;
  }
}

export function clearPendingSubmit() {
  try {
    localStorage.removeItem(PENDING_SUBMIT_KEY);
  } catch {
    // storage blocked: nothing was stored
  }
}
