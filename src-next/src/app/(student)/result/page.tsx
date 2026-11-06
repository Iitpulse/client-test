import type { Metadata } from "next";
import { SubmittedView } from "@/components/student/submitted-view";
import "@/app/m4.css"; // the "Email me" switch (.sw)

export const metadata: Metadata = { title: "Test submitted · IIT-PULSE" };

// Student-Submitted: the frozen /test opens /result after a submit (its route is unchanged). This page shows the
// receipt and when the result comes out, and sends a submit the exam handed over (lib/submit-handoff.ts).
export default function ResultPage() {
  return <SubmittedView />;
}
