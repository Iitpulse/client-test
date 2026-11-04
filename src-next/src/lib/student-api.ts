// The M2 student portal reads (Home, Tests, Results, Review) on plain fetch, like the sign-in calls in
// lib/auth-api.ts: the signed-in screens are what a student opens on a slow phone, so they do not pull in axios.
// Contract: Iitpulse/api-tests docs/m2-student-api.md; types in types/m2-student.ts.
import { AUTH_TOKEN_KEY } from "./session";
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

const API_GATEWAY = process.env.NEXT_PUBLIC_API_GATEWAY || "http://localhost:8000";

/** A failed call. status 0 = no response (offline, CORS, timeout). `message` is a sentence a student can read. */
export class StudentApiError extends Error {
  readonly status: number;
  readonly code?: M2ErrorCode;
  readonly details?: Record<string, unknown>;
  constructor(status: number, message: string, code?: M2ErrorCode, details?: Record<string, unknown>) {
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

function signOutToLogin() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  window.location.replace("/login"); // a full load: drop every cached query of the old session
}

async function request<T>(service: "tests" | "users", path: string, params?: Record<string, string | number | undefined | null>, signal?: AbortSignal): Promise<T> {
  const url = new URL(`${API_GATEWAY}/${service}${path}`);
  for (const [k, v] of Object.entries(params || {})) if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
  const token = typeof window !== "undefined" ? localStorage.getItem(AUTH_TOKEN_KEY) : null;
  let res: Response;
  try {
    res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {}, cache: "no-store", signal });
  } catch (e) {
    if ((e as Error)?.name === "AbortError") throw e;
    throw new StudentApiError(0, "You seem to be offline. Check your connection and try again.");
  }
  const body = (await res.json().catch(() => null)) as ApiOk<T> | ApiErrorBody | null;
  return unwrap<T>(res.status, body);
}

function unwrap<T>(status: number, body: ApiOk<T> | ApiErrorBody | null): T {
  if (status === 401) {
    // Expired or missing session: same as the axios client (lib/api.ts) does for every other call.
    signOutToLogin();
    throw new StudentApiError(401, "Please sign in again.");
  }
  if (status < 200 || status >= 300 || !body || body.success !== true) {
    const e = body && body.success === false ? body : null;
    throw new StudentApiError(status, e?.message || "Something went wrong. Please try again.", e?.code, e?.details);
  }
  return body.data;
}

/**
 * Home's data is requested by an inline script in the page's HTML (homeEarlyFetchScript), in parallel with the
 * app's JavaScript instead of after it: on a slow phone that is most of the time to the first useful screen.
 * The first Home query takes that response if it is fresh; every later one fetches as usual.
 */
type Early = { at: number; p: Promise<{ status: number; body: unknown }> };
function takeEarlyHome(): Promise<StudentHome> | null {
  const w = window as unknown as { __iitpHome?: Early };
  const early = w.__iitpHome;
  delete w.__iitpHome;
  if (!early || Date.now() - early.at > 15_000) return null;
  return early.p.then(
    (r) => unwrap<StudentHome>(r.status, r.body as ApiOk<StudentHome> | ApiErrorBody | null),
    () => {
      throw new StudentApiError(0, "You seem to be offline. Check your connection and try again.");
    }
  );
}

/** The inline script for the Home page: starts GET /tests/student/home while the app's JavaScript loads. */
export function homeEarlyFetchScript(): string {
  const url = JSON.stringify(`${API_GATEWAY}/tests/student/home`);
  const key = JSON.stringify(AUTH_TOKEN_KEY);
  return `(function(){try{var t=localStorage.getItem(${key});if(!t||location.pathname!=="/")return;window.__iitpHome={at:Date.now(),p:fetch(${url},{headers:{Authorization:"Bearer "+t},cache:"no-store"}).then(function(r){return r.json().catch(function(){return null}).then(function(b){return{status:r.status,body:b}})})}}catch(e){}})();`;
}

const get = <T,>(path: string, params?: Record<string, string | number | undefined | null>, signal?: AbortSignal) =>
  request<T>("tests", path, params, signal);

export const studentApi = {
  /** GET /users/auth/me: the signed-in student's name for the avatar (the session token carries none) */
  me: () => request<{ _id: string; name?: string; email?: string }>("users", "/auth/me"),
  /** GET /tests/student/home: Student-Home and Phone-Home in one call */
  home: (signal?: AbortSignal) => takeEarlyHome() ?? get<StudentHome>("/student/home", undefined, signal),
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
};
