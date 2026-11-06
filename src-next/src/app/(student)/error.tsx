"use client";

// Kit-States: the student app's error page (a render error in any student route). The frame of the page that
// failed is gone, so this draws the calm error card on the paper with a way home; "Try again" re-renders the route.
import { useEffect } from "react";
import Link from "next/link";
import { StateIco, supportCode } from "@/components/student/states";

export default function StudentError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  const code = error.digest ? `E-${error.digest.slice(0, 4).toUpperCase()}` : supportCode(error);
  return (
    <main className="col min-h-dvh items-center justify-center px-4">
      <section className="card st-card w-full max-w-[560px]" role="alert">
        <StateIco tone="red" icon="warn" />
        <h1 className="h2 max-md:text-[22px]" style={{ margin: 0 }}>
          Couldn&apos;t open this page
        </h1>
        <p className="body muted" style={{ margin: 0 }}>
          Something went wrong on our side. Your answers and results are safe. Try again in a moment.
        </p>
        <div className="st-acts">
          <button type="button" className="btn btn-lg btn-primary max-md:w-full" onClick={reset}>
            Try again
          </button>
          <Link href="/" className="btn btn-lg btn-ghost max-md:w-full">
            Go home
          </Link>
        </div>
        <span className="xs muted mono">Code {code}</span>
      </section>
    </main>
  );
}
