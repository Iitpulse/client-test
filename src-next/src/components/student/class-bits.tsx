"use client";

// Shared parts of the student class screens (Student-Home-Classes, Phone-Home-Classes, Student-Classes,
// Student-ClassDetail; rules note "Classes for students"). Every time is India time (IST).
import { ist, daysFrom } from "@/lib/time";
import type { StudentClass } from "@/types/b9";

const MIN = 60_000;
const DAY = 86_400_000;

// ───────────── time labels ─────────────

const split = (t: string) => {
  const [hm, ap] = t.split(" ");
  return { hm: hm!, ap: ap! };
};
/** "5:00 – 5:30 PM", "11:00 AM – 12:00 PM" */
export function rangeLabel(start: string | number, end: string | number): string {
  const a = split(ist(start).time);
  const b = split(ist(end).time);
  return a.ap === b.ap ? `${a.hm} – ${b.hm} ${b.ap}` : `${a.hm} ${a.ap} – ${b.hm} ${b.ap}`;
}
/** "5:00 to 5:30 PM" (screen readers) */
function rangeSr(start: string | number, end: string | number): string {
  const a = split(ist(start).time);
  const b = split(ist(end).time);
  return a.ap === b.ap ? `${a.hm} to ${b.hm} ${b.ap}` : `${a.hm} ${a.ap} to ${b.hm} ${b.ap}`;
}
/** "30 min", "1 hr", "1 hr 30 min" */
export function durShort(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const r = min % 60;
  return `${h} hr${r ? ` ${r} min` : ""}`;
}
/** "30 minutes", "1 hour", "1 hour 30 minutes" */
export function durLong(min: number): string {
  if (min < 60) return `${min} ${min === 1 ? "minute" : "minutes"}`;
  const h = Math.floor(min / 60);
  const r = min % 60;
  return `${h} ${h === 1 ? "hour" : "hours"}${r ? ` ${r} minutes` : ""}`;
}
/** "Thursday 12 November" */
export const longDate = (at: string | number) => {
  const p = ist(at);
  return `${p.weekday} ${p.day} ${p.month}`;
};
/** "Sat 14 Nov" */
export const shortDate = (at: string | number) => {
  const p = ist(at);
  return `${p.dow} ${p.day} ${p.mon}`;
};
/** "in 2 days" / "tomorrow" / "" (today) */
export function inDays(now: number, at: string | number): string {
  const d = daysFrom(now, at);
  return d <= 0 ? "" : d === 1 ? "tomorrow" : `in ${d} days`;
}
/** "1:40 PM today", "1:40 PM yesterday", "1:40 PM on Thu 12 Nov" */
export function atWhen(now: number, at: string | number): string {
  const d = daysFrom(now, at);
  const t = ist(at).time;
  return d === 0 ? `${t} today` : d === -1 ? `${t} yesterday` : d === 1 ? `${t} tomorrow` : `${t} on ${shortDate(at)}`;
}

// ───────────── the state of a class at `now` ─────────────

export interface ClassView {
  c: StudentClass;
  start: number;
  end: number;
  cancelled: boolean;
  live: boolean;
  /** minutes to the start while it is within the hour before (the "Starts in N min" badge), else null */
  soonMin: number | null;
  moved: boolean;
  /** gone from the card and the list: ended, or cancelled 24 h ago (or past its original end) */
  gone: boolean;
  joinable: boolean;
}

export function viewOf(c: StudentClass, now: number): ClassView {
  const start = Date.parse(c.startsAt);
  const end = Date.parse(c.endsAt);
  const cancelled = c.status === "cancelled" || !!c.cancelledAt;
  const cancelGone = cancelled && now >= Math.min(c.cancelledAt ? Date.parse(c.cancelledAt) + DAY : end, end);
  const live = !cancelled && now >= start && now < end;
  const soonMin = !cancelled && now < start && start - now <= 60 * MIN ? Math.max(1, Math.ceil((start - now) / MIN)) : null;
  // rule 7: "Moved" for 24 h after the move, or until the start if sooner
  const moved = !!c.previousStartsAt && !cancelled && (c.movedAt ? now < Math.min(Date.parse(c.movedAt) + DAY, start) : now < start);
  const joinFrom = c.joinFrom ? Date.parse(c.joinFrom) : start - 15 * MIN;
  return {
    c,
    start,
    end,
    cancelled,
    live,
    soonMin,
    moved,
    gone: (!cancelled && now >= end) || cancelGone,
    joinable: !!c.joinUrl && !cancelled && now >= joinFrom && now < end,
  };
}

/** Rule 4: by start, earliest first; ties by earlier end, then title A to Z. */
export function sortViews(v: ClassView[]): ClassView[] {
  return [...v].sort((a, b) => a.start - b.start || a.end - b.end || a.c.title.localeCompare(b.c.title));
}

export const KIND_BADGE: Record<StudentClass["kind"], string> = { revision: "b-navy", doubt: "b-sky", class: "b-grey" };

