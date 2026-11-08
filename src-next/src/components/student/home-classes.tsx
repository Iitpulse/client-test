"use client";

// Student-Home-Classes / Phone-Home-Classes (approved 8 Nov, rules note "Classes for students"): the Classes card
// (desktop and laptop up to 3 events in the next 7 days, phone up to 2) and, on desktop, the one-line strip under the
// greeting while an event starts within the hour or is happening now. GET /tests/student/classes. The card loads on
// its own: its skeleton and its error never hold up the rest of Home (rule 10).
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { isMissingRoute, useClasses } from "@/lib/b9-api";
import { useServerClock } from "@/lib/server-clock";
import { daysFrom, ist } from "@/lib/time";
import { cn } from "@/lib/utils";
import { ChevR, ClassBadges, ErrCircle, PersonIcon, PinIcon, placeText, rangeLabel, ScreenIcon, shortDate, sortViews, srName, viewOf, type ClassView } from "./class-bits";
import { openClassFrom } from "./class-detail";
import { Skel } from "./common";

const href = (id: string) => `/classes/${encodeURIComponent(id)}`;

type CardData = { groups: Array<{ label: string; items: ClassView[] }>; total: number; onlyLater: boolean };

/** Rules 2-4: the card's window (now to the end of day 7), its groups and the "See all (n)" count. */
function cardData(views: ClassView[], now: number, max: number): CardData {
  const shown = sortViews(views.filter((v) => !v.gone));
  const today = ist(now).dayIndex;
  const week = shown.filter((v) => v.live || ist(v.start).dayIndex - today <= 6);
  if (week.length) {
    const top = week.slice(0, max);
    const isToday = (v: ClassView) => v.live || ist(v.start).dayIndex <= today;
    const groups = [
      { label: "Today", items: top.filter(isToday) },
      { label: "Later this week", items: top.filter((v) => !isToday(v)) },
    ].filter((g) => g.items.length);
    return { groups, total: shown.length, onlyLater: false };
  }
  if (shown.length) {
    const first = shown[0]!;
    return { groups: [{ label: `Next · in ${daysFrom(now, first.start)} days`, items: [first] }], total: shown.length, onlyLater: true };
  }
  return { groups: [], total: 0, onlyLater: false };
}

/** The classes and the server's clock (by the minute is enough: "Starts in N min"). */
function useClassViews(enabled: boolean) {
  const q = useClasses(enabled);
  const now = useServerClock(q.data?.now, q.dataUpdatedAt, true, 15_000);
  const views = useMemo(() => (q.data ? q.data.items.map((c) => viewOf(c, now)) : []), [q.data, now]);
  return { q, now, views };
}

/** "Now" is announced once when a class starts while Home is open (rule 11); the countdown is not read out. */
function useNowAnnouncement(views: ClassView[]) {
  const seen = useRef<Set<string> | null>(null);
  const [msg, setMsg] = useState("");
  const liveIds = views.filter((v) => v.live).map((v) => v.c.id).join(",");
  useEffect(() => {
    const live = new Set(liveIds ? liveIds.split(",") : []);
    if (seen.current) {
      const fresh = views.find((v) => v.live && !seen.current!.has(v.c.id));
      if (fresh) setMsg(`${fresh.c.kindLabel}: ${fresh.c.title} is happening now.`);
    }
    seen.current = live;
    // views changes every tick; only the set of live classes matters here
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveIds]);
  return msg;
}

