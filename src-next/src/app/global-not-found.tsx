import type { Metadata } from "next";
import { Paper } from "@iitpulse/ui";
import { ErrorScreen } from "@/components/student/error-screen";
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
        <Paper surface="student" className="flex min-h-dvh flex-col">
          {/* Student-ErrorPages "Not found": no app frame here (no layout to render in), the same copy as inside it */}
          <main className="flex min-h-dvh flex-col">
            <ErrorScreen
              mark="404"
              title="Page not found"
              body="The link may be old or mistyped. Everything of yours is where it was."
              bodyShort="The link may be old or mistyped."
              primary={{ label: "Go to Home", href: "/" }}
              secondary={{ label: "See your tests", href: "/tests" }}
            />
          </main>
        </Paper>
      </body>
    </html>
  );
}
