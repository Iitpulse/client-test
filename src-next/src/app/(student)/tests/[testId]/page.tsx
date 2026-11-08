import { redirect } from "next/navigation";

/**
 * /tests/<testId>: the link in a "New test" / "opens soon" SMS and in the bell (api-users docs/sms-api.md §4, §7).
 * It opens the test gate (Student-TestGate), which says what the test needs and when it opens.
 */
export default async function TestLinkPage({ params }: { params: Promise<{ testId: string }> }) {
  const { testId } = await params;
  redirect(`/tests/${encodeURIComponent(decodeURIComponent(testId))}/start`);
}
