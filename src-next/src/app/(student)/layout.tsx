import type { Metadata, Viewport } from "next";
import { Paper } from "@iitpulse/ui";
import { homeEarlyFetchScript } from "@/lib/student-api";
import { studentFonts } from "../fonts";
import "../globals.css";

// Root layout of every student route except the frozen NTA exam screens, which live in (exam) with their own
// root layout and CSS. Moving between the two is a full page load, so none of this CSS reaches the exam.

export const metadata: Metadata = {
  title: "IIT-PULSE",
  description: "Mock tests, results and study plans for JEE and NEET students",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover", // safe-area insets for the phone tab bar
  interactiveWidget: "resizes-content", // the on-screen keyboard shrinks the layout instead of covering inputs
  themeColor: "#F4F5FA",
};

export default function StudentRootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={studentFonts}>
      <body>
        {/*
          Home (/) only, signed in: start its data request while the JavaScript downloads (mobile LCP budget).
          A plain inline script, so it runs while the HTML is parsed (next/script's beforeInteractive waits for
          Next's own runtime). This layout is only rendered into the first HTML, never re-rendered on the client.
        */}
        <script dangerouslySetInnerHTML={{ __html: homeEarlyFetchScript() }} />
        {/* The classroom ground: graph-grid paper, grain as one fixed layer (data-surface="student"). */}
        <Paper surface="student" className="min-h-dvh">
          {children}
        </Paper>
      </body>
    </html>
  );
}
