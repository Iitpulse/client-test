"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore, useAuthHydrated } from "@/stores";
import { Spinner } from "@/components/shell/icons";

// "/" is the Home tab. Until Student-Home ships (M2) it forwards: signed in -> /tests, signed out -> /login.
// (It used to jump straight into /test when a test id was remembered; the Tests list now offers Resume instead.)
export default function HomePage() {
  const router = useRouter();
  const { checkAuth } = useAuthStore();
  // Wait for the persisted session to be restored (SSR-safe)
  const hydrated = useAuthHydrated();

  useEffect(() => {
    if (!hydrated) return;
    router.replace(checkAuth() ? "/tests" : "/login");
  }, [hydrated, checkAuth, router]);

  return (
    <div className="flex min-h-dvh items-center justify-center text-brand" role="status" aria-label="Loading">
      <Spinner size={28} />
    </div>
  );
}
