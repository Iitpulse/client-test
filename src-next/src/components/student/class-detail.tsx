"use client";

// Student-ClassDetail (owner approved 8 Nov): a drawer over Home or All classes on desktop and laptop, a full sheet
// on phones. States: starts soon, now, online (Join from 15 min before the start until the end), moved, cancelled,
// result not out, not found; "Add to my calendar" (one-event .ics) until the class starts or is cancelled (E7).
import Link from "next/link";
import { useState } from "react";
import { create } from "zustand";
import * as Dialog from "@radix-ui/react-dialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { b9Keys, classesApi } from "@/lib/b9-api";
import { qk, StudentApiError } from "@/lib/student-api";
import { m4Api, m4Keys } from "@/lib/m4-api";
import { useServerClock } from "@/lib/server-clock";
import { ist } from "@/lib/time";
import { initialsOf } from "@/components/shell/avatar";
import { Spinner } from "@/components/shell/icons";
import type { ClassesResponse, ClassResponse, StudentClass } from "@/types/b9";
import type { StudentHome } from "@/types/m2-student";
import { useReminderPref } from "./common";
import { atWhen, BellLineIcon, ChevR, shortDate, CalAddIcon, ClassBadges, durLong, ErrCircle, inDays, longDate, PeopleIcon, PinIcon, placeText, rangeLabel, ScreenIcon, viewOf, XIcon } from "./class-bits";
import { Skel } from "./common";
import { Ring } from "./ring";

/** Which class is open (one drawer for the whole shell). `onClose` replaces the default (just close). */
export const useClassDrawer = create<{ id: string | null; onClose: (() => void) | null; open: (id: string, onClose?: () => void) => void; close: () => void }>((set, get) => ({
  id: null,
  onClose: null,
  open: (id, onClose) => set({ id, onClose: onClose ?? null }),
  close: () => {
    const after = get().onClose;
    set({ id: null, onClose: null });
    after?.();
  },
}));

/** A click on a class link opens the drawer in place (the href stays for a new tab and for screen readers). */
export function openClassFrom(e: React.MouseEvent, id: string) {
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
  e.preventDefault();
  useClassDrawer.getState().open(id);
}

