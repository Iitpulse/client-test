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
          <main className="col min-h-dvh items-center justify-center px-4">
            {/* Kit-States "Not found · 404": short and calm, the way home */}
            <section className="card st-card w-full max-w-[560px]">
              <span className="num" aria-hidden="true" style={{ fontSize: 32, fontWeight: 650, color: "#C3C6EF", letterSpacing: "-.02em" }}>
                404
              </span>
              <h1 className="h2" style={{ margin: 0 }}>
                Page not <InkUnderline delay={300}>found</InkUnderline>
              </h1>
              <p className="body muted m-0">The link may be old or mistyped.</p>
              <div className="st-acts">
                <Link href="/" className="btn btn-lg btn-primary max-md:w-full">
                  Go home
                </Link>
              </div>
            </section>
          </main>
        </Paper>
      </body>
    </html>
  );
}
