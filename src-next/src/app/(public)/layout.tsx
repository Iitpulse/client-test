import type { Metadata, Viewport } from "next";
import { Paper } from "@iitpulse/ui";
import { brandBootScript } from "@/lib/brand-shared";
import { BrandEffects } from "@/components/brand/brand-logo";
import { studentFonts } from "../fonts";
import "../globals.css";
import "../b9.css";

// Public pages a parent opens from an SMS (Parent-Reports, batch 9 rule 9): their own root layout, so nothing of the
// student session runs here (no refresh, no early fetch, no menu). The institute's branding still themes the page
// (the host's brand cookie, as on the sign-in screens). noindex; next.config.ts sends no-store for these paths.
export const metadata: Metadata = {
  title: "Result reports",
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#F4F5FA" };

export default function PublicRootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={studentFonts} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: brandBootScript() }} />
      </head>
      <body>
        <Paper surface="student" className="min-h-dvh">
          {children}
        </Paper>
        <BrandEffects />
      </body>
    </html>
  );
}
