// Test-card wording (Student-Tests, Phone-Tests). Kept apart from labels.ts so Home does not load it.
import type { TestCard } from "@/types/m2-student";
import { dayMonth, daysFrom, relativeDayTime } from "@/lib/time";
import { num } from "./labels";

/** The status badge of a test card (Student-Tests and Phone-Tests). */
export function cardBadge(t: TestCard, now: number, phone = false): { text: string; cls: string } {
  switch (t.state) {
    case "live":
      return { text: "Live now", cls: "b-live" };
    case "in_progress":
      return { text: "In progress", cls: "b-live" };
    case "upcoming": {
      const d = daysFrom(now, t.opensAt);
      if (phone) return { text: d === 0 ? "Today" : d === 1 ? "Tomorrow" : dayMonth(t.opensAt), cls: "b-navy" };
      return { text: d === 0 ? "Opens today" : d === 1 ? "Tomorrow" : `In ${d} days`, cls: "b-navy" };
    }
    case "ended":
      return { text: "Missed", cls: "b-grey" };
    case "submitted": {
      const v = t.result?.visibility;
      const h = t.result?.headline;
      if (v?.status === "published" && h) return { text: phone ? `${num(h.score)}/${num(h.maxScore)}` : "Result out", cls: "b-green" };
      if (v?.status === "pending")
        return v.availableAt ? { text: `Result ${phone ? "" : "on "}${dayMonth(v.availableAt)}`, cls: "b-amber" } : { text: "Result pending", cls: "b-amber" };
      return { text: "Result not shared", cls: "b-grey" };
    }
  }
}

/** "Ends today, 9:00 PM" / "Sun 15 Nov, 10:00 AM" / "Taken 1 Nov" */
export function cardWhen(t: TestCard, now: number): string {
  if (t.state === "live") return `Ends ${relativeDayTime(now, t.closesAt)}`;
  if (t.state === "in_progress" && t.attempt) return `Time up ${relativeDayTime(now, t.attempt.expiresAt)}`;
  if (t.state === "upcoming") {
    const s = relativeDayTime(now, t.opensAt);
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  if (t.state === "submitted" && t.submittedAt) return `Taken ${dayMonth(t.submittedAt)}`;
  return `Closed ${dayMonth(t.closesAt)}`;
}