/** The Classes card. `phone`: Phone-Home-Classes (up to 2, whole rows tappable), else the desktop card (up to 3). */
export function ClassesCard({ enabled, phone = false, className, style }: { enabled: boolean; phone?: boolean; className?: string; style?: React.CSSProperties }) {
  const { q, now, views } = useClassViews(enabled);
  const announce = useNowAnnouncement(views);
  if (!enabled && !q.data) return null; // `?fixture=` states of Home leave the card out
  if (q.isError && isMissingRoute(q.error)) return null; // not on this stack yet
  const d = q.data ? cardData(views, now, phone ? 2 : 3) : null;
  const sub = !d ? "Next 7 days" : d.total === 0 ? "Nothing in the next 62 days" : d.onlyLater ? "Nothing in the next 7 days" : "Next 7 days";
  const ist_ = phone && (!d || d.total > 0) ? " · IST" : "";
  const pad = phone ? "px-4" : "px-5";
  return (
    <article className={cn("card col rise", phone && "overflow-hidden", className)} style={style} aria-labelledby={phone ? "pc-h" : "cls-h"} aria-busy={!q.data && !q.isError}>
      <div className={cn("row between", phone ? "px-4 pt-3 pb-1.5" : "pad")} style={phone ? undefined : { paddingBottom: 8 }}>
        <span className="col gap-px">
          <h2 id={phone ? "pc-h" : "cls-h"} className="h3 m-0">
            Classes
          </h2>
          <span className="xs muted">
            {sub}
            {ist_}
          </span>
        </span>
        {d && d.total > 0 && (
          <Link prefetch={false} href="/classes" className={cn("sm font-semibold", phone && "row min-h-11 px-1")} aria-label={`See all ${d.total} ${d.total === 1 ? "class" : "classes"} in the next 62 days`}>
            See all ({d.total})
          </Link>
        )}
      </div>

      {d &&
        d.groups.map((g) => (
          <div key={g.label} className="col">
            <span className="ev-grp">{g.label}</span>
            {phone ? (
              g.items.map((v) => <PhoneRow key={v.c.id} v={v} now={now} />)
            ) : (
              <ul className="m-0 list-none p-0">
                {g.items.map((v) => (
                  <DeskRow key={v.c.id} v={v} now={now} />
                ))}
              </ul>
            )}
          </div>
        ))}

      {d && d.total === 0 && (
        <div className={cn("col gap-1 border-t border-[#EEF0F5]", phone ? "gap-[3px] px-4 pt-3 pb-4" : "p-5")}>
          <span className="sm font-semibold">No classes scheduled</span>
          <span className="xs muted">{phone ? "Classes your teachers add for you show here, and you get an email." : "Revision classes and doubt sessions your teachers add for you show here, and you get an email."}</span>
        </div>
      )}

      {!d && !q.isError && (
        <div className="col" aria-label="Loading your classes">
          {(phone ? [0] : [0, 1]).map((k) => (
            <div key={k} className={cn("row items-start gap-3.5 border-t border-[#EEF0F5] py-3.5", pad)}>
              <Skel className="h-[52px] w-12 flex-none rounded-[10px]" />
              <span className="col grow gap-2">
                <Skel className="h-[18px] w-[40%]" />
                <Skel className="h-3.5 w-[85%]" />
                <Skel className="h-3 w-[65%]" />
              </span>
            </div>
          ))}
        </div>
      )}

      {!d && q.isError && (
        <div className={cn("col items-start border-t border-[#EEF0F5]", phone ? "gap-2.5 px-4 pt-3 pb-4" : "gap-2 p-5")} role="alert">
          <div className="row gap-2.5">
            <span className="ev-ico red" aria-hidden="true">
              <ErrCircle />
            </span>
            <span className="col gap-px">
              <span className="sm font-semibold">Couldn&apos;t load your classes</span>
              <span className="xs muted">{phone ? "The rest of Home is fine." : "The rest of Home is fine. Your class emails still arrive."}</span>
            </span>
          </div>
          <button type="button" className={cn("btn btn-secondary", phone ? "h-11 w-full" : "btn-sm")} onClick={() => q.refetch()} disabled={q.isFetching}>
            Try again
          </button>
        </div>
      )}

      {!phone && (
        <div className="row between mt-auto border-t border-[#EEF0F5] px-5 py-3">
          <span className="xs muted">Times are India time (IST)</span>
        </div>
      )}
      <span className="sr-only" role="status" aria-live="polite">
        {announce}
      </span>
    </article>
  );
}

function rowWhen(v: ClassView, now: number): string {
  const range = rangeLabel(v.start, v.end);
  return ist(v.start).dayIndex === ist(now).dayIndex ? range : `${shortDate(v.start)} · ${range}`;
}

