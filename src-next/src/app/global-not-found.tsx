import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import "./globals.css";

// 404 for unmatched URLs. The app has two root layouts, (student) and (exam), and no app/layout.tsx, so
// there is no single layout a root not-found.tsx could render in. Next skips rendering and serves this
// full document instead (experimental.globalNotFound in next.config.ts).

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Page not found | IITP Test Portal",
};

export default function GlobalNotFound() {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        <main className="flex min-h-screen items-center justify-center px-4">
          <div className="text-center">
            <h1 className="text-2xl font-semibold">Page not found</h1>
            <p className="mt-2 text-muted-foreground">This page does not exist.</p>
            <Link href="/" className="mt-4 inline-block text-blue-600 underline">
              Go to your tests
            </Link>
          </div>
        </main>
      </body>
    </html>
  );
}
