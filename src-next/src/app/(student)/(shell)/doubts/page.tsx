import type { Metadata } from "next";
import "@/app/m4.css";
import "katex/dist/katex.min.css"; // question previews carry inline LaTeX (MathText)
import { DoubtsView } from "@/components/student/doubts-view";

export const metadata: Metadata = { title: "Doubts · IIT-PULSE" };

// The Doubts tab (M4): the student's threads with the AI tutor.
export default function DoubtsPage() {
  return <DoubtsView />;
}
