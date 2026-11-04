// Every time from the API is a UTC instant; students read them in IST. Countdowns run on the server's clock:
// each response carries `now`, and the device clock is only used to measure the time since that response.

const TZ = "Asia/Kolkata";
const fmt = new Intl.DateTimeFormat("en-US", {
  timeZone: TZ,
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

export interface IstParts {
  weekday: string; // Monday
  dow: string; // Mon
  day: number; // 2
  month: string; // November
  mon: string; // Nov
  year: number;
  time: string; // 9:00 PM
  hour24: number;
  /** Days since 1970-01-01 in IST, for calendar-day differences */
  dayIndex: number;
}

export function ist(at: string | number | Date): IstParts {
  const d = at instanceof Date ? at : new Date(at);
  const p: Record<string, string> = {};
  for (const part of fmt.formatToParts(d)) p[part.type] = part.value;
  const hour = Number(p.hour);
  const pm = (p.dayPeriod || "").toUpperCase() === "PM";
  const hour24 = (hour % 12) + (pm ? 12 : 0);
  const day = Number(p.day);
  const year = Number(p.year);
  const monthIndex = MONTHS.indexOf(p.month!);
  return {
    weekday: p.weekday!,
    dow: p.weekday!.slice(0, 3),
    day,
    month: p.month!,
    mon: p.month!.slice(0, 3),
    year,
    time: `${hour}:${p.minute} ${pm ? "PM" : "AM"}`,
    hour24,
    dayIndex: Math.floor(Date.UTC(year, monthIndex, day) / 86_400_000),
  };
}
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** "Monday, 2 November" */
export const longDay = (at: string | number) => {
  const p = ist(at);
  return `${p.weekday}, ${p.day} ${p.month}`;
};
/** "Mon, 2 Nov" */
export const shortDay = (at: string | number) => {
  const p = ist(at);
  return `${p.dow}, ${p.day} ${p.mon}`;
};
/** "2 Nov" */
export const dayMonth = (at: string | number) => {
  const p = ist(at);
  return `${p.day} ${p.mon}`;
};
/** "Sun 1 Nov" */
export const dowDayMonth = (at: string | number) => {
  const p = ist(at);
  return `${p.dow} ${p.day} ${p.mon}`;
};
/** "Fri 20 Nov, 5:00 PM" */
export const dowDayMonthTime = (at: string | number) => {
  const p = ist(at);
  return `${p.dow} ${p.day} ${p.mon}, ${p.time}`;
};
/** "9:00 PM" */
export const timeOf = (at: string | number) => ist(at).time;

/** Calendar days from `now` to `at` in IST (0 = same day, 1 = tomorrow, -1 = yesterday). */
export function daysFrom(now: number, at: string | number): number {
  return ist(at).dayIndex - ist(now).dayIndex;
}

/** "today, 9:00 PM" / "tomorrow, 10:00 AM" / "Thu 5 Nov, 9:00 PM" */
export function relativeDayTime(now: number, at: string | number): string {
  const d = daysFrom(now, at);
  if (d === 0) return `today, ${timeOf(at)}`;
  if (d === 1) return `tomorrow, ${timeOf(at)}`;
  return dowDayMonthTime(at);
}

/** "Good morning" / "Good afternoon" / "Good evening", by the IST hour */
export function greeting(now: number): string {
  const h = ist(now).hour24;
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

const pad = (n: number) => String(n).padStart(2, "0");

/** "02:14:32"; over a day "3d 04:12:09" */
export function countdown(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const d = Math.floor(s / 86400);
  const hms = `${pad(Math.floor((s % 86400) / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
  return d > 0 ? `${d}d ${hms}` : hms;
}

/** { days, hours, min, sec } for the pending-result countdown tiles */
export function countdownParts(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  return { days: Math.floor(s / 86400), hours: Math.floor((s % 86400) / 3600), min: Math.floor((s % 3600) / 60), sec: s % 60 };
}

/** "3:12" (minutes:seconds) */
export function mmss(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${pad(s % 60)}`;
}

/** "58 min", "1 h 4 min" */
export function minutes(seconds: number): string {
  const m = Math.round(Math.max(0, seconds) / 60);
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`;
}
