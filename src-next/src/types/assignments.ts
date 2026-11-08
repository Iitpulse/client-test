// Batch 8 assigned practice, student side. From Iitpulse/api-tests docs/batch8-api.md "Assigned practice"
// (625b1b1); the server keeps no exported contract file for it, so these follow the doc word for word.
import type { PracticeSet } from "./m4";

export interface StudentAssignment {
  id: string;
  /** "Definite integrals + Rotational motion" */
  title: string;
  /** the teacher's note (≤ 300) */
  note: string | null;
  /** "From Neha Verma", avatar "NV" */
  teacher: { name: string | null; initials: string };
  /** "15 questions · Practice" */
  size: { questions: number; mode: "practice" | "timed"; minutes: number | null };
  /** "Set after JEE Main Mock 11, from the chapters you found hardest." */
  why: string | null;
  sourceTest: { testId: string; name: string | null; shortName: string | null } | null;
  /** "Due Thu 12 Nov, 9:00 PM" */
  dueAt: string;
  /** badge "Due today" (IST day), false once finished */
  dueToday: boolean;
  state: "new" | "started" | "finished";
  /** past due and not finished, or finished after the due time */
  late: boolean;
  /** "6 of 15 done" */
  progress: { answered: number; total: number };
  /** "4 correct so far" / "11 correct" */
  correct: number;
  finishedAt: string | null;
  /** the student's practice set once started */
  setId: string | null;
}

/** GET /tests/student/assignments: unfinished first (soonest due), then finished (latest first) */
export interface StudentAssignmentsResponse {
  now: string;
  items: StudentAssignment[];
}

/** POST /tests/student/assignments/:id/start: 201 created, 200 the same set again */
export interface StartAssignmentResponse {
  created: boolean;
  set: PracticeSet;
}

export type AssignmentErrorCode = "ASSIGNMENT_NOT_FOUND" | "NO_PRACTICE_QUESTIONS" | "PRACTICE_UNAVAILABLE";
