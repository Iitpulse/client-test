import type { Metadata } from "next";
import { ClassesView } from "@/components/student/classes-view";

export const metadata: Metadata = { title: "Classes · IIT-PULSE" };

/** Student-Classes: every class for the student in the next 62 days, by day. */
export default function ClassesPage() {
  return <ClassesView />;
}
