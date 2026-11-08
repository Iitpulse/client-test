// Student classes (api-tests docs/student-classes-api.md) and batch 9's signed-in student routes (api-users
// docs/sms-api.md §3 How we reach you, §4 the bell). Plain fetch through request(), like the other student reads.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { auth } from "./session";
import { API_GATEWAY, request, StudentApiError } from "./student-api";
import { m4Api, m4Keys } from "./m4-api";
import type { ClassesResponse, ClassResponse, NotificationsResponse, PhoneCodeSent, ReachResponse, UnreadResponse } from "@/types/b9";

const enc = encodeURIComponent;

/**
 * A route this stack does not have yet (a plain 404 from the framework, with no API code) or one that answers 501
 * NOT_IMPLEMENTED (the service still runs on its old database). The new cards and the bell then stay out of the way
 * instead of showing an error on every screen: batch 9 reaches staging service by service.
 */
export function isMissingRoute(err: unknown): boolean {
  return err instanceof StudentApiError && ((err.status === 404 && !err.code) || err.status === 501 || err.code === "NOT_IMPLEMENTED");
}

export const classesApi = {
  /** GET /tests/student/classes: now to now + 62 days (the default), cancelled ones kept 24 h */
  list: (signal?: AbortSignal) => request<ClassesResponse>("tests", "/student/classes", undefined, signal),
  /** GET /tests/student/classes/:id: 404 CLASS_NOT_FOUND (not the student's, unknown, cancelled over 24 h ago) */
  get: (id: string, signal?: AbortSignal) => request<ClassResponse>("tests", `/student/classes/${enc(id)}`, undefined, signal),
  /**
   * "Add to my calendar": GET /tests/student/classes/:id/ics (a one-event .ics, signed-in) saved as a file. The file
   * opens in the phone's or laptop's calendar app. 409 CLASS_NOT_ADDABLE once it started or was cancelled.
   */
  downloadIcs: async (id: string, path: string | null, title: string) => {
    const url = path ? `${API_GATEWAY}${path.startsWith("/tests/") ? path : `/tests${path}`}` : `${API_GATEWAY}/tests/student/classes/${enc(id)}/ics`;
    const token = await auth.ensureToken();
    let res: Response;
    try {
      res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {}, cache: "no-store" });
    } catch {
      throw new StudentApiError(0, "You seem to be offline. Check your connection and try again.");
    }
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { code?: string; message?: string } | null;
      throw new StudentApiError(res.status, body?.message || "Couldn't make the calendar file. Try again.", body?.code as never);
    }
    const blob = new Blob([await res.blob()], { type: "text/calendar;charset=utf-8" });
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = `${title.replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 80) || "class"}.ics`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(href), 10_000);
  },
};

export const notificationsApi = {
  /** GET /users/me/notifications?limit=&before=: newest first, kept 30 days */
  list: (before: string | null, signal?: AbortSignal) => request<NotificationsResponse>("users", "/me/notifications", { limit: 30, before }, signal),
  /** GET /users/me/notifications/unread: the bell's count (polled at most once a minute) */
  unread: (signal?: AbortSignal) => request<UnreadResponse>("users", "/me/notifications/unread", undefined, signal),
  /** POST /users/me/notifications/:id/read */
  read: (id: string) => request<{ read: true }>("users", `/me/notifications/${enc(id)}/read`, undefined, undefined, {}),
  /** POST /users/me/notifications/read-all */
  readAll: () => request<{ marked: number }>("users", "/me/notifications/read-all", undefined, undefined, {}),
};

export const reachApi = {
  /** GET /users/me/reach: phone, email, parent's phone, the SMS switches */
  get: (signal?: AbortSignal) => request<ReachResponse>("users", "/me/reach", undefined, signal),
  /** POST /users/me/phone/code: a new number, or the account's current one (no body field) */
  sendCode: (phone?: string) => request<PhoneCodeSent>("users", "/me/phone/code", undefined, undefined, phone ? { phone } : {}),
  /** POST /users/me/phone/verify */
  verify: (code: string) => request<{ verified: true; phone: { display: string; last4: string; verified: true } }>("users", "/me/phone/verify", undefined, undefined, { code }),
};

export const b9Keys = {
  classes: ["student", "classes"] as const,
  class: (id: string) => ["student", "class", id] as const,
  notifications: ["student", "notifications"] as const,
  unread: ["student", "notifications", "unread"] as const,
  reach: ["student", "reach"] as const,
};

/** Every class from now to +62 days. Shared by the Home card, the strip and /classes. */
export function useClasses(enabled = true) {
  return useQuery({
    queryKey: b9Keys.classes,
    queryFn: ({ signal }) => classesApi.list(signal),
    enabled,
    staleTime: 60_000,
    // a class moves or is cancelled while the page is open: look again every 5 minutes
    refetchInterval: 5 * 60_000,
    retry: (n, e) => !isMissingRoute(e) && n < 1,
  });
}

export function useReach(enabled = true) {
  return useQuery({ queryKey: b9Keys.reach, queryFn: ({ signal }) => reachApi.get(signal), enabled, staleTime: 60_000, retry: (n, e) => !isMissingRoute(e) && n < 1 });
}

/**
 * The SMS switches (PATCH /users/student/me { preferences: { smsClasses | smsTests } }), saved on change with the
 * reach answer updated at once; a failure puts the switch back.
 */
export function useSmsSwitch(onDone: (ok: boolean, retry: () => void) => void) {
  const client = useQueryClient();
  const m = useMutation({
    mutationFn: (p: { smsClasses?: boolean; smsTests?: boolean }) => m4Api.patchMe({ preferences: p } as never),
    onMutate: (p) => {
      const before = client.getQueryData<ReachResponse>(b9Keys.reach);
      if (before)
        client.setQueryData<ReachResponse>(b9Keys.reach, {
          ...before,
          sms: { ...before.sms, ...(p.smsClasses !== undefined ? { classes: p.smsClasses } : {}), ...(p.smsTests !== undefined ? { tests: p.smsTests } : {}) },
        });
      return { before };
    },
    onError: (_e, p, ctx) => {
      if (ctx?.before) client.setQueryData(b9Keys.reach, ctx.before);
      onDone(false, () => m.mutate(p));
    },
    onSuccess: (res) => {
      client.setQueryData(m4Keys.me, res);
      onDone(true, () => {});
    },
  });
  return m;
}
