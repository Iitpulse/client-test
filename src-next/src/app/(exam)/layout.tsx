import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./nta.css";
import { UITemplateProvider } from "@/components/nta/ui-template.context";

// Root layout of the frozen NTA exam screens (/instructions, /test). They must stay pixel-identical to the
// NTA layout, so this layout, nta.css and components/nta/ are never restyled with the rest of the student app.
// Moving between this root layout and (student) is a full page load, so no student-app CSS reaches the exam.

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "IITP Test Portal",
  description: "Online Test Portal for Students",
};

export default function ExamRootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        <UITemplateProvider>
          {children}
        </UITemplateProvider>
      </body>
    </html>
  );
}
