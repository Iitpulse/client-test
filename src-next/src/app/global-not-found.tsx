import type { Metadata } from "next";
import Link from "next/link";
import { InkUnderline, Paper } from "@iitpulse/ui";
import { studentFonts } from "./fonts";
import "./globals.css";

// 404 for unmatched URLs. The app has two root layouts, (student) and (exam), and no app/layout.tsx, so
// there is no single layout a root not-found.tsx could render in. Next skips rendering and serves this
// full document instead (experimental.globalNotFound in next.config.ts).

export const metadata: Metadata = {
  title: "Page not found · IIT-PULSE",
};

export default function GlobalNotFound() {
  return (
    <html lang="en" className={studentFonts}>
      <body>
        <Paper surface="student" className="min-h-dvh">
          <main className="col min-h-dvh items-center justify-center gap-3 px-4 text-center">
            <h1 className="h1">
              Page not <InkUnderline delay={300}>found</InkUnderline>
            </h1>
            <p className="body muted m-0">This page does not exist.</p>
            <Link href="/" className="btn btn-secondary mt-2">
              Go to your tests
            </Link>
          </main>
        </Paper>
      </body>
    </html>
  );
}
