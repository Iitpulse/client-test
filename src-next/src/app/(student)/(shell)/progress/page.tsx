import type { Metadata } from "next";
import { ComingSoon } from "@/components/shell/coming-soon";

export const metadata: Metadata = { title: "Progress · IIT-PULSE" };

export default function ProgressPage() {
  return <ComingSoon title="Progress" body="Your topic-by-topic progress and study plan will appear here. Until then, every result is under Tests." />;
}
