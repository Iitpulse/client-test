import type { Metadata } from "next";
import { ClassesView } from "@/components/student/classes-view";

export const metadata: Metadata = { title: "Class · IIT-PULSE" };

/** /classes/<id> (links in the bell, class emails and SMS): All classes with that class's detail open. */
export default async function ClassPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ClassesView openId={decodeURIComponent(id)} />;
}
