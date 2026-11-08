"use client";

// Student-AssignedPractice (batch 8): practice a teacher assigned. Cards on Home (desktop: a row under the hero;
// phone: right after the hero) and the "From your teachers" list (Home desktop, top of Progress). From
// GET /tests/student/assignments (lib/assignments-api.ts); a started set is an M4 practice set on /practice/[setId].
// Late is allowed and marked; it never changes a score or rank.

import Link from "next/link";
import { useStartAssignment } from "@/lib/assignments-api";
import { StudentApiError } from "@/lib/student-api";
import { dayMonth, dowDayMonth, dowDayMonthTime, timeOf } from "@/lib/time";
import type { StudentAssignment } from "@/types/assignments";
import { Spinner } from "@/components/shell/icons";
import { cn } from "@/lib/utils";
import { num } from "./labels";

const enc = encodeURIComponent;

/** What a card or row says, from one assignment (the board's states: new, started, due today, late, finished). */
export function assignmentView(a: StudentAssignment) {
  const finished = a.state === "finished";
  const teacher = a.teacher.name ?? "your teacher";
  const size = `${num(a.size.questions)} questions · ${a.size.mode === "timed" ? "Timed drill" : "Practice"}`;
  const due = finished && a.finishedAt ? `Finished ${dowDayMonth(a.finishedAt)}` : a.late ? `Was due ${dowDayMonthTime(a.dueAt)}` : a.dueToday ? `Due today, ${timeOf(a.dueAt)}` : `Due ${dowDayMonthTime(a.dueAt)}`;
  const badge: { text: string; cls: string } | null = finished
    ? null
    : a.late
      ? { text: `Was due ${dowDayMonth(a.dueAt).split(" ")[0]}`, cls: "b-amber" }
      : a.dueToday
        ? { text: "Due today", cls: "b-amber" }
        : a.state === "new"
          ? { text: "New", cls: "b-navy" }
          : { text: `${num(a.progress.answered)} of ${num(a.progress.total)}`, cls: "b-grey" };
  const cta = finished ? "Review answers" : a.state === "started" ? (a.late ? "Finish it" : "Continue") : a.size.mode === "timed" ? "Start drill" : "Start practice";
  const total = Math.max(a.progress.total, 1);
  return {
    finished,
    teacher,
    size,
    due,
    badge,
    cta,
    bar: a.state !== "new",
    pct: Math.round((Math.min(a.progress.answered, total) / total) * 100),
    progress: `${num(a.progress.answered)} of ${num(a.progress.total)} done`,
    correct: finished ? `${num(a.correct)} correct` : `${num(a.correct)} correct so far`,
    lateNote: a.late && !finished ? "You can still finish it. Your teacher sees it as late; it never changes a score or rank." : null,
  };
}

function problemOf(err: unknown): string {
  const e = err instanceof StudentApiError ? err : null;
  if (e?.code === "NO_PRACTICE_QUESTIONS") return "There aren't enough questions for this set right now. Tell your teacher.";
  if (e?.code === "ASSIGNMENT_NOT_FOUND") return "This practice was withdrawn by your teacher.";
  if (e?.code === "PRACTICE_UNAVAILABLE" || (e && e.status >= 500)) return "Couldn't open the set just now. Try again in a moment.";
  return "Couldn't open the set. Try again.";
}

/** The card's button: opens a finished set, else starts (or reopens) it. */
function AssignmentCta({ a, label, className }: { a: StudentAssignment; label: string; className: string }) {
  const m = useStartAssignment();
  if (a.state === "finished" && a.setId) {
    return (
      <Link prefetch={false} href={`/practice/${enc(a.setId)}`} className={className}>
        {label}
      </Link>
    );
  }
  return (
    <span className="col items-start gap-1.5 max-md:items-stretch">
      <button type="button" className={className} disabled={m.isPending || m.isSuccess} aria-busy={m.isPending || undefined} onClick={() => m.mutate(a.id)}>
        {(m.isPending || m.isSuccess) && <Spinner size={14} />}
        {label}
      </button>
      {m.isError && (
        <span className="xs muted" role="status">
          {problemOf(m.error)}
        </span>
      )}
    </span>
  );
}

