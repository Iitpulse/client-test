"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores";

// Root page redirects to appropriate page based on auth status
export default function HomePage() {
  const router = useRouter();
  const { checkAuth, isAuthenticated, testId } = useAuthStore();

  const [hydrated, setHydrated] = useState(useAuthStore.persist.hasHydrated());
  useEffect(() => useAuthStore.persist.onFinishHydration(() => setHydrated(true)), []);

  useEffect(() => {
    if (!hydrated) return;
    const isAuth = checkAuth();

    if (!isAuth || !isAuthenticated) {
      // Not authenticated, go to login
      router.push("/login");
    } else if (testId) {
      // Authenticated with test, go to test page
      router.push("/test");
    } else {
      // Authenticated but no test picked yet: show the student's tests
      router.push("/tests");
    }
  }, [hydrated, checkAuth, isAuthenticated, testId, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
        <p className="text-muted-foreground">Redirecting...</p>
      </div>
    </div>
  );
}
