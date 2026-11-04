import type { Metadata } from "next";
import "katex/dist/katex.min.css"; // questions and solutions render with MathText (KaTeX)
import { PracticeView } from "@/components/student/practice-view";

export const metadata: Metadata = { title: "Practice · IIT-PULSE" };

// A practice set (M4), made from Progress or the study plan.
export default async function PracticePage({ params }: { params: Promise<{ setId: string }> }) {
  const { setId } = await params;
  return <PracticeView setId={setId} />;
}
