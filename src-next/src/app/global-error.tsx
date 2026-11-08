"use client";

// Student-ErrorPages "App error": a crash in a root layout (the app could not start). It replaces the whole
// document, so it carries its own <html>, fonts and the student CSS, and no app frame. The exam screens' normal
// rendering is untouched; this only shows when a root layout itself fails.
import { useEffect } from "react";
import { Paper } from "@iitpulse/ui";
import { ErrorScreen, errorCode } from "@/components/student/error-screen";
import { studentFonts } from "./fonts";
import "./globals.css";

export default function GlobalError({ error }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <html lang="en" className={studentFonts}>
      <body>
        <Paper surface="student" className="flex min-h-dvh flex-col">
          <main className="flex min-h-dvh flex-col">
            <ErrorScreen
              tone="red"
              role="alert"
              title="IIT-PULSE couldn't start"
              body="The app didn't load properly. Reloading usually fixes it. Your answers and results are saved on our side."
              bodyShort="Reload to try again. Your answers and results are saved."
              // a full reload: the root layout crashed, so neither React's reset nor the client router can be trusted
              primary={{ label: "Reload", onClick: () => window.location.reload() }}
              code={errorCode(error)}
              note="Still stuck? Try another browser, or tell your teacher the code above. If you were in a test, it's still running and your saved answers are kept."
            />
          </main>
        </Paper>
      </body>
    </html>
  );
}
