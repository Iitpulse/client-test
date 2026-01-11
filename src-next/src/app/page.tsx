"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores";

// Root page redirects to appropriate page based on auth status
export default function HomePage() {
  const router = useRouter();
  const { checkAuth, isAuthenticated, testId } = useAuthStore();

  useEffect(() => {
    const isAuth = checkAuth();

    if (!isAuth || !isAuthenticated) {
      // Not authenticated, go to login
      router.push("/login");
    } else if (testId) {
      // Authenticated with test, go to test page
      router.push("/test");
    } else {
      // Authenticated but no test, go to login
      router.push("/login");
    }
  }, [checkAuth, isAuthenticated, testId, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
        <p className="text-muted-foreground">Redirecting...</p>
      </div>
    </div>
  );
}
