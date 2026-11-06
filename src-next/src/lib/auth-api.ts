// The public sign-in calls (password, sign-in link, test key, password reset, sign-up) on plain fetch. The sign-in
// screens are the first thing a student loads, often on a slow phone connection, so they do not pull in axios
// (lib/api.ts). Contract: api-ai docs/m6-api.md "Auth, re-auth, profile", "Public sign-up", "Student test links";
// types in types/m6-auth.ts.
import type {
  LinkErrorCode,
  LoginRequest,
  LoginWithKeyResponse,
  PromoCheckResponse,
  SignupRequest,
  SignupResponse,
} from "@/types/m6-auth";
import { auth } from "./session";

const API_GATEWAY = process.env.NEXT_PUBLIC_API_GATEWAY || "http://localhost:8000";

export type { LinkErrorCode };

/** Every error body from the services: { success: false, message, code, error: { code, message, details? }, details? } */
export interface ApiErrorBody {
  success?: false;
  message?: string;
  code?: string;
  details?: Record<string, unknown>;
  error?: { code?: string; message?: string; details?: Record<string, unknown> };
}

/**
 * HTTP status, machine-readable code and details of a failed call (status 0 = no response: offline, CORS, timeout).
 * Works for these fetch calls and for axios errors from lib/api.ts (both carry `response.status/data`).
 */
export function apiError(err: unknown): { status: number; code?: string; message?: string; details?: Record<string, unknown> } {
  const res = (err as { response?: { status?: number; data?: ApiErrorBody } })?.response;
  if (!res) return { status: 0 };
  const data = res.data;
  return {
    status: res.status ?? 0,
    code: data?.code ?? data?.error?.code,
    message: data?.message ?? data?.error?.message,
    details: data?.details ?? data?.error?.details,
  };
}

async function call<T>(method: "GET" | "POST", path: string, body?: unknown, withCookies = false): Promise<{ status: number; data: T }> {
  let res: Response;
  try {
    res = await fetch(`${API_GATEWAY}/users${path}`, {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
      // M7b: the sign-in answers set the refresh cookie (HttpOnly, on the API host)
      ...(withCookies ? { credentials: "include" as const } : {}),
    });
  } catch {
    throw { response: undefined }; // network failure: apiError() reports status 0
  }
  const data = (await res.json().catch(() => ({}))) as T & ApiErrorBody;
  if (!res.ok) throw { response: { status: res.status, data } };
  return { status: res.status, data };
}
const post = <T>(path: string, body: unknown) => call<T>("POST", path, body);
/** A sign-in call: auth v2 cookie session (api-users docs/m7b-auth.md) */
const signIn = <T>(path: string, body: Record<string, unknown>) => call<T>("POST", path, { ...body, session: "cookie" }, true);
/**
 * Test-key sign-in and sign-up run outside /users/auth, where the refresh cookie is not sent, so api-users cannot end
 * the earlier account's session itself (docs/m7b-auth.md §3 "Account switch"): end it first, then sign in.
 */
const signInElsewhere = async <T>(path: string, body: Record<string, unknown>) => {
  if (auth.isAuthenticated()) await auth.signOut();
  return signIn<T>(path, body);
};
const get = <T>(path: string) => call<T>("GET", path);

type Ok<T> = { success: true; data: T };

/**
 * Where to go after signing in: `next` when it is a same-origin path ("/tests/x/start"), else `fallback`.
 * Anything else ("//evil.com", "https://…", "/\\evil") is ignored (Kit-States: signing in returns to the same page).
 */
export function safeNext(next: string | null | undefined, fallback = "/"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  try {
    const u = new URL(next, "http://x.invalid");
    if (u.origin !== "http://x.invalid") return fallback;
    if (u.pathname.startsWith("/login") || u.pathname.startsWith("/signup")) return fallback;
    return u.pathname + u.search + u.hash;
  } catch {
    return fallback;
  }
}

export const authApi = {
  /**
   * POST /users/auth/login with app "student": { success, data: { token } }. 401 wrong email or password,
   * 429 LOGIN_LOCKED { retryAfterSeconds }, 403 ACCOUNT_DISABLED, 403 STAFF_ACCOUNT { adminUrl }.
   */
  login: (credentials: { email: string; password: string }) =>
    signIn<{ success: boolean; data?: { token?: string; expiresAt?: string; status?: string }; token?: string; message?: string }>("/auth/login", { ...credentials, app: "student" } satisfies LoginRequest),
  /**
   * Exchange a test key (from a /auth/<key>/<testId> link or typed in) for a session. 404 LINK_INVALID,
   * 410 LINK_EXPIRED / LINK_REVOKED, 409 LINK_USED (a 6-character link signs in once), 429 TOO_MANY_ATTEMPTS.
   */
  loginWithKey: (key: string) => signInElsewhere<Ok<LoginWithKeyResponse>>("/student/auth/login-with-key", { key }),
  /** Password reset by email link. The link opens /reset-password?token=... in the student app. */
  passwordReset: {
    /** Always 200 with the same generic message (no account enumeration); 429 TOO_MANY_ATTEMPTS when throttled. */
    request: (email: string) => post<{ success: boolean; message: string }>("/reset-password/request", { email, app: "student" }),
    /** Checks a link without using it up. 400 RESET_TOKEN_INVALID { reason: invalid | expired | used }. */
    verify: (token: string) => post<{ success: boolean; data: { email: string; expiresAt: string } }>("/reset-password/verify", { token }),
    /** Sets the password (at least 8 characters) and uses the link up. 400 RESET_TOKEN_INVALID as above, WEAK_PASSWORD. */
    reset: (token: string, newPassword: string) => post<{ success: boolean; message: string }>("/reset-password/reset", { token, newPassword }),
  },
  signup: {
    /** POST /users/otp/email/send: 409 EMAIL_TAKEN; 429 OTP_COOLDOWN { retryAfterSeconds }. Dev stacks answer `devOtp`. */
    sendCode: (email: string) => post<{ success: boolean; message?: string }>("/otp/email/send", { email }),
    /** POST /users/otp/email/verify: 400 OTP_WRONG { triesLeft }; 410 OTP_EXPIRED */
    verifyCode: (email: string, code: string) => post<{ success: boolean }>("/otp/email/verify", { email, emailotp: code }),
    /** GET /users/public/promo/:code: 400 PROMO_LENGTH; 404 PROMO_INVALID */
    promo: (code: string) => get<Ok<PromoCheckResponse>>(`/public/promo/${encodeURIComponent(code)}`),
    /** POST /users/student/create-student: answers a session token. 400 VALIDATION_ERROR { fields }, 409 EMAIL_TAKEN / PHONE_TAKEN, 404 PROMO_INVALID */
    create: (body: SignupRequest) => signInElsewhere<Ok<SignupResponse>>("/student/create-student", body as unknown as Record<string, unknown>),
  },
};
