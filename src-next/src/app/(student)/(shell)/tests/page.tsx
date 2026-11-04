import type { Metadata } from "next";
import { Suspense } from "react";
import { TestsView } from "@/components/student/tests-view";

export const metadata: Metadata = { title: "Tests · IIT-PULSE" };

// Student-Tests / Phone-Tests. The view reads its filters from the URL (useSearchParams needs a Suspense boundary).
export default function TestsPage() {
  return (
    <Suspense>
      <TestsView />
    </Suspense>
  );
}
