"use client";

// Kit-States: the global error page (a crash in a root layout). It replaces the whole document, so it carries its
// own <html>, fonts and the student CSS. The frozen exam screens have their own root layout and are not changed.
import { useEffect } from "react";
import { Paper } from "@iitpulse/ui";
import { studentFonts } from "./fonts";
import "./globals.css";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  const code = error.digest ? `E-${error.digest.slice(0, 4).toUpperCase()}` : "E-0000";
  return (
    <html lang="en" className={studentFonts}>
      <body>
        <Paper surface="student" className="min-h-dvh">
          <main className="col min-h-dvh items-center justify-center px-4">
            <section className="card st-card w-full max-w-[560px]" role="alert">
              <span className="st-ico red" aria-hidden="true">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7.5v5.5M12 16.5h.01" />
                </svg>
              </span>
              <h1 className="h2" style={{ margin: 0 }}>
                IIT-PULSE couldn&apos;t load
              </h1>
              <p className="body muted" style={{ margin: 0 }}>
                Something went wrong on our side. Your answers and results are safe. Try again in a moment.
              </p>
              <div className="st-acts">
                <button type="button" className="btn btn-lg btn-primary max-md:w-full" onClick={reset}>
                  Try again
                </button>
                {/* a plain link: the app's router may be what failed */}
                {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- a full page load on purpose: the root layout crashed, so the client router can't be trusted */}
                <a href="/" className="btn btn-lg btn-ghost max-md:w-full">
                  Go home
                </a>
              </div>
              <span className="xs muted mono">Code {code}</span>
            </section>
          </main>
        </Paper>
      </body>
    </html>
  );
}
