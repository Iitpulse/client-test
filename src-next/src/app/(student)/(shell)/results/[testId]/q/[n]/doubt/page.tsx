import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PhoneDoubtView } from "@/components/student/doubt-chat";

export const metadata: Metadata = { title: "Doubt · IIT-PULSE" };

// Phone-Doubt: the AI tutor chat about one question (n = the paper's number). ?thread= opens that thread.
export default async function DoubtPage({ params, searchParams }: { params: Promise<{ testId: string; n: string }>; searchParams: Promise<{ thread?: string }> }) {
  const { testId, n } = await params;
  const { thread } = await searchParams;
  const num = Number(n);
  if (!Number.isInteger(num) || num < 1) notFound();
  return <PhoneDoubtView testId={testId} n={num} threadId={typeof thread === "string" && thread ? thread : null} />;
}
