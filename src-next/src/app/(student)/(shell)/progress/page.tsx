import type { Metadata } from "next";
import "@/app/m4.css";
import "katex/dist/katex.min.css"; // plan items are text with inline LaTeX (MathText)
import { ProgressView } from "@/components/student/progress-view";

export const metadata: Metadata = { title: "Progress · IIT-PULSE" };

// Student-Progress / Phone-Progress (M4).
export default function ProgressPage() {
  return <ProgressView />;
}
