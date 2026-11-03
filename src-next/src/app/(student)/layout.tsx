import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../globals.css";

// Root layout of every student route except the frozen NTA exam screens, which live in (exam).

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "IITP Test Portal",
  description: "Online Test Portal for Students",
};

export default function StudentRootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
