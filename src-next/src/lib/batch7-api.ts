// Batch 7 calls (owner, 6 Nov 2026): redo wrong, the Revision list and under-18 guardian consent.
// Contract: Iitpulse/api-ai docs/m6-api.md ("M6 review additions", "Batch 7 answers", "Under-18 guardian consent").
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { request } from "./student-api";
import type {
  GuardianConsentPublic,
  GuardianConsentStatus,
  RedoRequest,
  RedoResponse,
  RevisionAddResponse,
  RevisionItem,
  RevisionList,
} from "@/types/batch7";

const enc = encodeURIComponent;
type Now = { now: string };

export interface RevisionFilter {
  subject?: string;
  chapter?: string;
  testId?: string;
  q?: string;
  page?: number;
  pageSize?: number;
}

export const batch7Api = {
  redo: (testId: string, body: RedoRequest) => request<RedoResponse>("tests", `/student/results/${enc(testId)}/redo`, undefined, undefined, body),
  revision: (f: RevisionFilter, signal?: AbortSignal) =>
    request<RevisionList>("tests", "/student/revision", { subject: f.subject, chapter: f.chapter, testId: f.testId, q: f.q, page: f.page, pageSize: f.pageSize }, signal),
  revisionLookup: (testId: string, signal?: AbortSignal) =>
    request<Now & { items: Array<{ questionId: string; itemId: string }> }>("tests", "/student/revision/lookup", { testId }, signal),
  revisionAdd: (items: Array<{ testId: string; questionId: string; note?: string | null }>) =>
    request<RevisionAddResponse>("tests", "/student/revision", undefined, undefined, { items }),
  revisionDelete: (itemId: string) => request<Now & { removed: RevisionItem }>("tests", `/student/revision/${enc(itemId)}`, undefined, undefined, undefined, "DELETE"),
  revisionRemove: (ids: string[]) => request<Now & { removed: number }>("tests", "/student/revision/remove", undefined, undefined, { ids }),
  revisionPractice: (body: { ids?: string[]; subject?: string; chapter?: string; timed?: boolean }) =>
    request<Now & { set: { id: string } }>("tests", "/student/revision/practice", undefined, undefined, body),
  consent: (signal?: AbortSignal) => request<GuardianConsentStatus>("users", "/student/me/guardian-consent", undefined, signal),
  consentRequest: (body: { guardianEmail: string; guardianName?: string | null }) =>
    request<GuardianConsentStatus>("users", "/student/me/guardian-consent", undefined, undefined, body),
  consentResend: () => request<GuardianConsentStatus>("users", "/student/me/guardian-consent/resend", undefined, undefined, {}),
  consentPublic: (token: string, signal?: AbortSignal) => request<GuardianConsentPublic>("users", `/public/guardian-consent/${enc(token)}`, undefined, signal),
  consentConfirm: (token: string, guardianName?: string | null) =>
    request<GuardianConsentPublic>("users", `/public/guardian-consent/${enc(token)}/confirm`, undefined, undefined, { agree: true, ...(guardianName ? { guardianName } : {}) }),
};

export const b7Keys = {
  revision: (f: RevisionFilter) => ["student", "revision", f] as const,
  revisionAll: ["student", "revision"] as const,
  lookup: (testId: string) => ["student", "revision-lookup", testId] as const,
  consent: ["student", "guardian-consent"] as const,
};

/** Which questions of a test's review are already in the Revision list (questionId → itemId). */
export function useRevisionLookup(testId: string | null) {
  return useQuery({
    queryKey: b7Keys.lookup(testId ?? ""),
    queryFn: ({ signal }) => batch7Api.revisionLookup(testId!, signal),
    enabled: !!testId,
    select: (d) => new Map(d.items.map((i) => [i.questionId, i.itemId])),
    staleTime: 30_000,
  });
}

/** Add / remove revision items and keep the lookup and the list in step. */
export function useRevisionWrites() {
  const qc = useQueryClient();
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["student", "revision-lookup"] });
    qc.invalidateQueries({ queryKey: b7Keys.revisionAll });
  };
  const add = useMutation({ mutationFn: batch7Api.revisionAdd, onSettled: refresh });
  const remove = useMutation({ mutationFn: (itemId: string) => batch7Api.revisionDelete(itemId), onSettled: refresh });
  const removeMany = useMutation({ mutationFn: (ids: string[]) => batch7Api.revisionRemove(ids), onSettled: refresh });
  return { add, remove, removeMany };
}

/** Start a redo set and open it (the same set comes back when one was made for this test + choice). */
export function useRedo(testId: string) {
  const router = useRouter();
  return useMutation({
    mutationFn: (body: RedoRequest) => batch7Api.redo(testId, body),
    onSuccess: (res) => router.push(`/practice/${enc(res.set.id)}`),
  });
}

/** "Practise selected" from the Revision list: a new set every time. */
export function useRevisionPractice() {
  const router = useRouter();
  return useMutation({
    mutationFn: batch7Api.revisionPractice,
    onSuccess: (res) => router.push(`/practice/${enc(res.set.id)}`),
  });
}

/** Seconds per question → minutes for n questions (the server's rule, shown before starting). */
export function timedMinutes(durationMinutes: number, questionCount: number, n: number): number {
  if (!durationMinutes || !questionCount || !n) return 0;
  return Math.ceil((durationMinutes * n) / questionCount);
}
