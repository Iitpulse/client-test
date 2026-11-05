import type { Metadata } from "next";
import "@/app/m4.css";
import "katex/dist/katex.min.css"; // question previews and answers carry inline LaTeX (MathText)
import { DoubtsView } from "@/components/student/doubts-view";

export const metadata: Metadata = { title: "Doubts · IIT-PULSE" };

// Student-Doubts / Phone-Doubts (M4): the student's threads with the AI tutor. ?thread= selects one on desktop.
export default async function DoubtsPage({ searchParams }: { searchParams: Promise<{ thread?: string }> }) {
  const { thread } = await searchParams;
  return <DoubtsView initialThread={typeof thread === "string" && thread ? thread : null} />;
}
