"use client";

// Student-Classes (approved 8 Nov): /classes, the next 62 days by day, filter All / Revision / Doubt / Class as a
// segmented control (counts leave out cancelled), moved, cancelled (24 h), a filter with none, empty, loading,
// error. Reached from "See all" on Home and from class emails and SMS, not from the top nav. /classes/<id> opens
// the same page with that class's drawer (a link from the bell, an email or an SMS).
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useClasses } from "@/lib/b9-api";
import { useServerClock } from "@/lib/server-clock";
import { ist } from "@/lib/time";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth.store";
import { Avatar } from "@/components/shell/avatar";
import type { ClassKind } from "@/types/b9";
import { CalIcon, ChevR, ClassBadges, ErrCircle, inDays, longDate, PersonIcon, PinIcon, placeText, ScreenIcon, shortDate, sortViews, srName, viewOf, type ClassView } from "./class-bits";
import { openClassFrom, useClassDrawer } from "./class-detail";
import { Skel } from "./common";
import { supportCode } from "./states";

type Filter = "all" | ClassKind;
const TABS: Array<[Filter, string, string]> = [
  ["all", "All", "All"],
  ["revision", "Revision classes", "Revision"],
  ["doubt", "Doubt sessions", "Doubt"],
  ["class", "Classes", "Class"],
];
const NAMES: Record<Filter, string> = { all: "classes", revision: "revision classes", doubt: "doubt sessions", class: "classes" };
const href = (id: string) => `/classes/${encodeURIComponent(id)}`;
const durShort = (m: number) => (m < 60 ? `${m} min` : `${Math.floor(m / 60)} hr${m % 60 ? ` ${m % 60} min` : ""}`);

