"use client";

// Mounted once in the signed-in student shell: after a sign-in (once per session token) it asks
// GET /users/student/me/onboarding and, while `required`, opens "Complete your profile" over the page.
// The wizard's code loads only then. Any failure (Mongo stacks answer 501, offline) shows nothing.
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useAuthHydrated, useAuthStore } from "@/stores/auth.store";
import { auth } from "@/lib/session";
import type { OnboardingResponse } from "@/types/m6-auth";
import { askedThisSession, markAsked, onboardingApi } from "./onboarding-api";
import { legalSettled } from "@/lib/legal-api";

const OnboardingWizard = dynamic(() => import("./onboarding-wizard").then((m) => m.OnboardingWizard), { ssr: false });

export function OnboardingPrompt() {
  const hydrated = useAuthHydrated();
  const user = useAuthStore((s) => s.currentUser);
  const [data, setData] = useState<OnboardingResponse | null>(null);

  useEffect(() => {
    if (!hydrated || !user || user.userType !== "student") return;
    const token = auth.getToken();
    if (!token || askedThisSession(token)) return;
    const ctl = new AbortController();
    // Off the first paint: Home's own data comes first.
    const t = setTimeout(() => {
      // The terms dialog goes first
      legalSettled()
        .then(() => (ctl.signal.aborted ? Promise.reject(new DOMException("aborted", "AbortError")) : onboardingApi.get(ctl.signal)))
        .then((d) => {
          markAsked(token);
          if (d.required) setData(d);
        })
        .catch(() => {});
    }, 600);
    return () => {
      clearTimeout(t);
      ctl.abort();
    };
  }, [hydrated, user]);

  if (!data || !user) return null;
  return <OnboardingWizard studentId={user.id} data={data} onClose={() => setData(null)} />;
}