function From({ a }: { a: StudentAssignment }) {
  return (
    <span className="ap-from">
      <span className="avatar" aria-hidden="true" data-initials={a.teacher.initials} />
      From {a.teacher.name ?? "your teacher"}
    </span>
  );
}

/** One assignment as the board's card. `phone`: the compact phone card (full-width button, no reason line). */
export function AssignmentCard({ a, phone = false, className, style }: { a: StudentAssignment; phone?: boolean; className?: string; style?: React.CSSProperties }) {
  const v = assignmentView(a);
  return (
    <article className={cn("ap", a.late && !v.finished && "late", className)} style={style} aria-label="Practice from your teacher">
      {v.finished && a.finishedAt && (
        <span className="cl-stamp ap-stamp" style={{ "--rot": "-8deg" } as React.CSSProperties}>
          {phone ? "Done" : `Done · ${dayMonth(a.finishedAt)}`}
        </span>
      )}
      <div className="row between gap-2">
        <From a={a} />
        {v.badge && <span className={`badge ${v.badge.cls}`}>{v.badge.text}</span>}
      </div>
      <span className={cn("h3 m-0", phone && "text-[17px]")}>{a.title}</span>
      <div className={cn("ap-meta", phone && "text-[12px]")}>
        <span>{v.size}</span>
        <span>
          {!phone && (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
            </svg>
          )}
          {v.due}
        </span>
      </div>
      {v.bar &&
        (phone ? (
          <div className="bar h-1.5" role="img" aria-label={`${v.progress}, ${v.correct}`}>
            <i style={{ width: `${v.pct}%`, animation: "none" }} />
          </div>
        ) : (
          <div className="col gap-1">
            <div className="row between xs">
              <span className="font-semibold">{v.progress}</span>
              <span className="muted">{v.correct}</span>
            </div>
            <div className="bar h-1.5" aria-hidden="true">
              <i style={{ width: `${v.pct}%`, animation: "none" }} />
            </div>
          </div>
        ))}
      {v.lateNote && <span className="xs text-[#5C3600]">{v.lateNote}</span>}
      {a.note && <span className="xs">&ldquo;{a.note}&rdquo;</span>}
      {!phone && a.why && <span className="xs muted">{a.why}</span>}
      <AssignmentCta a={a} label={v.cta} className={phone ? cn("btn btn-lg w-full", v.finished ? "btn-secondary" : "btn-primary") : cn("btn self-start", v.finished ? "btn-secondary" : "btn-primary")} />
    </article>
  );
}

/** The "From your teachers" list: one row per assignment (title, size · teacher · due, state badge, button). */
export function AssignmentRows({ items }: { items: StudentAssignment[] }) {
  if (!items.length) return <span className="sm muted">Your teachers haven&apos;t set any practice yet. When they do, it shows here and on Home.</span>;
  return (
    <div className="col gap-2.5">
      {items.map((a) => {
        const v = assignmentView(a);
        return (
          <div key={a.id} className="ap-row">
            <span className="ap-ic" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 4h6v3H9z" />
                <path d="M7 5H5v15h14V5h-2" />
                <path d="M9 12l2 2 4-4" />
              </svg>
            </span>
            <span className="col min-w-0 grow gap-px">
              <span className="sm font-semibold">{a.title}</span>
              <span className="xs muted">
                {v.size} · from {v.teacher} · {v.due}
              </span>
            </span>
            <span className={`badge ${v.badge ? v.badge.cls : "b-green"}`}>{v.badge ? v.badge.text : "Done"}</span>
            <AssignmentCta a={a} label={v.cta} className="btn btn-secondary btn-sm" />
          </div>
        );
      })}
    </div>
  );
}

/**
 * Which assignments get a card on Home: the unfinished ones (at most 2), or, with none left, the one finished in the
 * last 3 days (its "Done" stamp). Nothing at all when the teacher set nothing ("Nothing extra on Home").
 */
export function homeCards(items: StudentAssignment[], now: number): StudentAssignment[] {
  const open = items.filter((a) => a.state !== "finished");
  if (open.length) return open.slice(0, 2);
  const recent = items.find((a) => a.finishedAt && now - Date.parse(a.finishedAt) < 3 * 86_400_000);
  return recent ? [recent] : [];
}