function DeskRow({ v, now }: { v: ClassView; now: number }) {
  const c = v.c;
  const cls = cn("ev-row", (v.live || v.soonMin !== null) && "hl", v.cancelled && "x");
  return (
    <li className={cls}>
      <span className="ev-dt" aria-hidden="true">
        <span className="xs font-bold" style={{ letterSpacing: ".04em" }}>
          {ist(v.start).dow.toUpperCase()}
        </span>
        <span className="h3 num">{ist(v.start).day}</span>
      </span>
      <div className="col grow min-w-0 gap-1">
        <ClassBadges v={v} />
        <a href={href(c.id)} className="ev-t" aria-label={srName(v, now)} onClick={(e) => openClassFrom(e, c.id)}>
          {c.title}
        </a>
        <div className="ev-m">
          <span>
            {v.moved && c.previousStartsAt && <s className="ev-old">{`${shortDate(c.previousStartsAt)}, ${ist(c.previousStartsAt).time}`}</s>}
            <time dateTime={c.startsAt} className="font-semibold">
              {rowWhen(v, now)}
            </time>
            <span className="muted">· {durShortOf(c.minutes)}</span>
          </span>
          <span>
            {c.place.kind === "online" ? <ScreenIcon /> : <PinIcon />}
            {placeText(c)}
          </span>
          {c.teacher && (
            <span>
              <PersonIcon />
              {c.teacher.name}
            </span>
          )}
        </div>
        {v.cancelled && (
          <span className="xs" style={{ color: "#2B2F4A" }}>
            {c.cancelledAt ? `Cancelled at ${ist(c.cancelledAt).time}. ` : ""}Your teacher will add a new time.
          </span>
        )}
        {c.followUp && (
          <Link prefetch={false} href={`/results/${encodeURIComponent(c.followUp.testId)}`} className="ev-fl">
            Follow-up to {c.followUp.testName}
            <ChevR s={12} />
          </Link>
        )}
      </div>
    </li>
  );
}

function PhoneRow({ v, now }: { v: ClassView; now: number }) {
  const c = v.c;
  return (
    <a href={href(c.id)} className={cn("ev-row", (v.live || v.soonMin !== null) && "hl", v.cancelled && "x")} aria-label={`${srName(v, now)} Open details.`} onClick={(e) => openClassFrom(e, c.id)}>
      <span className="ev-dt" aria-hidden="true">
        <span className="font-bold" style={{ letterSpacing: ".04em", fontSize: 11 }}>
          {ist(v.start).dow.toUpperCase()}
        </span>
        <span className="h3 num">{ist(v.start).day}</span>
      </span>
      <span className="col grow min-w-0 gap-[3px]">
        <ClassBadges v={v} phone />
        <span className="ev-t">{c.title}</span>
        <span className="ev-m block">
          {v.moved && c.previousStartsAt && (
            <>
              <s className="ev-old">{`${ist(c.previousStartsAt).dow} ${ist(c.previousStartsAt).time}`}</s>{" "}
            </>
          )}
          <time dateTime={c.startsAt} className="font-semibold">
            {rowWhen(v, now)}
          </time>{" "}
          · {durShortOf(c.minutes)}
        </span>
        <span className="ev-m muted block">
          {placeText(c)}
          {c.teacher ? ` · ${c.teacher.name}` : ""}
        </span>
      </span>
      <ChevR className="ev-chev" />
    </a>
  );
}

const durShortOf = (m: number) => (m < 60 ? `${m} min` : `${Math.floor(m / 60)} hr${m % 60 ? ` ${m % 60} min` : ""}`);

/** Rule 6, desktop and laptop: while a class is "Starts in" or "Now", one line under the greeting links to it. */
export function ClassStrip({ enabled }: { enabled: boolean }) {
  const { q, views } = useClassViews(enabled);
  if (!q.data) return null;
  const v = sortViews(views.filter((x) => !x.gone && (x.live || x.soonMin !== null)))[0];
  if (!v) return null;
  const c = v.c;
  const where = [placeText(c), c.teacher?.name].filter(Boolean).join(" · ");
  const when = v.live ? `Started ${ist(v.start).time}, ends ${ist(v.end).time}` : `Today ${rangeLabel(v.start, v.end)}`;
  const sr = v.live
    ? `Happening now: ${c.kindLabel}, ${c.title}, until ${ist(v.end).time} India time, ${placeText(c)}. Open details.`
    : `Starts in ${v.soonMin} ${v.soonMin === 1 ? "minute" : "minutes"}: ${c.kindLabel}, ${c.title}, today ${rangeLabel(v.start, v.end).replace(" – ", " to ")} India time, ${placeText(c)}. Open details.`;
  return (
    <a href={href(c.id)} className="ev-soon rise max-md:hidden" aria-label={sr} onClick={(e) => openClassFrom(e, c.id)}>
      {v.live ? (
        <span className="badge b-live">
          <span className="live-dot" aria-hidden="true" />
          Now
        </span>
      ) : (
        <span className="badge b-amber">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true" focusable="false">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </svg>
          Starts in {v.soonMin} min
        </span>
      )}
      <span className="sm font-semibold">
        {c.kindLabel} · {c.title}
      </span>
      <span className="xs" style={{ color: "#2B2F4A" }}>
        {when}
        {where ? ` · ${where}` : ""}
      </span>
      <span className="sm ml-auto font-semibold" style={{ color: "var(--navy)" }}>
        Details
      </span>
    </a>
  );
}
