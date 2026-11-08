"use client";

// Student-ErrorPages "Page error" outside the app frame: a render error on a sign-in page, or in the signed-in
// frame itself (the (shell) pages have their own error.tsx inside the frame).
import { useEffect } from "react";
import { ErrorScreen, errorCode } from "@/components/student/error-screen";

export default function StudentError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main className="flex min-h-dvh flex-col">
      <ErrorScreen
        tone="red"
        role="alert"
        title="Couldn't open this page"
        body="Something failed on our side. Your answers, scores and results are safe. Try again in a moment."
        bodyShort="Your answers and results are safe. Try again in a moment."
        primary={{ label: "Try again", onClick: reset }}
        secondary={{ label: "Go to Home", href: "/", hard: true }}
        code={errorCode(error)}
      />
    </main>
  );
}
