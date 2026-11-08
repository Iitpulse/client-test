import type { Metadata } from "next";
import "@/app/m4.css"; // the settings nav and the switches
import "@/app/b9-auth.css"; // the code box
import { ReachView } from "@/components/student/reach-view";

export const metadata: Metadata = { title: "How we reach you · IIT-PULSE" };

/** Student-ReachYou (batch 9): Profile › How we reach you. */
export default function ReachPage() {
  return <ReachView />;
}
