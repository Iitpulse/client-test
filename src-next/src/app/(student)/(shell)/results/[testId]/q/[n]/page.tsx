import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ReviewView } from "@/components/student/review-view";

export const metadata: Metadata = { title: "Question review · IIT-PULSE" };

// Phone-Review: one question at a time (?filter=all|correct|wrong|skipped|review). n is the paper's number.
export default async function ReviewPage({ params }: { params: Promise<{ testId: string; n: string }> }) {
  const { testId, n } = await params;
  const num = Number(n);
  if (!Number.isInteger(num) || num < 1) notFound();
  return (
    <Suspense>
      <ReviewView testId={testId} n={num} />
    </Suspense>
  );
}
