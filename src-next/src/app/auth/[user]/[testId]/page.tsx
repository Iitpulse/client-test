"use client";

import { useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuthStore, useTestStore } from "@/stores";
import { api } from "@/lib/api";

/**
 * Direct-link entry: /auth/{key-or-token}/{testId}
 * - a short value is a test access key issued by the institute: it is exchanged for a session (SSO)
 * - a long value is a full session token (legacy links from the admin app)
 * Either way the student lands on the instructions for that test.
 */
export default function AuthWithURIPage() {
  const router = useRouter();
  const params = useParams();
  const { setTestId, login, checkAuth } = useAuthStore();
  const { fetchTest, reset } = useTestStore();
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return; // strict-mode double run
    hasProcessed.current = true;

    const credential = params.user as string;
    const testId = params.testId as string;
    if (!testId) {
      router.push("/login");
      return;
    }

    reset();
    setTestId(testId);

    const openTest = () =>
      fetchTest(testId)
        .then(() => router.push("/instructions"))
        .catch((error) => {
          console.error("Failed to fetch test:", error);
          router.push("/instructions"); // the instructions page shows the server's reason
        });

    if (credential && credential.length <= 32) {
      api.auth
        .loginWithKey(credential)
        .then((response) => {
          const data = response.data?.data;
          if (!data?.token) throw new Error("No token in key exchange response");
          login(data.token);
          setTestId(data.testId || testId);
          return openTest();
        })
        .catch((error) => {
          console.error("Access key rejected:", error);
          router.push(`/login-with-key?error=invalid`);
        });
    } else if (credential && credential.length > 50) {
      try {
        login(credential);
        openTest();
      } catch (error) {
        console.error("Failed to authenticate with URL token:", error);
        router.push("/login");
      }
    } else if (checkAuth()) {
      openTest();
    } else {
      router.push("/login");
    }
  }, [params, setTestId, login, checkAuth, fetchTest, reset, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
        <p className="text-muted-foreground">Opening your test…</p>
      </div>
    </div>
  );
}
