"use client";

import { useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuthStore, useTestStore } from "@/stores";

// This page handles direct links like /auth/{token}/{testId}
// It authenticates with the token from the URL and redirects to instructions
export default function AuthWithURIPage() {
  const router = useRouter();
  const params = useParams();
  const { setTestId, login, checkAuth } = useAuthStore();
  const { fetchTest } = useTestStore();
  const hasProcessed = useRef(false);

  useEffect(() => {
    // Prevent double execution in strict mode
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const token = params.user as string;
    const testId = params.testId as string;

    if (!testId) {
      router.push("/login");
      return;
    }

    // Set the test ID
    setTestId(testId);

    // If a token is provided in the URL, use it to authenticate
    if (token && token.length > 50) {
      // JWT tokens are typically > 100 chars, this filters out non-token values
      try {
        // Login with the provided token
        login(token);

        // Fetch test and go to instructions
        fetchTest(testId)
          .then(() => {
            router.push("/instructions");
          })
          .catch((error) => {
            console.error("Failed to fetch test:", error);
            router.push("/login");
          });
      } catch (error) {
        console.error("Failed to authenticate with URL token:", error);
        router.push("/login");
      }
    } else {
      // No token in URL, check if already authenticated
      if (checkAuth()) {
        fetchTest(testId)
          .then(() => {
            router.push("/instructions");
          })
          .catch(() => {
            router.push("/login");
          });
      } else {
        router.push("/login");
      }
    }
  }, [params, setTestId, login, checkAuth, fetchTest, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
        <p className="text-muted-foreground">Loading test...</p>
      </div>
    </div>
  );
}
