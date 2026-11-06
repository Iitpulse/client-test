import type { Metadata } from "next";
import { QueryProvider } from "@/lib/query";
import { TestGate } from "@/components/student/test-gate";

export const metadata: Metadata = { title: "Start test · IIT-PULSE" };

// Student-TestGate: every "Start test" / "Resume test" / sign-in link lands here before the frozen /instructions.
export default async function TestGatePage({ params }: { params: Promise<{ testId: string }> }) {
  const { testId } = await params;
  return (
    <QueryProvider>
      <TestGate testId={decodeURIComponent(testId)} />
    </QueryProvider>
  );
}
