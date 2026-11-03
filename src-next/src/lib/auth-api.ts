// The public sign-in calls (password, sign-in link, password reset) on plain fetch. The sign-in screens are the
// first thing a student loads, often on a slow phone connection, so they do not pull in axios (lib/api.ts).
const API_GATEWAY = process.env.NEXT_PUBLIC_API_GATEWAY || "http://localhost:8000";

/** Every error body from the services: { success: false, message, code, error: { code, message } } */
export interface ApiErrorBody {
  success?: false;
  message?: string;
  code?: string;
  error?: { code?: string; message?: string };
}

/** Why a sign-in link (access key) was refused: POST /student/auth/login-with-key answers 401 with one of these. */
export type LinkErrorCode = "LINK_INVALID" | "LINK_EXPIRED" | "LINK_REVOKED";

/**
 * HTTP status and machine-readable code of a failed call (status 0 = no response: offline, CORS, timeout).
 * Works for these fetch calls and for axios errors from lib/api.ts (both carry `response.status/data`).
 */
export function apiError(err: unknown): { status: number; code?: string; message?: string } {
  const res = (err as { response?: { status?: number; data?: ApiErrorBody } })?.response;
  if (!res) return { status: 0 };
  const data = res.data;
  return { status: res.status ?? 0, code: data?.code ?? data?.error?.code, message: data?.message ?? data?.error?.message };
}

async function post<T>(path: string, body: unknown): Promise<{ status: number; data: T }> {
  let res: Response;
  try {
    res = await fetch(`${API_GATEWAY}/users${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw { response: undefined }; // network failure: apiError() reports status 0
  }
  const data = (await res.json().catch(() => ({}))) as T & ApiErrorBody;
  if (!res.ok) throw { response: { status: res.status, data } };
  return { status: res.status, data };
}

export const authApi = {
  /** POST /users/auth/login: { success, data: { token } } */
  login: (credentials: { email: string; password: string }) =>
    post<{ success: boolean; data?: { token?: string }; token?: string; message?: string }>("/auth/login", credentials),
  /** Exchange a test access key (from a /auth/<key>/<testId> link or typed in) for a session */
  loginWithKey: (key: string) =>
    post<{ success: boolean; data: { token: string; testId: string; student: { id: string; name?: string; email?: string } } }>(
      "/student/auth/login-with-key",
      { key }
    ),
  /** Password reset by email link. The link opens /reset-password?token=... in the student app. */
  passwordReset: {
    /** Always 200 with the same generic message (no account enumeration); 429 TOO_MANY_ATTEMPTS when throttled. */
    request: (email: string) => post<{ success: boolean; message: string }>("/reset-password/request", { email, app: "student" }),
    /** Checks a link without using it up. 400 RESET_TOKEN_INVALID for a bad, used or expired link. */
    verify: (token: string) => post<{ success: boolean; data: { email: string; expiresAt: string } }>("/reset-password/verify", { token }),
    /** Sets the password (6-128 characters) and uses the link up. 400 RESET_TOKEN_INVALID as above. */
    reset: (token: string, newPassword: string) => post<{ success: boolean; message: string }>("/reset-password/reset", { token, newPassword }),
  },
};
