import type { Metadata } from "next";
import { ResultView } from "@/components/student/result-view";

export const metadata: Metadata = { title: "Result · IIT-PULSE" };

// Student-Result / Phone-Result (published), Student-ResultPending (pending, and hidden with its reason).
export default async function ResultPage({ params }: { params: Promise<{ testId: string }> }) {
  const { testId } = await params;
  return <ResultView testId={testId} />;
}