export function ClassDrawer() {
  const id = useClassDrawer((s) => s.id);
  const close = useClassDrawer((s) => s.close);
  return (
    <Dialog.Root open={!!id} onOpenChange={(o) => !o && close()}>
      <Dialog.Portal>
        <Dialog.Overlay className="cdr-scrim" />
        {id && <DrawerBody id={id} onClose={close} />}
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function DrawerBody({ id, onClose }: { id: string; onClose: () => void }) {
  const client = useQueryClient();
  const q = useQuery({
    queryKey: b9Keys.class(id),
    queryFn: ({ signal }) => classesApi.get(id, signal),
    // the list already has it: show that at once, refresh behind it
    initialData: () => {
      const list = client.getQueryData<ClassesResponse>(b9Keys.classes);
      const c = list?.items.find((x) => x.id === id);
      return c && list ? ({ now: list.now, class: c } satisfies ClassResponse) : undefined;
    },
    initialDataUpdatedAt: () => client.getQueryState(b9Keys.classes)?.dataUpdatedAt,
    staleTime: 30_000,
    retry: (n, e) => !(e instanceof StudentApiError && e.status < 500 && e.status !== 0) && n < 1,
  });
  const notFound = q.error instanceof StudentApiError && (q.error.status === 404 || q.error.code === "CLASS_NOT_FOUND");
  const now = useServerClock(q.data?.now, q.dataUpdatedAt, true, 15_000);
  const v = q.data ? viewOf(q.data.class, now) : null;
  const gone = notFound || (v?.gone ?? false);

  return (
    <Dialog.Content className={v?.cancelled ? "cdr pop x" : "cdr pop"} aria-describedby={undefined}>
      <span className="cdr-grab" aria-hidden="true" />
      {gone ? (
        <Removed onClose={onClose} />
      ) : !v ? (
        q.isError ? (
          <>
            <div className="cdr-hd">
              <Dialog.Title className="h3 m-0">Class</Dialog.Title>
              <CloseX />
            </div>
            <div className="cdr-bd items-center justify-center gap-2.5 text-center" role="alert">
              <span className="ev-ico red lg" aria-hidden="true">
                <ErrCircle />
              </span>
              <span className="sm font-semibold">Couldn&apos;t load this class</span>
              <span className="xs muted">Class emails still reach you. Try again in a moment.</span>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => q.refetch()}>
                Try again
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="cdr-hd">
              <Dialog.Title className="sr-only">Loading the class</Dialog.Title>
              <Skel className="h-6 w-40 rounded-md" />
              <CloseX />
            </div>
            <div className="cdr-bd" aria-busy="true">
              <Skel className="h-[60px] rounded-xl" />
              <Skel className="h-12 rounded-xl" />
              <Skel className="h-12 rounded-xl" />
              <Skel className="h-24 rounded-xl" />
            </div>
          </>
        )
      ) : (
        <Found v={v} now={now} onClose={onClose} />
      )}
    </Dialog.Content>
  );
}

function CloseX() {
  return (
    <Dialog.Close className="cdr-x" aria-label="Close">
      <XIcon />
    </Dialog.Close>
  );
}

function Removed({ onClose }: { onClose: () => void }) {
  return (
    <>
      <div className="cdr-hd max-md:hidden">
        <span className="h3">Class</span>
        <CloseX />
      </div>
      <div className="cdr-bd items-center justify-center gap-2.5 text-center max-md:p-6">
        <span className="cdr-fi max-md:hidden" style={{ width: 48, height: 48, borderRadius: 14, background: "#EEF0F5", color: "#575C75" }} aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" focusable="false">
            <rect x="3" y="5" width="18" height="16" rx="2" />
            <path d="M3 10h18M8 3v4M16 3v4M9.5 14.5l5 5M14.5 14.5l-5 5" />
          </svg>
        </span>
        <Dialog.Title className="h3 m-0">This class isn&apos;t on your schedule any more</Dialog.Title>
        <p className="sm muted m-0 max-w-[320px]">
          It may have been removed, or you moved to another batch.<span className="max-md:hidden"> Your other classes are on Home.</span>
        </p>
        <Link prefetch={false} href="/" className="btn btn-primary max-md:min-h-12 max-md:w-full" onClick={onClose}>
          Back to Home
        </Link>
      </div>
    </>
  );
}

function Found({ v, now, onClose }: { v: ReturnType<typeof viewOf>; now: number; onClose: () => void }) {
  const c = v.c;
  const client = useQueryClient();
  const reminders = useReminderPref();
  // the batch's name: from Home when it is loaded, else from the profile (also read for the reminder line)
  const me = useQuery({ queryKey: m4Keys.me, queryFn: ({ signal }) => m4Api.me(signal), staleTime: 5 * 60_000, retry: false });
  const batch = client.getQueryData<StudentHome>(qk.home)?.student.batch?.name ?? me.data?.profile.batch?.name ?? null;
  const [cal, setCal] = useState<"idle" | "busy" | "done" | "failed">("idle");
  const startMs = v.start;
  const strike = "cdr-strike";
  const bigCls = `cdr-big${v.live || v.soonMin !== null ? " hl" : ""}${v.cancelled ? " x" : ""}`;
  const d = inDays(now, startMs);
  const dayWord = d === "" && ist(startMs).dayIndex === ist(now).dayIndex ? "Today, " : "";
  const timeSub = v.live
    ? `Started ${Math.max(1, Math.round((now - startMs) / 60_000))} min ago · ends ${ist(v.end).time}`
    : [durLong(c.minutes), v.cancelled ? "" : d].filter(Boolean).join(" · ");
  const showCal = c.calendar.canAdd && !v.cancelled && !v.live && now < startMs;
  const remindAt = ist(startMs - 3_600_000).time;
  const remind = v.cancelled
    ? { text: "No reminder will be sent", change: false }
    : !c.remind
      ? { text: "No email reminder for this one. It is on Home and in All classes.", change: false }
      : now >= startMs - 3_600_000
        ? { text: reminders === false ? "Email reminders are off" : `Reminder sent at ${remindAt}`, change: false }
        : reminders === false
          ? { text: "Email reminders are off for you", change: true }
          : { text: `Email reminder at ${remindAt}, 1 hour before`, change: true };
  const teacher = c.teacher?.name ?? null;
  const prevEnd = c.previousStartsAt ? Date.parse(c.previousStartsAt) + c.minutes * 60_000 : 0;

  const addToCalendar = async () => {
    setCal("busy");
    try {
      await classesApi.downloadIcs(c.id, c.calendar.ics, c.title);
      setCal("done");
    } catch {
      setCal("failed");
    }
  };

  return (
    <>
      <div className="cdr-hd">
        <div className="col min-w-0 gap-2 max-md:pt-1.5">
          <ClassBadges v={v} />
          <Dialog.Title className="h2 m-0">
            <span className={strike}>{c.title}</span>
          </Dialog.Title>
        </div>
        <CloseX />
      </div>
      <div className="cdr-bd">
        <div className="row items-center gap-3.5 max-md:gap-3">
          <span className={bigCls} aria-hidden="true">
            <span className="xs font-bold" style={{ letterSpacing: ".04em" }}>
              {ist(startMs).dow.toUpperCase()}
            </span>
            <span className="h2 num">{ist(startMs).day}</span>
          </span>
          <span className="col gap-0.5">
            <span className={`sm font-semibold ${strike}`}>
              {dayWord}
              {longDate(startMs)}
            </span>
            <span className={`sm ${strike}`}>
              <time dateTime={c.startsAt}>{rangeLabel(startMs, v.end)} IST</time>
            </span>
            <span className="xs muted">{timeSub}</span>
          </span>
        </div>
        {v.moved && c.previousStartsAt && (
          <div className="cdr-nt warn" role="status">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" className="max-md:hidden">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
            <span>
              <b>Moved</b> from <s className="ev-old">{`${shortDate(c.previousStartsAt)}, ${rangeLabel(c.previousStartsAt, prevEnd)}`}</s>.
              {c.movedAt ? <> We emailed you at {atWhen(now, c.movedAt)}.</> : null}
              <span className="max-md:hidden"> The new time is above.</span>
            </span>
          </div>
        )}
        {v.cancelled && (
          <div className="cdr-nt grey" role="status">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" focusable="false" className="max-md:hidden">
              <circle cx="12" cy="12" r="9" />
              <path d="M8 8l8 8" />
            </svg>
            <span>
              <b>{c.cancelledAt ? `Cancelled at ${atWhen(now, c.cancelledAt)}.` : "Cancelled."}</b> You don&apos;t need to go.
              <span className="max-md:hidden"> If your teacher sets a new time, it shows on Home and you get an email.</span>
            </span>
          </div>
        )}

        <div className="cdr-fact">
          <span className="cdr-fi" aria-hidden="true">
            {c.place.kind === "online" ? <ScreenIcon s={16} /> : <PinIcon s={16} />}
          </span>
          <span className="col grow gap-0.5">
            <span className="cdr-k">Where</span>
            <span className={`sm font-semibold ${strike}`}>{c.place.kind === "online" ? "Online" : "At the centre"}</span>
            {placeText(c) !== "Online" && placeText(c) !== "At the centre" && (
              <span className="sm" style={{ color: "#2B2F4A" }}>
                {placeText(c)}
              </span>
            )}
            {c.joinUrl && !v.cancelled && (
              v.joinable ? (
                <a href={c.joinUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-sm mt-1.5 self-start max-md:min-h-11 max-md:w-full">
                  <ScreenIcon s={16} />
                  Join online class
                </a>
              ) : (
                <span className="xs muted mt-1">
                  The Join button appears here at {ist(Date.parse(c.joinFrom ?? "") || startMs - 15 * 60_000).time}
                  {inDays(now, startMs) ? ` on ${ist(startMs).weekday}` : ""}, 15 min before the start, and stays until {ist(v.end).time}.
                </span>
              )
            )}
          </span>
        </div>
        {teacher && (
          <div className="cdr-fact">
            <span className="avatar" style={{ width: 32, height: 32, fontSize: 12 }} aria-hidden="true" data-initials={initialsOf(teacher)} />
            <span className="col gap-0.5">
              <span className="cdr-k">Teacher</span>
              <span className="sm font-semibold">{teacher}</span>
            </span>
          </div>
        )}
        <div className="cdr-fact">
          <span className="cdr-fi" aria-hidden="true">
            <PeopleIcon />
          </span>
          <span className="col gap-0.5">
            <span className="cdr-k">Who</span>
            <span className="sm">{c.pickedForYou ? "Picked by your teacher" : batch ? `Your batch, ${batch}` : "Your batch"}</span>
          </span>
        </div>

        {c.note && (
          <div className="col gap-1.5">
            <span className="cdr-k">Note from {teacher ?? "your teacher"}</span>
            <p className="cdr-memo cl-ruled">{c.note}</p>
          </div>
        )}

        {c.followUp && <FollowUp f={c.followUp} onClose={onClose} />}

        <div className="row gap-2 text-xs" style={{ color: "#575C75" }}>
          <span className="max-md:hidden">
            <BellLineIcon />
          </span>
          <span className="grow">{remind.text}</span>
          {remind.change && (
            <Link prefetch={false} href="/profile#prefs" className="font-semibold max-md:hidden" onClick={onClose}>
              Change
            </Link>
          )}
        </div>
      </div>
      <div className="cdr-fo">
        {cal === "failed" && (
          <span className="xs mr-auto" role="alert" style={{ color: "var(--red-600)" }}>
            Couldn&apos;t make the calendar file. Try again.
          </span>
        )}
        {cal === "done" && (
          <span className="xs muted mr-auto" role="status">
            Saved. Open the file to add it to your calendar.
          </span>
        )}
        {showCal && (
          <button type="button" className="btn btn-secondary max-md:min-h-12" onClick={addToCalendar} disabled={cal === "busy"}>
            {cal === "busy" ? <Spinner size={16} /> : <CalAddIcon />}
            Add to my calendar
          </button>
        )}
        <Dialog.Close className="btn btn-primary max-md:hidden">Close</Dialog.Close>
        <Dialog.Close className="btn btn-ghost h-11 md:hidden">Close</Dialog.Close>
      </div>
    </>
  );
}

function FollowUp({ f, onClose }: { f: NonNullable<StudentClass["followUp"]>; onClose: () => void }) {
  const r = f.result;
  const pct = r && r.maxScore ? Math.round((100 * r.score) / r.maxScore) : 0;
  return (
    <div className="col gap-1.5">
      <span className="cdr-k max-md:hidden">Follow-up to</span>
      {r ? (
        <Link prefetch={false} href={`/results/${encodeURIComponent(f.testId)}`} className="cdr-res max-md:min-h-11" onClick={onClose}>
          <span className="max-md:hidden">
            <Ring percent={pct} size={40} stroke={13} />
          </span>
          <span className="col grow gap-px">
            <span className="xs muted md:hidden">Follow-up to</span>
            <span className="sm font-semibold">
              {f.testName}
              <span className="md:hidden">
                {" "}
                · {r.score} / {r.maxScore}
              </span>
            </span>
            <span className="xs muted max-md:hidden">
              Your score {r.score} / {r.maxScore}
              {r.rank ? ` · Rank ${r.rank.position} of ${r.rank.of}` : ""}
            </span>
          </span>
          <span className="sm font-semibold max-md:hidden" style={{ color: "var(--navy)" }}>
            Open result
          </span>
          <span className="md:hidden" style={{ color: "#575C75" }}>
            <ChevR />
          </span>
        </Link>
      ) : (
        <div className="cdr-res">
          <span className="col grow gap-px">
            <span className="xs muted md:hidden">Follow-up to</span>
            <span className="sm font-semibold">{f.testName}</span>
            <span className="xs muted">
              Result not out yet<span className="max-md:hidden">. It links here once your institute publishes it.</span>
            </span>
          </span>
        </div>
      )}
    </div>
  );
}
