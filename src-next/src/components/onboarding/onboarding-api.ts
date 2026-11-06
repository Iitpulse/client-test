// "Complete your profile" calls (api-users, M6): GET /users/student/me/onboarding, PATCH /users/student/:id/onboarding
// (partial save per step, `complete: true` on "Save profile"), POST /users/student/me/onboarding/skip.
import { request } from "@/lib/student-api";
import type { OnboardingResponse, OnboardingSaveRequest } from "@/types/m6-auth";

export const onboardingApi = {
  get: (signal?: AbortSignal) => request<OnboardingResponse>("users", "/student/me/onboarding", undefined, signal),
  save: (studentId: string, body: OnboardingSaveRequest) =>
    request<{ onboarding?: OnboardingResponse } | null>("users", `/student/${encodeURIComponent(studentId)}/onboarding`, undefined, undefined, body, "PATCH"),
  skip: () => request<OnboardingResponse>("users", "/student/me/onboarding/skip", undefined, undefined, {}),
};

/**
 * The wizard opens once per sign-in while `required`: the session token it was shown for is remembered, so a new
 * sign-in (a new token) asks again, and reloading or opening another tab of the same session does not.
 */
const ASKED_KEY = "iitp-onboarding-asked";
export function askedThisSession(token: string): boolean {
  try {
    return localStorage.getItem(ASKED_KEY) === token.slice(-32);
  } catch {
    return false;
  }
}
export function markAsked(token: string) {
  try {
    localStorage.setItem(ASKED_KEY, token.slice(-32));
  } catch {}
}