/** The place as text: the label without its join link ("Online" when nothing else is left). */
export function placeText(c: StudentClass): string {
  const label = (c.place.label ?? "").replace(/https?:\/\/\S+/g, "").replace(/\s*[·,:\-–]\s*$/, "").replace(/^\s*[·,:\-–]\s*/, "").trim();
  if (label) return label;
  return c.place.kind === "online" ? "Online" : "At the centre";
}

/** The whole row as one name for screen readers (rule 11). */
export function srName(v: ClassView, now: number): string {
  const c = v.c;
  const d = daysFrom(now, v.start);
  const when = `${d === 0 ? "today, " : d === 1 ? "tomorrow, " : ""}${longDate(v.start)}, ${rangeSr(v.start, v.end)} India time, ${durLong(c.minutes)}`;
  const extra = v.cancelled
    ? " Cancelled."
    : v.live
      ? ` Happening now, ends ${ist(v.end).time}.`
      : v.soonMin !== null
        ? ` Starts in ${v.soonMin} ${v.soonMin === 1 ? "minute" : "minutes"}.`
        : v.moved && c.previousStartsAt
          ? ` Moved from ${longDate(c.previousStartsAt)}, ${ist(c.previousStartsAt).time}.`
          : "";
  return `${c.kindLabel}: ${c.title}. ${when}, ${placeText(c)}${c.teacher ? `, with ${c.teacher.name}` : ""}.${extra}`;
}

// ───────────── icons and badges ─────────────

const ico = { fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true, focusable: false } as const;
export const PinIcon = ({ s = 13 }: { s?: number }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" strokeWidth="2" {...ico}>
    <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" />
    <circle cx="12" cy="9.5" r="2.5" />
  </svg>
);
export const ScreenIcon = ({ s = 13 }: { s?: number }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" strokeWidth="2" {...ico}>
    <rect x="3" y="4" width="18" height="12" rx="2" />
    <path d="M8 20h8M12 16v4" />
  </svg>
);
export const PersonIcon = ({ s = 13 }: { s?: number }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" strokeWidth="2" {...ico}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21a8 8 0 0 1 16 0" />
  </svg>
);
export const PeopleIcon = ({ s = 16 }: { s?: number }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" strokeWidth="2" {...ico}>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5a6 6 0 0 1 3.5 5.5" />
  </svg>
);
export const CalIcon = ({ s = 22 }: { s?: number }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" strokeWidth="2" {...ico}>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 10h18M8 3v4M16 3v4" />
  </svg>
);
export const CalAddIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" strokeWidth="2" {...ico}>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 10h18M8 3v4M16 3v4M12 13v5M9.5 15.5h5" />
  </svg>
);
export const BellLineIcon = ({ s = 14 }: { s?: number }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" strokeWidth="1.8" {...ico}>
    <path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8" />
    <path d="M10.3 21a1.9 1.9 0 0 0 3.4 0" />
  </svg>
);
export const ErrCircle = ({ s = 18 }: { s?: number }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" strokeWidth="2" {...ico}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7.5v5.5M12 16.5h.01" />
  </svg>
);
export const ChevR = ({ s = 18, className }: { s?: number; className?: string }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" strokeWidth="2" className={className} {...ico}>
    <path d="m9 6 6 6-6 6" />
  </svg>
);
export const XIcon = ({ s = 18 }: { s?: number }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" strokeWidth="2" {...ico}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);
const ClockSm = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" strokeWidth="2.4" {...ico}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);
const ArrowSm = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" strokeWidth="2.4" {...ico}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);
const XSm = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" strokeWidth="2.4" {...ico}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);

/**
 * The kind badge and the state badges (rule 5: words and an icon plus a tinted row, never colour alone).
 * `phone` uses the shorter phone wording ("In 45 min", "Now · till 5:30") and drops the icons where the board does.
 */
export function ClassBadges({ v, phone = false, list = false }: { v: ClassView; phone?: boolean; list?: boolean }) {
  const end = ist(v.end).time;
  return (
    <span className="row wrap gap-1.5">
      <span className={`badge ${KIND_BADGE[v.c.kind]}`}>{v.c.kindLabel}</span>
      {v.live && (
        <span className="badge b-live">
          <span className="live-dot" aria-hidden="true" />
          {list ? "Now" : phone ? `Now · till ${end.replace(/ (AM|PM)$/, "")}` : `Now · ends ${end}`}
        </span>
      )}
      {v.soonMin !== null && (
        <span className="badge b-amber">
          {!(phone && list) && <ClockSm />}
          {phone ? `In ${v.soonMin} min` : `Starts in ${v.soonMin} min`}
        </span>
      )}
      {v.moved && (
        <span className="badge b-amber">
          {!phone && <ArrowSm />}
          Moved
        </span>
      )}
      {v.cancelled && (
        <span className="badge b-grey">
          {!phone && <XSm />}
          Cancelled
        </span>
      )}
    </span>
  );
}
