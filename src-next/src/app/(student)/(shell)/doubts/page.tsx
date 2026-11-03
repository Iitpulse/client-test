import type { Metadata } from "next";
import { ComingSoon } from "@/components/shell/coming-soon";

export const metadata: Metadata = { title: "Doubts · IIT-PULSE" };

export default function DoubtsPage() {
  return <ComingSoon title="Doubts" body="Soon you can ask about any question from your tests and get a step-by-step answer here." />;
}
