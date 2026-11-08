"use client";

// Student-Bell (batch 9): the bell in the top bar opens a dropdown on desktop and laptop and a full sheet on phones.
// Classes, tests, results, AI review, practice; unread count (up to 9, then 9+), Mark all read, empty, loading,
// error; items kept 30 days; opening an item marks it read (rule 8). api-users docs/sms-api.md §4.
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { useInfiniteQuery, useQuery, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { b9Keys, isMissingRoute, notificationsApi, useReach } from "@/lib/b9-api";
import { daysFrom, dowDayMonth, ist } from "@/lib/time";
import { Skel } from "@/components/student/common";
import type { NotificationKind, NotificationsResponse, StudentNotification } from "@/types/b9";

const BellGlyph = ({ s = 20 }: { s?: number }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    <path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8" />
    <path d="M10.3 21a1.9 1.9 0 0 0 3.4 0" />
  </svg>
);

const P = { width: 16, height: 16, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", focusable: false } as const;
const KIND_ICON: Record<NotificationKind, React.ReactElement> = {
  class: (
    <svg {...P}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  ),
  test: (
    <svg {...P}>
      <path d="M9 4h6M8 4H6a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2" />
      <path d="m8.5 13 2.5 2.5 4.5-5" />
    </svg>
  ),
  result: (
    <svg {...P}>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </svg>
  ),
  practice: (
    <svg {...P}>
      <path d="M4 19.5V5a2 2 0 0 1 2-2h12v16H6a2 2 0 0 0-2 2" />
      <path d="M9 8h6M9 12h4" />
    </svg>
  ),
  ai: (
    <svg {...P}>
      <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />
    </svg>
  ),
};

/** The unread count for the badge: polled at most once a minute (only while the tab is visible). */
function useUnread() {
  return useQuery({
    queryKey: b9Keys.unread,
    queryFn: ({ signal }) => notificationsApi.unread(signal),
    refetchInterval: (q) => (q.state.error && isMissingRoute(q.state.error) ? false : 60_000),
    staleTime: 55_000,
    retry: (n, e) => !isMissingRoute(e) && n < 1,
  });
}

function useList(enabled: boolean) {
  return useInfiniteQuery({
    queryKey: b9Keys.notifications,
    queryFn: ({ pageParam, signal }) => notificationsApi.list(pageParam, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    enabled,
    staleTime: 0,
    retry: 1,
  });
}

/** Mark read on the page at once (list and count), then tell the API. */
function useMarkers() {
  const client = useQueryClient();
  const patch = (fn: (n: StudentNotification) => StudentNotification, unread: (u: number) => number) => {
    client.setQueryData<InfiniteData<NotificationsResponse>>(b9Keys.notifications, (d) => (d ? { ...d, pages: d.pages.map((p) => ({ ...p, items: p.items.map(fn) })) } : d));
    client.setQueryData<{ unread: number; unreadLabel: string }>(b9Keys.unread, (u) => {
      const n = Math.max(0, unread(u?.unread ?? 0));
      return { ...(u ?? {}), unread: n, unreadLabel: n > 9 ? "9+" : String(n) };
    });
  };
  return {
    one: (n: StudentNotification) => {
      if (n.read) return;
      patch((x) => (x.id === n.id ? { ...x, read: true } : x), (u) => u - 1);
      notificationsApi.read(n.id).catch(() => {});
    },
    all: () => {
      patch((x) => ({ ...x, read: true }), () => 0);
      notificationsApi.readAll().catch(() => client.invalidateQueries({ queryKey: ["student", "notifications"] }));
    },
  };
}

/** "Today" / "Yesterday" / "Earlier" in IST, newest first. */
function groupsOf(items: StudentNotification[], now: number) {
  const g: Array<{ label: string; items: StudentNotification[] }> = [];
  for (const n of items) {
    const d = daysFrom(now, n.at);
    const label = d >= 0 ? "Today" : d === -1 ? "Yesterday" : "Earlier";
    const last = g[g.length - 1];
    if (last?.label === label) last.items.push(n);
    else g.push({ label, items: [n] });
  }
  return g;
}

/**
 * The bell. `phone`: the button in the phone header, opening the full sheet; else the desktop button and dropdown.
 * Stays out of the way (renders nothing) on a stack without the notifications routes.
 */
export function Bell({ phone = false }: { phone?: boolean }) {
  const unread = useUnread();
  const [open, setOpen] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  if (unread.isError && isMissingRoute(unread.error)) return null;
  const count = unread.data?.unread ?? 0;
  const label = count ? `Notifications, ${count} unread` : "Notifications";
  const button = (
    <button ref={btn} type="button" className="bell" aria-label={label} aria-expanded={open} aria-controls={phone ? undefined : "np"} aria-haspopup={phone ? "dialog" : "true"} onClick={() => setOpen((o) => !o)}>
      <BellGlyph />
      {count > 0 && (
        <span className="bell-n" aria-hidden="true">
          {unread.data?.unreadLabel ?? String(count)}
        </span>
      )}
    </button>
  );
  if (phone)
    return (
      <Dialog.Root open={open} onOpenChange={setOpen}>
        {button}
        <Dialog.Portal>
          <Dialog.Content className="bell-sheet pop" aria-describedby={undefined}>
            <Panel phone onClose={() => setOpen(false)} />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    );
  return (
    <div ref={wrap} className="relative">
      {button}
      {open && (
        <DesktopPopover
          wrap={wrap}
          onClose={(refocus) => {
            setOpen(false);
            if (refocus) btn.current?.focus();
          }}
        />
      )}
    </div>
  );
}

function DesktopPopover({ wrap, onClose }: { wrap: React.RefObject<HTMLDivElement | null>; onClose: (refocus: boolean) => void }) {
  useEffect(() => {
    const down = (e: PointerEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) onClose(false);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose(true);
    };
    document.addEventListener("pointerdown", down);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("pointerdown", down);
      document.removeEventListener("keydown", key);
    };
  }, [wrap, onClose]);
  return (
    <section id="np" className="bell-panel pop" aria-label="Notifications">
      <Panel onClose={() => onClose(false)} />
    </section>
  );
}

function Panel({ phone = false, onClose }: { phone?: boolean; onClose: () => void }) {
  const router = useRouter();
  const list = useList(true);
  const reach = useReach(!phone);
  const mark = useMarkers();
  const items = list.data?.pages.flatMap((p) => p.items) ?? [];
  const now = list.data ? Date.parse(list.data.pages[0]?.now ?? "") || list.dataUpdatedAt : 0; // only read once the list is in
  const unread = items.filter((n) => !n.read).length;
  const state = list.data ? (items.length ? "list" : "empty") : list.isError ? "error" : "loading";
  const sub = state === "list" ? (unread ? `${unread} unread` : "All caught up") : state === "empty" ? "Last 30 days" : "";
  const Title = phone ? Dialog.Title : "h2";
  const smsTo = reach.data?.phone?.verified && !reach.data.sms.paused ? reach.data.phone.last4 : null;

  const openItem = (n: StudentNotification) => {
    mark.one(n);
    if (n.href) {
      onClose();
      router.push(n.href);
    }
  };

  return (
    <>
      <div className={phone ? "row between h-[60px] flex-none border-b border-[#EEF0F5] pr-1 pl-4" : "bell-hd"}>
        <span className="col gap-px">
          <Title className="h3 m-0">Notifications</Title>
          <span className="xs muted">{sub}</span>
        </span>
        {phone ? (
          <Dialog.Close className="bell" aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" focusable="false">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </Dialog.Close>
        ) : (
          state === "list" &&
          unread > 0 && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={mark.all}>
              Mark all read
            </button>
          )
        )}
      </div>
      {phone && state === "list" && unread > 0 && (
        <div className="row border-b border-[#EEF0F5] px-2 py-1">
          <button type="button" className="btn btn-ghost h-11" onClick={mark.all}>
            Mark all read
          </button>
        </div>
      )}

      {state === "list" && (
        <>
          <div className="bell-list col">
            {groupsOf(items, now).map((g) => (
              <div key={g.label} className="col" role="group" aria-label={g.label}>
                <span className="bell-grp" aria-hidden="true">
                  {g.label}
                </span>
                {g.items.map((n) => (
                  <button key={n.id} type="button" className={n.read ? "bell-it" : "bell-it un"} onClick={() => openItem(n)}>
                    <span className={n.read ? "bell-dot read" : "bell-dot"} aria-hidden="true" />
                    {!n.read && <span className="sr-only">Unread. </span>}
                    {!phone && (
                      <span className="ic" aria-hidden="true">
                        {KIND_ICON[n.kind] ?? KIND_ICON.test}
                      </span>
                    )}
                    <span className="col grow min-w-0 gap-0.5">
                      <span className="t">{n.title}</span>
                      {n.body && <span className="s">{n.body}</span>}
                    </span>
                    <time className="tm" dateTime={n.at}>
                      {daysFrom(now, n.at) >= -1 ? ist(n.at).time : dowDayMonth(n.at)}
                    </time>
                  </button>
                ))}
              </div>
            ))}
            {list.hasNextPage && (
              <button type="button" className="btn btn-ghost btn-sm m-2 self-center" onClick={() => list.fetchNextPage()} disabled={list.isFetchingNextPage}>
                Show older
              </button>
            )}
          </div>
          <div className="bell-foot">
            Kept for 30 days.
            {smsTo && !phone ? ` Class and test messages also go by SMS to ••••••${smsTo}.` : ""}
          </div>
        </>
      )}

      {state === "empty" && (
        <div className={phone ? "col flex-1 items-center justify-center gap-1.5 p-6 text-center" : "col items-center gap-1.5 px-6 py-9 text-center"}>
          {!phone && (
            <span className="ev-ico navy lg" aria-hidden="true">
              <BellGlyph />
            </span>
          )}
          <span className="sm font-semibold">No notifications</span>
          <span className="xs muted max-w-[280px]">{phone ? "Classes, tests, results and practice show here for 30 days." : "Classes, tests, results and practice from your teachers show here for 30 days."}</span>
        </div>
      )}

      {state === "loading" &&
        (phone ? (
          <div className="col gap-2.5 p-4" aria-busy="true" aria-label="Loading notifications">
            {[0, 1, 2].map((k) => (
              <Skel key={k} className="h-[60px] rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="col" aria-busy="true" aria-label="Loading notifications">
            {[80, 70, 75].map((w) => (
              <div key={w} className="row items-start gap-3 border-t border-[#EEF0F5] px-[18px] py-3.5 first:border-t-0">
                <Skel className="size-[34px] flex-none rounded-[10px]" />
                <span className="col grow gap-1.5">
                  <Skel className="h-3.5" style={{ width: `${w}%` }} />
                  <Skel className="h-3" style={{ width: `${w - 25}%` }} />
                </span>
              </div>
            ))}
          </div>
        ))}

      {state === "error" && (
        <div className={phone ? "col flex-1 items-center justify-center gap-2 p-6 text-center" : "col items-center gap-2 px-6 py-8 text-center"} role="alert">
          {!phone && (
            <span className="ev-ico red lg" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" focusable="false">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7.5v5.5M12 16.5h.01" />
              </svg>
            </span>
          )}
          <span className="sm font-semibold">Couldn&apos;t load notifications</span>
          {!phone && <span className="xs muted">SMS and email still reach you.</span>}
          <button type="button" className={phone ? "btn btn-primary h-11 w-full" : "btn btn-secondary btn-sm"} onClick={() => list.refetch()} disabled={list.isFetching}>
            Try again
          </button>
        </div>
      )}
    </>
  );
}
