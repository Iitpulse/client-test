// The M2 student portal reads (Home, Tests, Results, Review) on plain fetch, like the sign-in calls in
// lib/auth-api.ts: the signed-in screens are what a student opens on a slow phone, so they do not pull in axios.
// Contract: Iitpulse/api-tests docs/m2-student-api.md; types in types/m2-student.ts.
import { auth, sessionBootScript } from "./session";
import type {
  ApiError as ApiErrorBody,
  ApiOk,
  M2ErrorCode,
  ReviewFilter,
  ReviewItem,
  ReviewList,
  StudentHome,
  StudentResult,
  StudentTestsPage,
  TestsTab,
} from "@/types/m2-student";
import type { AiErrorCode } from "@/types/m3-ai";
import type { StudentGateResponse } from "@/types/m6";
import type { M4ErrorCode } from "@/types/m4";

/** Every coded error the student screens handle (M2 reads, M3 AI review, M4 progress / practice / profile / doubts). */
export type StudentErrorCode =
  | M2ErrorCode
  | AiErrorCode
  | M4ErrorCode
  // listed under "Changes" in api-ai docs/m4-api.md, not yet in the copied types
  | "ITEM_NOT_FOUND"
  | "TOO_MANY_ATTEMPTS"
  // M6 batches 4/5 (api-ai docs/m6-api.md M6B45ErrorCode)
  | "RESULT_HIDDEN"
  | "NO_SUBMISSION"
  | "TEST_NOT_FOUND"
  | "NOT_ASSIGNED"
  | "TEST_NOT_OPEN"
  | "TEST_CLOSED"
  | "ALREADY_SUBMITTED"
  | "SUBMIT_TOO_LATE"
  // M6 review additions + batch 7 (api-ai docs/m6-api.md)
  | "LEGAL_VERSION_CHANGED"
  | "NOTHING_TO_REDO"
  | "NOTHING_TO_PRACTISE"
  | "REVISION_FULL"
  | "REVISION_ITEM_NOT_FOUND"
  | "QUESTION_NOT_FOUND"
  | "REVIEW_NOT_AVAILABLE_YET"
  | "PRACTICE_LIMIT"
  | "CONSENT_NOT_REQUIRED"
  | "DOB_REQUIRED"
  | "NOTHING_TO_RESEND"
  | "CONSENT_LINK_INVALID"
  | "CONSENT_LINK_EXPIRED"
  | "CONSENT_ALREADY_CONFIRMED"
  | "INTERNAL";

export const API_GATEWAY = process.env.NEXT_PUBLIC_API_GATEWAY || "http://localhost:8000";