export function ClassesView({ openId }: { openId?: string }) {
  const router = useRouter();
  const q = useClasses();
  const clock = useServerClock(q.data?.now, q.dataUpdatedAt, true, 15_000);
  const now = Number.isFinite(clock) ? clock : 0; // only read once the classes are in
  const [f, setF] = useState<Filter>("all");
  const user = useAuthStore((s) => s.currentUser);

  // /classes/<id>: open its drawer; closing goes back to /classes
  useEffect(() => {
    if (openId) useClassDrawer.getState().open(openId, () => router.replace("/classes", { scroll: false }));
  }, [openId, router]);

  const views = useMemo(() => (q.data ? sortViews(q.data.items.map((c) => viewOf(c, now)).filter((v) => !v.gone)) : []), [q.data, now]);
  const count = (k: Filter) => views.filter((v) => !v.cancelled && (k === "all" || v.c.kind === k)).length;
  const shown = views.filter((v) => f === "all" || v.c.kind === f);
  const days = useMemo(() => {
    const m = new Map<number, ClassView[]>();
    for (const v of shown) {
      const k = v.live ? ist(now).dayIndex : ist(v.start).dayIndex;
      m.set(k, [...(m.get(k) ?? []), v]);
    }
    return [...m.entries()].map(([k, items]) => ({ k, items }));
  }, [shown, now]);
  const today = q.data ? ist(now).dayIndex : 0;
  const state = q.data ? (views.length === 0 ? "empty" : shown.length === 0 ? "filter-empty" : "list") : q.isError ? "error" : "loading";
  const n = (k: Filter) => (state === "loading" || state === "error" ? "–" : String(count(k)));

  return (
    <>
      {/* Phone: "← Home" and the avatar (no tab bar on this page) */}
      <header className="sticky top-0 z-(--z-topbar) row between box-content h-[60px] border-b border-line bg-white/90 px-4 pt-[env(safe-area-inset-top)] backdrop-blur-md md:hidden">
        <Link prefetch={false} href="/" className="btn btn-ghost btn-sm -ml-2 h-11">
          ← Home
        </Link>
        <Link prefetch={false} href="/profile" aria-label="Your profile" className="-mr-1.5 flex size-11 items-center justify-center rounded-full">
          <Avatar name={user?.name} email={user?.email} size={32} />
        </Link>
      </header>
      <div className="col gap-4 md:pt-1 max-md:gap-3 max-md:px-4 max-md:pt-3.5 max-md:pb-6">
        <Link prefetch={false} href="/" className="btn btn-ghost btn-sm -ml-3 self-start max-md:hidden">
          ← Home
        </Link>
        <div className="row between wrap items-end gap-3 max-md:col max-md:items-stretch">
          <div className="col gap-0.5">
            <h1 className="h1 max-md:text-[22px]">Classes</h1>
            <span className="sm muted max-md:hidden">Revision classes, doubt sessions and classes for you in the next 62 days. Times are India time (IST).</span>
            <span className="xs muted md:hidden">Next 62 days · India time (IST)</span>
          </div>
          <div className="seg cl-seg" role="radiogroup" aria-label="Show">
            {TABS.map(([k, l, s]) => (
              <button key={k} type="button" role="radio" aria-checked={f === k} aria-label={`${l}, ${n(k)}`} className={f === k ? "tab on" : "tab"} onClick={() => setF(k)}>
                <span className="max-md:hidden">{l}</span>
                <span className="md:hidden">{s}</span>
                <span className="count max-md:hidden">{n(k)}</span>
              </button>
            ))}
          </div>
        </div>

        {state === "list" && (
          <>
            <section className="card col overflow-hidden" aria-label="Classes by day">
              {days.map((d) => (
                <div key={d.k} className="cl-day col">
                  <h2 className="cl-dayh">
                    <span className="sm font-semibold max-md:hidden">
                      {d.k === today ? "Today · " : ""}
                      {longDate(d.items[0]!.live ? now : d.items[0]!.start)}
                    </span>
                    <span className="sm font-semibold md:hidden">
                      {d.k === today ? "Today · " : ""}
                      {shortDate(d.items[0]!.live ? now : d.items[0]!.start)}
                    </span>
                    {d.k !== today && <span className="xs muted max-md:hidden">{inDays(now, d.items[0]!.start)}</span>}
                  </h2>
                  <ul className="m-0 list-none p-0">
                    {d.items.map((v) => (
                      <Row key={v.c.id} v={v} now={now} />
                    ))}
                  </ul>
                </div>
              ))}
            </section>
            <span className="xs muted max-md:hidden">Shows up to 62 days ahead. Classes further out appear here as the date gets closer.</span>
          </>
        )}

        {state === "filter-empty" && (
          <section className="card col items-center gap-2 px-6 py-12 text-center max-md:px-4 max-md:py-6">
            <span className="h3 max-md:text-sm">No {NAMES[f]} in the next 62 days</span>
            <span className="sm muted max-md:hidden">
              You have {count("all")} other {count("all") === 1 ? "class" : "classes"} in that time.
            </span>
            <button type="button" className="btn btn-secondary max-md:h-11 max-md:w-full" onClick={() => setF("all")}>
              Show all
            </button>
          </section>
        )}

        {state === "empty" && (
          <section className="card col items-center gap-2.5 px-6 py-14 text-center max-md:gap-1.5 max-md:px-4 max-md:py-7">
            <span className="ev-ico navy lg max-md:hidden" aria-hidden="true">
              <CalIcon />
            </span>
            <h2 className="h3 m-0 max-md:text-sm">No classes scheduled</h2>
            <p className="sm muted m-0 max-w-[440px] max-md:hidden">When your teachers add a revision class, doubt session or class for you, it shows here and on Home, and you get an email.</p>
            <p className="xs muted m-0 md:hidden">When your teachers add one for you, it shows here and you get an email.</p>
          </section>
        )}

        {state === "loading" && (
          <>
            <section className="card col overflow-hidden max-md:hidden" aria-busy="true" aria-label="Loading your classes">
              <Skel className="h-[38px] rounded-none" />
              {[0, 1].map((k) => (
                <div key={k} className={cn("row items-start gap-4 px-5 py-4", k && "border-t border-[#EEF0F5]")}>
                  <Skel className="h-8 w-[70px]" />
                  <span className="col grow gap-2">
                    <Skel className="h-5 w-[22%]" />
                    <Skel className="h-4 w-[60%]" />
                    <Skel className="h-3.5 w-[45%]" />
                  </span>
                </div>
              ))}
            </section>
            <div className="col gap-2.5 md:hidden" aria-busy="true" aria-label="Loading your classes">
              <Skel className="h-24 rounded-[14px]" />
              <Skel className="h-24 rounded-[14px]" />
            </div>
          </>
        )}

        {state === "error" && (
          <section className="card col items-center gap-2.5 px-6 py-14 text-center max-md:gap-2 max-md:px-4 max-md:py-6" role="alert">
            <span className="ev-ico red lg max-md:hidden" aria-hidden="true">
              <ErrCircle s={22} />
            </span>
            <h2 className="h3 m-0 max-md:text-sm">Couldn&apos;t load your classes</h2>
            <p className="sm muted m-0 max-md:hidden">Class emails still reach you. Try again in a moment.</p>
            <button type="button" className="btn btn-primary max-md:h-11 max-md:w-full" onClick={() => q.refetch()} disabled={q.isFetching}>
              Try again
            </button>
            <span className="xs muted mono max-md:hidden">Code {supportCode(q.error)}</span>
          </section>
        )}
      </div>
    </>
  );
}

