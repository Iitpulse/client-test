import type { Metadata, Viewport } from "next";
import { Paper } from "@iitpulse/ui";
import { earlyFetchScript } from "@/lib/student-api";
import { brandBootScript } from "@/lib/brand-shared";
import { BrandEffects } from "@/components/brand/brand-logo";
import { studentFonts } from "../fonts";
import "../globals.css";

// Root layout of every student route except the frozen NTA exam screens, which live in (exam) with their own
// root layout and CSS. Moving between the two is a full page load, so none of this CSS reaches the exam.

export const metadata: Metadata = {
  title: "IIT-PULSE",
  description: "Mock tests, results and study plans for students",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover", // safe-area insets for the phone tab bar
  interactiveWidget: "resizes-content", // the on-screen keyboard shrinks the layout instead of covering inputs
  themeColor: "#F4F5FA",
};

const EARLY_FETCH_SRC = `data:text/javascript;charset=utf-8,${encodeURIComponent(earlyFetchScript())}`;

export default function StudentRootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={studentFonts} suppressHydrationWarning>
      <head>
        {/*
          M7b tenant theming before the first paint (lib/brand-shared.ts): on another institute's host this writes the
          link to its theme stylesheet and sets <html data-brand>; for IIT-PULSE (no cookie) it does nothing.
        */}
        <script dangerouslySetInnerHTML={{ __html: brandBootScript() }} />
      </head>
      <body>
        {/*
          Signed in: the first refresh, and for Home (/) and a result (/results/:testId) their data requests, start
          while the JavaScript downloads (mobile LCP budget; lib/student-api.ts earlyFetchScript). An async script
          from a data: URL, so it runs at once: an inline script would wait for the stylesheets to load (about
          0.6 s on Slow 4G), and next/script's beforeInteractive waits for Next's own runtime. This layout is only
          rendered into the first HTML, never re-rendered on the client.
        */}
        <script async src={EARLY_FETCH_SRC} />
        {/* The classroom ground: graph-grid paper, grain as one fixed layer (data-surface="student"). */}
        <Paper surface="student" className="min-h-dvh">
          {children}
        </Paper>
        <BrandEffects />
      </body>
    </html>
  );
}