/** A failed call. status 0 = no response (offline, CORS, timeout). `message` is a sentence a student can read. */
export class StudentApiError extends Error {
  readonly status: number;
  readonly code?: StudentErrorCode;
  readonly details?: Record<string, unknown>;
  constructor(status: number, message: string, code?: StudentErrorCode, details?: Record<string, unknown>) {
    super(message);
    this.name = "StudentApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/** Retry only what can succeed on a second try: no response, 5xx (BATCH_UNAVAILABLE is a 503). Never 4xx. */
export function isRetryable(err: unknown): boolean {
  return err instanceof StudentApiError && (err.status === 0 || err.status >= 500);
}

export function signOutToLogin() {
  auth.removeToken();
  window.location.replace("/login"); // a full load: drop every cached query of the old session
}

/** One call through the gateway: `/tests`, `/users` or `/ai` (lib/ai-api.ts). A body makes it a JSON POST (or `method`). */
export async function request<T>(
  service: "tests" | "users" | "ai",
  path: string,
  params?: Record<string, string | number | undefined | null>,
  signal?: AbortSignal,
  body?: unknown,
  method?: "POST" | "PATCH" | "DELETE"
): Promise<T> {
  if (body === undefined && !method && !params) {
    // The page's HTML may already have asked for this (earlyFetchScript): take that answer once, if it is usable.
    const early = await takeEarly(`/${service}${path}`);
    if (early) return unwrap<T>(early.status, early.body as ApiOk<T> | ApiErrorBody | null);
  }
  const url = new URL(`${API_GATEWAY}/${service}${path}`);
  for (const [k, v] of Object.entries(params || {})) if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
  const send = async (token: string | null): Promise<Response> => {
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
    if (body !== undefined) headers["Content-Type"] = "application/json";
    try {
      return await fetch(url, { method: method ?? (body !== undefined ? "POST" : "GET"), headers, body: body !== undefined ? JSON.stringify(body) : undefined, cache: "no-store", signal });
    } catch (e) {
      if ((e as Error)?.name === "AbortError") throw e;
      throw new StudentApiError(0, "You seem to be offline. Check your connection and try again.");
    }
  };
  let res = await send(await auth.ensureToken());
  if (res.status === 401) {
    // the token expired between the check and the call (or the tab slept): refresh once and retry
    const fresh = await auth.ensureToken({ force: true });
    if (fresh) res = await send(fresh);
  }
  const json = (await res.json().catch(() => null)) as ApiOk<T> | ApiErrorBody | null;
  return unwrap<T>(res.status, json);
}

export function unwrap<T>(status: number, body: ApiOk<T> | ApiErrorBody | null): T {
  if (status === 401) {
    // Expired or missing session: same as the axios client (lib/api.ts) does for every other call.
    signOutToLogin();
    throw new StudentApiError(401, "Please sign in again.");
  }
  if (status < 200 || status >= 300 || !body || body.success !== true) {
    const e = body && body.success === false ? body : null;
    // A 5xx without a code is a crash, and its message may be internal (a failed query): never show it to a student.
    const message = status >= 500 && !e?.code ? "" : e?.message;
    throw new StudentApiError(status, message || "Something went wrong. Please try again.", e?.code as StudentErrorCode | undefined, e?.details);
  }
  return body.data;
}

/**
 * The first screen's data is requested by an inline script in the page's HTML (earlyFetchScript), in parallel with
 * the app's JavaScript instead of after it: on a slow phone that is most of the time to the first useful screen
 * (mobile LCP budget). Home (/) asks for GET /tests/student/home; a result (/results/:testId) for the result and its
 * AI summary. The first matching GET (request() with no params) takes that answer once if it is fresh and usable;
 * every later call, and any early answer that failed or came back 401, goes over the network as usual.
 */
type EarlyAnswer = { status: number; body: unknown };
type Early = { at: number; p: Promise<EarlyAnswer> };
const EARLY_MAX_AGE_MS = 15_000;
function earlyMap(): Record<string, Early> | undefined {
  return typeof window === "undefined" ? undefined : (window as unknown as { __iitpEarly?: Record<string, Early> }).__iitpEarly;
}
/** Is there an unused early answer for this gateway path (e.g. "/ai/student/results/TT_1/summary")? */
export function hasEarly(key: string): boolean {
  const e = earlyMap()?.[key];
  return !!e && Date.now() - e.at <= EARLY_MAX_AGE_MS;
}
async function takeEarly(key: string): Promise<EarlyAnswer | null> {
  const map = earlyMap();
  const early = map?.[key];
  if (!map || !early) return null;
  delete map[key];
  if (Date.now() - early.at > EARLY_MAX_AGE_MS) return null;
  const r = await early.p.catch(() => null);
  return r && r.status !== 0 && r.status !== 401 ? r : null;
}

/**
 * The inline script for the first HTML: the boot refresh (sessionBootScript), then the current page's first reads
 * with its token. Only signed-in pages that list their reads here; every other path does nothing more.
 */
export function earlyFetchScript(): string {
  // M7b: the token comes from the boot refresh (sessionBootScript, which runs first); no session hint, no early fetch
  const api = JSON.stringify(API_GATEWAY);
  return (
    sessionBootScript() +
    `(function(){try{var b=window.__iitpBoot;if(!b)return;var p=location.pathname,l=[],m;` +
    `if(p==="/")l.push("/tests/student/home");` +
    `else if((m=/^\\/results\\/([^\\/]+)\\/?$/.exec(p))){l.push("/tests/student/results/"+m[1]);l.push("/ai/student/results/"+m[1]+"/summary");}` +
    `if(!l.length)return;` +
    // Geist Mono (timers, numbers) and Kalam (the notes) are not preloaded (sign-in LCP), so they would only start
    // when the first screen renders, and each late swap re-reports its text as the LCP: ask for them as soon as the
    // stylesheet has registered their faces (it is still loading when this runs).
    `var fn=0;(function ff(){var d=document.fonts,h=0;if(!d)return;d.forEach(function(x){var f=x.family.replace(/["']/g,"");if(f==="Kalam"||f==="Geist Mono")h=1});if(h){d.load('400 16px "Geist Mono"',"0");d.load("400 16px Kalam","a")}else if(fn++<100)setTimeout(ff,30)})();` +
    `var t=b.p.then(function(r){return r&&r.status===200&&r.body&&r.body.data&&r.body.data.token||null});var e=window.__iitpEarly={};` +
    `l.forEach(function(u){e[u]={at:Date.now(),p:t.then(function(k){if(!k)return{status:401,body:null};return fetch(${api}+u,{headers:{Authorization:"Bearer "+k},cache:"no-store"}).then(function(h){return h.json().catch(function(){return null}).then(function(j){return{status:h.status,body:j}})})})}})}catch(x){}})();`
  );
}

const get = <T,>(path: string, params?: Record<string, string | number | undefined | null>, signal?: AbortSignal) =>
  request<T>("tests", path, params, signal);

export const studentApi = {
  /** GET /users/auth/me: the signed-in student's name for the avatar (the session token carries none) */
  me: () => request<{ _id: string; name?: string; email?: string }>("users", "/auth/me"),
  /** GET /tests/student/home: Student-Home and Phone-Home in one call */
  home: (signal?: AbortSignal) => get<StudentHome>("/student/home", undefined, signal),
  /** GET /tests/student/tests: one tab of the Tests list (completed is paged with `cursor`) */
  tests: (q: { tab: TestsTab; subject?: string; q?: string; limit?: number; cursor?: string | null }, signal?: AbortSignal) =>
    get<StudentTestsPage>("/student/tests", q, signal),
  /** GET /tests/student/results/:testId: published, pending or hidden */
  result: (testId: string, signal?: AbortSignal) => get<StudentResult>(`/student/results/${encodeURIComponent(testId)}`, undefined, signal),
  /** GET /tests/student/results/:testId/questions: every question of the filter with full content (desktop pane) */
  reviewList: (testId: string, filter: ReviewFilter, signal?: AbortSignal) =>
    get<ReviewList>(`/student/results/${encodeURIComponent(testId)}/questions`, { filter }, signal),
  /** GET /tests/student/results/:testId/questions/:n: one question, its place in the filter and its neighbours */
  reviewItem: (testId: string, n: number, filter: ReviewFilter, signal?: AbortSignal) =>
    get<ReviewItem>(`/student/results/${encodeURIComponent(testId)}/questions/${n}`, { filter }, signal),
  /** M6 GET /tests/student/tests/:testId/gate: Student-TestGate state before the frozen /instructions */
  gate: (testId: string, signal?: AbortSignal) => get<StudentGateResponse>(`/student/tests/${encodeURIComponent(testId)}/gate`, undefined, signal),
};

/** TanStack Query keys, so pages can share and prefetch each other's data. */
export const qk = {
  home: ["student", "home"] as const,
  tests: (tab: TestsTab, subject: string, q: string) => ["student", "tests", tab, subject, q] as const,
  /** the paged list of a tab (useInfiniteQuery: its cache entry has another shape than `tests`) */
  testsPages: (tab: TestsTab, subject: string, q: string) => ["student", "tests-pages", tab, subject, q] as const,
  result: (testId: string) => ["student", "result", testId] as const,
  reviewList: (testId: string, filter: ReviewFilter) => ["student", "review", testId, "list", filter] as const,
  reviewItem: (testId: string, n: number, filter: ReviewFilter) => ["student", "review", testId, "item", filter, n] as const,
  gate: (testId: string) => ["student", "gate", testId] as const,
};
