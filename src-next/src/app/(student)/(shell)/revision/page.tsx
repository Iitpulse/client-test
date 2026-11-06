import type { Metadata } from "next";
import "@/app/m4.css";
import { RevisionView } from "@/components/student/revision-view";

export const metadata: Metadata = { title: "Revision list · IIT-PULSE" };

// Student-Revision / Phone-Revision (batch 7, canvas v180): its own navigation item since 6 Nov 2026.
export default function RevisionPage() {
  return <RevisionView />;
}
