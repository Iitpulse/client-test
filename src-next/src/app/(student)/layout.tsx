import type { Metadata, Viewport } from "next";
import Script from "next/script";
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
        {/* Home (/) only, signed in: start its data request while the JavaScript loads (mobile LCP budget). */}
        <Script id="iitp-home-early" strategy="beforeInteractive">
          {homeEarlyFetchScript()}
        </Script>
        {/* The classroom ground: graph-grid paper, grain as one fixed layer (data-surface="student"). */}
        <Paper surface="student" className="min-h-dvh">
          {children}
        </Paper>
      </body>
    </html>
  );
}
