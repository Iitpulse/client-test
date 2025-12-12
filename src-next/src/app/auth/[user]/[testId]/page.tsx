"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuthStore, useTestStore } from "@/stores";

// This page handles direct links like /auth/{userId}/{testId}
// It sets up the test context and redirects to login or instructions
export default function AuthWithURIPage() {
  const router = useRouter();
  const params = useParams();
  const { setTestId, checkAuth, isAuthenticated } = useAuthStore();
  const { fetchTest } = useTestStore();

  useEffect(() => {
    const testId = params.testId as string;

    if (testId) {
      setTestId(testId);

      // Check if user is authenticated
      if (checkAuth() && isAuthenticated) {
        // Fetch test and go to instructions
        fetchTest(testId).then(() => {
          router.push("/instructions");
        });
      } else {
        // Redirect to login
        router.push("/login");
      }
    } else {
      router.push("/login");
    }
  }, [params, setTestId, checkAuth, isAuthenticated, fetchTest, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
        <p className="text-muted-foreground">Loading test...</p>
      </div>
    </div>
  );
}