function Row({ v, now }: { v: ClassView; now: number }) {
  const c = v.c;
  const cls = cn("cl-lr", (v.live || v.soonMin !== null) && "hl", v.cancelled && "x");
  const tm = (
    <span className="cl-tm">
      {v.moved && c.previousStartsAt && (
        <s className="xs ev-old">
          <span className="max-md:hidden">{`${ist(c.previousStartsAt).dow} ${ist(c.previousStartsAt).time}`}</span>
          <span className="md:hidden">{`${ist(c.previousStartsAt).dow} ${ist(c.previousStartsAt).time.replace(":00", "")}`}</span>
        </s>
      )}
      <time dateTime={c.startsAt} className="sm num font-semibold">
        {ist(v.start).time}
      </time>
      <span className="xs muted">{durShort(c.minutes)}</span>
    </span>
  );
  return (
    <li className="contents">
      {/* Desktop: the title is the link */}
      <div className={cn(cls, "max-md:hidden")}>
        {tm}
        <div className="col grow min-w-0 gap-1">
          <ClassBadges v={v} list />
          <a href={href(c.id)} className="ev-t" aria-label={srName(v, now)} onClick={(e) => openClassFrom(e, c.id)}>
            {c.title}
          </a>
          <div className="ev-m">
            <span>
              {c.place.kind === "online" ? <ScreenIcon s={14} /> : <PinIcon s={14} />}
              {placeText(c)}
            </span>
            {c.teacher && (
              <span>
                <PersonIcon s={14} />
                {c.teacher.name}
              </span>
            )}
          </div>
          {v.cancelled && c.cancelledAt && (
            <span className="xs" style={{ color: "#2B2F4A" }}>
              Cancelled at {ist(c.cancelledAt).time} {ist(c.cancelledAt).dayIndex === ist(now).dayIndex ? "today" : `on ${shortDate(c.cancelledAt)}`}. Leaves this list at {ist(Date.parse(c.cancelledAt) + 86_400_000).time}{" "}
              {ist(Date.parse(c.cancelledAt) + 86_400_000).dayIndex === ist(now).dayIndex + 1 ? "tomorrow" : "today"}.
            </span>
          )}
          {c.followUp && (
            <Link prefetch={false} href={`/results/${encodeURIComponent(c.followUp.testId)}`} className="ev-fl">
              Follow-up to {c.followUp.testName}
              <ChevR s={12} />
            </Link>
          )}
        </div>
      </div>
      {/* Phone: the whole row is the link */}
      <a href={href(c.id)} className={cn(cls, "md:hidden")} aria-label={srName(v, now)} onClick={(e) => openClassFrom(e, c.id)}>
        {tm}
        <span className="col grow min-w-0 gap-[3px]">
          <ClassBadges v={v} phone list />
          <span className="ev-t">{c.title}</span>
          <span className="ev-m block text-xs">
            {placeText(c)}
            {c.teacher ? ` · ${c.teacher.name}` : ""}
          </span>
        </span>
      </a>
    </li>
  );
}
