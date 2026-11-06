"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";

/** The test gate's URL (Student-TestGate): every Start / Resume goes through it before the frozen /instructions. */
export const gateHref = (testId: string) => `/tests/${encodeURIComponent(testId)}/start`;

/** Open the test gate for a test. */
export function useStartTestGate() {
  const router = useRouter();
  return useCallback((testId: string) => router.push(gateHref(testId)), [router]);
}
