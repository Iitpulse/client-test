import type { Metadata } from "next";
import { QueryProvider } from "@/lib/query";
import { ResultPdf } from "@/components/student/result-pdf";
import "@/app/pdf.css";

export const metadata: Metadata = { title: "Result report · IIT-PULSE" };

// Student-ResultPDF: the print view behind "Download PDF" (outside the student shell: no nav, an A4 sheet).
export default async function ResultPdfPage({ params }: { params: Promise<{ testId: string }> }) {
  const { testId } = await params;
  return (
    <QueryProvider>
      <ResultPdf testId={decodeURIComponent(testId)} />
    </QueryProvider>
  );
}
