"use client";

// Student-ErrorPages "Page error": a render error in a signed-in page. It renders inside the app frame (the nav,
// phone header and tab bar keep working), names the page that failed and gives a support code.
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { ErrorScreen, errorCode } from "@/components/student/error-screen";

const PAGES: Record<string, string> = {
  "": "Home",
  tests: "Tests",
  progress: "Progress",
  revision: "Revision",
  doubts: "Doubts",
  profile: "your profile",
  results: "your result",
  practice: "your practice set",
};

export default function ShellError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const path = usePathname() ?? "/";
  useEffect(() => {
    console.error(error);
  }, [error]);
  const page = PAGES[path.split("/")[1] ?? ""] ?? "this page";
  return (
    <ErrorScreen
      tone="red"
      role="alert"
      doodle
      title="Couldn't open this page"
      body={`Something failed on our side while loading ${page}. Your answers, scores and results are safe. Try again in a moment.`}
      bodyShort="Your answers and results are safe. Try again in a moment."
      primary={{ label: "Try again", onClick: reset }}
      secondary={{ label: "Go to Home", href: "/" }}
      code={errorCode(error)}
      note="The top bar keeps working, so you can go somewhere else meanwhile."
    />
  );
}
