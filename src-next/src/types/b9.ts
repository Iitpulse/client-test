// Batch 9 + "Student classes on Home" (owner approved 8 Nov, canvas v228 / v243). Contracts v1:
// api-tests docs/student-classes-api.md (classes) and api-users docs/sms-api.md (phone codes, reach, the bell).

// ───────────── classes (GET /tests/student/classes, /:id, /:id/ics) ─────────────

export type ClassKind = "revision" | "doubt" | "class";
export type ClassStatus = "upcoming" | "live" | "ended" | "cancelled";

export interface StudentClass {
  id: string;
  kind: ClassKind;
  kindLabel: string;
  title: string;
  startsAt: string;
  endsAt: string;
  minutes: number;
  place: { kind: "centre" | "online"; label: string | null };
  /** the first https:// link in an online class's place text, else null; Join shows from joinFrom until endsAt */
  joinUrl: string | null;
  joinFrom: string | null;
  teacher: { name: string } | null;
  note: string | null;
  /** "Picked by your teacher" (the reason is never shown) */
  pickedForYou: boolean;
  status: ClassStatus;
  cancelledAt: string | null;
  previousStartsAt: string | null;
  movedAt: string | null;
  /** the 1-hour reminder is on for this class */
  remind: boolean;
  calendar: { ics: string; canAdd: boolean };
  /**
   * "Follow-up to <test>" (rule 9): not in contract v1 (the event's sourceTestId is not on the student route).
   * Shown when the API sends it; `result` null = "Result not out yet".
   */
  followUp?: {
    testId: string;
    testName: string;
    result: { score: number; maxScore: number; rank: { position: number; of: number } | null } | null;
  } | null;
}

export interface ClassesResponse {
  now: string;
  from: string;
  to: string;
  items: StudentClass[];
}

export interface ClassResponse {
  now: string;
  class: StudentClass;
}

// ───────────── the bell (GET /users/me/notifications …) ─────────────

export type NotificationKind = "class" | "test" | "result" | "ai" | "practice";

export interface StudentNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string | null;
  /** a student-app path, or null (no page) */
  href: string | null;
  ref: { type: string; id: string } | null;
  at: string;
  read: boolean;
}

export interface NotificationsResponse {
  now?: string;
  items: StudentNotification[];
  unread: number;
  unreadLabel: string;
  nextCursor: string | null;
  keptDays: number;
}

export interface UnreadResponse {
  now?: string;
  unread: number;
  unreadLabel: string;
}

// ───────────── How we reach you (GET /users/me/reach) ─────────────

export interface ReachResponse {
  now?: string;
  phone: { display: string; last4: string; verified: boolean; verifiedAt: string | null } | null;
  email: { address: string; verified: boolean } | null;
  parentPhone: { display: string; setByInstitute: boolean } | null;
  sms: { classes: boolean; tests: boolean; codes: boolean; paused: boolean };
  quietHours: { from: string; to: string; timezone: string };
  senderId: string;
}

export interface PhoneCodeSent {
  now?: string;
  sent: boolean;
  sentTo: string;
  expiresInSeconds: number;
  resendAfterSeconds: number;
}

// ───────────── phone-code sign-in and reset (POST /users/auth/phone/*) ─────────────

export type PhonePurpose = "signin" | "reset";

export interface PhoneAccount {
  id: string;
  label: string;
  initials: string;
  role: string;
  institute: string;
}

export type PhoneVerifyAnswer =
  | { status: "signed_in"; token: string; expiresAt?: string; session?: { id: string; app: string } }
  | { status: "reset_ready"; resetToken: string; account: { label: string; institute: string } }
  | { status: "pick_account"; pickToken: string; accounts: PhoneAccount[] };
