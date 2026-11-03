import type { Metadata } from "next";
import { studentFonts } from "../fonts";
import "../globals.css";
import "katex/dist/katex.min.css"; // MathText on the boards

// Root layout of the dev-only kitchen sink (/_kitchen-sink). Its own root, so the boards render on their own
// <Paper> exactly as drawn, without the student layout's paper around them. Same CSS and fonts as the student app.
export const metadata: Metadata = {
  title: "Kitchen sink · IIT-PULSE",
  robots: { index: false, follow: false },
};

export default function KitchenSinkLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={studentFonts}>
      <body>{children}</body>
    </html>
  );
}
