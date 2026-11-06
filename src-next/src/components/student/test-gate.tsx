"use client";

// Student-TestGate (/tests/[id]/start): the step before the frozen /instructions. States from
// GET /tests/student/tests/:id/gate (ready, opensSoon, closed, submitted, notAssigned, resume, notFound) plus the
// client's own checks (unsupported browser, offline). The sign-in link problems (link expired / used) are drawn on
// the sign-in link page with the same card. Nothing here starts the timer: the exam starts on /instructions.

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { qk, studentApi, StudentApiError } from "@/lib/student-api";
import { useServerClock } from "@/lib/server-clock";
import { useOnline } from "@/lib/use-online";
import { useIsDesktop } from "@/lib/use-media";
import { fixtureParam } from "@/lib/fixtures";
import { ist } from "@/lib/time";
import { useAuthHydrated, useAuthStore } from "@/stores/auth.store";
import type { StudentGateResponse } from "@/types/m6";
import { GateCard, GateFrame } from "./gate-card";
import { Facts, Note, StateCard, supportCode } from "./states";
import { StateIcon } from "./state-icons";
import { Skel } from "./common";

/* ───────────── formatting (IST) ───────────── */

/** "Sun 15 Nov, 10:00 AM" */
const dayTime = (at: string) => {
  const p = ist(at);
  return `${p.dow} ${p.day} ${p.mon}, ${p.time}`;
};
/** "Mon 2 Nov" */
const dayOnly = (at: string) => {
  const p = ist(at);
  return `${p.dow} ${p.day} ${p.mon}`;
};
/** "1 h 47 min" / "12 min" */
function hm(seconds: number): string {
  const m = Math.max(0, Math.round(seconds / 60));
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`;
}

function testStrip(t: NonNullable<StudentGateResponse["test"]>) {
  const subjects = t.subjects.length ? ` · ${t.subjects.join(", ")}` : "";
  return {
    name: t.name,
    meta: `${t.questions} questions · ${t.durationMinutes} minutes · ${t.maxMarks} marks${subjects}`,
    metaShort: `${t.questions} Qs · ${t.durationMinutes} min · ${t.maxMarks} marks`,
  };
}

/* ───────────── client checks ───────────── */

interface Browser {
  name: string;
  version: number | null;
  supported: boolean;
}

/** The browser and whether it can run the exam (full screen API where it exists, storage, fetch, modern JS). */
function detectBrowser(): Browser {
  const ua = navigator.userAgent;
  const m =
    /Edg\/(\d+)/.exec(ua) ? { name: "Edge", v: /Edg\/(\d+)/.exec(ua)![1] } :
    /Firefox\/(\d+)/.exec(ua) ? { name: "Firefox", v: /Firefox\/(\d+)/.exec(ua)![1] } :
    /(?:Chrome|CriOS)\/(\d+)/.exec(ua) ? { name: "Chrome", v: /(?:Chrome|CriOS)\/(\d+)/.exec(ua)![1] } :
    /Version\/(\d+)[\d.]* .*Safari/.exec(ua) ? { name: "Safari", v: /Version\/(\d+)/.exec(ua)![1] } :
    { name: "This browser", v: null };
  const version = m.v ? Number(m.v) : null;
  const min: Record<string, number> = { Chrome: 90, Edge: 90, Firefox: 90, Safari: 14 };
  let storage = false;
  try {
    localStorage.setItem("iitp_gate_probe", "1");
    localStorage.removeItem("iitp_gate_probe");
    storage = true;
  } catch {
    storage = false;
  }
  const features = storage && typeof fetch === "function" && typeof AbortController === "function" && typeof Intl?.DateTimeFormat?.prototype?.formatToParts === "function";
  const tooOld = version !== null && min[m.name] !== undefined && version < min[m.name];
  return { name: m.name, version, supported: features && !tooOld };
}

function fullscreenAvailable(): boolean {
  const d = document as Document & { webkitFullscreenEnabled?: boolean };
  return !!(d.fullscreenEnabled || d.webkitFullscreenEnabled);
}

/* ───────────── fixtures (?fixture=ready|opens-soon|closed|submitted|not-assigned|resume|not-found|unsupported|offline) ───────────── */

function gateFixture(state: string): (StudentGateResponse & { _client?: "unsupported" | "offline" }) | null {
  const now = Date.now();
  const iso = (ms: number) => new Date(ms).toISOString();
  const mock12 = { testId: "fx-mock-12", name: "JEE Main Mock 12", questions: 75, durationMinutes: 180, maxMarks: 300, subjects: ["Physics", "Chemistry", "Maths"], opensAt: iso(now - 3 * 3600e3), closesAt: iso(now + 9 * 3600e3) };
  const base = { now: iso(now), fullscreenPolicy: { enabled: true, maxExits: 3, action: "warn" as const }, reminderEmailOn: true, batches: null, attempt: null, submission: null };
  switch (state) {
    case "ready":
      return { ...base, state: "ready", test: mock12 };
    case "opens-soon":
      return { ...base, state: "opensSoon", test: { ...mock12, testId: "fx-ps4", name: "Physics Sectional 4", questions: 25, durationMinutes: 60, maxMarks: 100, subjects: ["Physics"], opensAt: iso(now + (41 * 60 + 58) * 1000), closesAt: iso(now + (41 * 60 + 58) * 1000 + 3 * 3600e3) } };
    case "closed":
      return { ...base, state: "closed", test: { ...mock12, opensAt: iso(now - 30 * 3600e3), closesAt: iso(now - 18 * 3600e3) } };
    case "submitted":
      return { ...base, state: "submitted", test: mock12, submission: { submittedAt: iso(now - 2 * 3600e3), receiptId: "TR-7F3A-21C9", resultVisible: false, resultAt: iso(now + 18 * 86400e3), resultHidden: false } };
    case "not-assigned":
      return { ...base, state: "notAssigned", test: { ...mock12, name: "JEE Main Mock 12B" }, batches: { test: [{ id: "b-b", name: "JEE 2027 · Indore B" }], yours: { id: "b-a", name: "JEE 2027 · Indore A" } } };
    case "resume":
      return { ...base, state: "resume", test: mock12, attempt: { startedAt: iso(now - 73 * 60e3), expiresAt: iso(now + 107 * 60e3), answered: 41, total: 75, lastSavedAt: iso(now - 4 * 60e3), fullscreenExits: 1, exitsAllowed: 3 } };
    case "not-found":
      return { ...base, state: "notFound", test: null };
    case "unsupported":
      return { ...base, state: "ready", test: mock12, _client: "unsupported" };
    case "offline":
      return { ...base, state: "ready", test: mock12, _client: "offline" };
  }
  return null;
}

/* ───────────── the page ───────────── */

type Check = { label: string; kind: "ok" | "no" | "warn"; detail?: string };

function Checks({ items }: { items: Check[] }) {
  return (
    <ul className="gate-checks">
      {items.map((c) => (
        <li key={c.label} className="chk">
          <span className={`dot ${c.kind}`} aria-hidden="true">
            {c.kind === "ok" ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
            ) : c.kind === "no" ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M12 6v7M12 17.5h.01" /></svg>
            )}
          </span>
          <span className="col" style={{ gap: 1 }}>
            <span className="max-md:text-[14px]" style={{ fontWeight: 550 }}>{c.label}</span>
            {c.detail && <span className="xs muted">{c.detail}</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}

function Countdown({ seconds }: { seconds: number }) {
  const s = Math.max(0, Math.floor(seconds));
  const d = Math.floor(s / 86400);
  const parts =
    d > 0
      ? [
          { v: String(d), l: d === 1 ? "day" : "days" },
          { v: String(Math.floor((s % 86400) / 3600)).padStart(2, "0"), l: "hours" },
          { v: String(Math.floor((s % 3600) / 60)).padStart(2, "0"), l: "min" },
        ]
      : [
          { v: String(Math.floor(s / 3600)).padStart(2, "0"), l: "hours" },
          { v: String(Math.floor((s % 3600) / 60)).padStart(2, "0"), l: "min" },
          { v: String(s % 60).padStart(2, "0"), l: "sec" },
        ];
  const text = parts.map((p) => `${p.v} ${p.l}`).join(" ");
  return (
    <div className="col" style={{ gap: 8 }}>
      <span className="xs muted max-md:hidden">Opens in</span>
      <div className="cd" role="timer" aria-label={`Opens in ${text}`}>
        {parts.map((p) => (
          <div key={p.l}>
            <span className="v num">{p.v}</span>
            <span className="l">{p.l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Btn({ label, href, onClick, kind = "primary", disabled }: { label: string; href?: string; onClick?: () => void; kind?: "primary" | "ghost"; disabled?: boolean }) {
  const router = useRouter();
  if (disabled)
    return (
      <span className="btn btn-lg off" role="button" aria-disabled="true">
        {label}
      </span>
    );
  return (
    <button type="button" className={`btn btn-lg btn-${kind}`} onClick={onClick ?? (() => href && router.push(href))}>
      {label}
    </button>
  );
}

export function TestGate({ testId }: { testId: string }) {
  const router = useRouter();
  const hydrated = useAuthHydrated();
  const { currentUser, checkAuth, setTestId } = useAuthStore();
  const online = useOnline();
  const desktop = useIsDesktop();
  const [fixture, setFixture] = useState<ReturnType<typeof gateFixture>>(null);
  const [browser, setBrowser] = useState<Browser | null>(null);
  const [fsOk, setFsOk] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const f = fixtureParam();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- client-only facts (location, user agent) read once after mount
    if (f) setFixture(gateFixture(f));
    setBrowser(detectBrowser());
    setFsOk(fullscreenAvailable());
  }, []);

  useEffect(() => {
    if (!hydrated || fixture) return;
    if (!checkAuth()) router.replace(`/login?next=${encodeURIComponent(`/tests/${testId}/start`)}`);
  }, [hydrated, checkAuth, router, testId, fixture]);

  const query = useQuery({
    queryKey: qk.gate(testId),
    queryFn: ({ signal }) => studentApi.gate(testId, signal),
    enabled: hydrated && !!currentUser && !fixture,
    staleTime: 0,
    // a test about to open, or a resume, is re-checked every 30 s (the server decides when it opens)
    refetchInterval: (q) => (q.state.data?.state === "opensSoon" || q.state.data?.state === "resume" ? 30_000 : false),
  });

  const data: StudentGateResponse | undefined = fixture ?? query.data;
  const receivedAt = fixture ? 0 : query.dataUpdatedAt;
  const [fxAt] = useState(() => Date.now());
  const now = useServerClock(data?.now, fixture ? fxAt : receivedAt, data?.state === "opensSoon" || data?.state === "resume");

  // The countdown reached 0: ask the server again (it says ready once the test is open)
  const opensIn = data?.state === "opensSoon" && data.test?.opensAt ? (Date.parse(data.test.opensAt) - now) / 1000 : null;
  const opened = opensIn !== null && opensIn <= 0;
  useEffect(() => {
    if (opened && !fixture) query.refetch();
  }, [opened, fixture, query]);

  const name = currentUser?.name;
  const clientState = fixture?._client ?? (!online ? "offline" : browser && !browser.supported ? "unsupported" : null);

  const start = (to: "/instructions" | "/test") => {
    setTestId(testId);
    // the exam has its own root layout: a full page load, as useStartTest does
    window.location.assign(to);
  };
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href.replace(/\?.*$/, ""));
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const banner = clientState === "offline" ? (
    <div className="gate-banner" role="status">
      <StateIcon name="wifi" size={16} />
      <span>
        <b>{desktop === false ? "Offline." : "You're offline."}</b> {desktop === false ? "Checking again…" : "We'll check again every few seconds."}
      </span>
    </div>
  ) : null;

  const body = useMemo(() => {
    if (!data) return null;
    const t = data.test;
    const strip = t ? testStrip(t) : null;
    const back = <Btn kind="ghost" label="Back to tests" href="/tests" />;

    if (clientState === "offline")
      return (
        <GateCard tone="amber" icon="wifi" title="You're offline" body="Connect to the internet to start. Once you've started, a dropped connection is fine: answers stay on this device and are sent when you're back." test={strip} actions={<>
          <Btn label="Waiting for connection…" disabled />
          {back}
        </>} />
      );

    if (clientState === "unsupported" && (data.state === "ready" || data.state === "resume")) {
      const b = browser ?? { name: "Safari", version: 13, supported: false };
      const desktopChecks: Check[] = [
        { label: "Browser is too old", kind: "no", detail: `${b.name}${b.version ? ` ${b.version}` : ""} · full screen and answer saving need a newer version` },
        { label: "Connection is good", kind: "ok" },
        { label: `Signed in as ${name ?? "you"}`, kind: "ok" },
      ];
      const phoneChecks: Check[] = [
        { label: "Browser is too old", kind: "no", detail: "Update your phone browser, or use Chrome" },
        { label: "Connection is good", kind: "ok" },
      ];
      return (
        <GateCard tone="red" icon="device" title="This browser can't run the test" body="Open the test in an up-to-date Chrome, Edge, Firefox or Safari. Nothing has started yet, so you lose no time." test={strip} actions={<>
          <Btn label={copied ? "Link copied" : "Copy test link"} onClick={copyLink} />
          {back}
        </>}>
          <Checks items={desktop === false ? phoneChecks : desktopChecks} />
        </GateCard>
      );
    }

    switch (data.state) {
      case "ready": {
        const desktopChecks: Check[] = [
          { label: `Signed in as ${name ?? "you"}`, kind: "ok" },
          { label: "Browser is supported", kind: "ok", detail: browser?.version ? `${browser.name} ${browser.version}` : undefined },
          { label: "Connection is good", kind: "ok" },
          ...(fsOk ? [{ label: "Full screen is allowed", kind: "ok" as const, detail: data.fullscreenPolicy.enabled ? "The test opens in full screen. Leaving it is counted." : "The test opens in full screen." }] : []),
        ];
        const phoneChecks: Check[] = [
          { label: `Signed in as ${name ?? "you"}`, kind: "ok" },
          { label: "Connection is good", kind: "ok" },
          { label: "Small screen", kind: "warn", detail: "The exam layout is made for a laptop. It works here, with more scrolling." },
        ];
        const phone = desktop === false;
        return (
          <GateCard tone="green" icon="check" title="You're all set" body="Read the instructions next. Your timer starts only when you begin the test." test={strip} actions={<>
            <Btn label={phone ? "Continue on this phone" : "Continue to instructions"} onClick={() => start("/instructions")} />
            {back}
          </>}>
            <Checks items={phone ? phoneChecks : desktopChecks} />
            {phone && <Note>Best on a laptop or desktop. Plug in your charger and turn off calls if you can.</Note>}
          </GateCard>
        );
      }
      case "opensSoon": {
        const opens = t?.opensAt ? ist(t.opensAt).time : "";
        return (
          <GateCard tone="navy" icon="clock" title="This test opens soon" body={`Keep this page open. The button turns on by itself at ${opens}.`} test={strip} actions={<>
            <Btn label={`Opens at ${opens}`} disabled />
            {back}
          </>}>
            {opensIn !== null && <Countdown seconds={opensIn} />}
            <Facts items={[
              ...(t?.opensAt ? [{ k: "Opens", v: `${dayTime(t.opensAt)} IST` }] : []),
              ...(t?.closesAt ? [{ k: "Closes", v: `${dayTime(t.closesAt)} IST` }] : []),
            ]} />
            {data.reminderEmailOn && <Note>We&apos;ll also email you 1 hour before. You can turn that off in Profile.</Note>}
          </GateCard>
        );
      }
      case "closed": {
        const c = t?.closesAt;
        const sameDay = t?.opensAt && c && ist(t.opensAt).dayIndex === ist(c).dayIndex;
        return (
          <GateCard tone="grey" icon="closed" title="This test has closed" body={c ? `It closed at ${ist(c).time} on ${dayOnly(c)} and you didn't start it, so there's no score for it.` : "It has closed and you didn't start it, so there's no score for it."} test={strip} actions={<>
            <Btn label="Back to tests" href="/tests" />
            <Btn kind="ghost" label="Practise these chapters" href="/progress" />
          </>}>
            {t?.opensAt && c && <Facts items={[{ k: "Was open", v: sameDay ? `${dayOnly(t.opensAt)}, ${ist(t.opensAt).time} to ${ist(c).time}` : `${dayTime(t.opensAt)} to ${dayTime(c)}` }]} />}
            <Note>If you missed it for a good reason, tell your teacher. Only they can reopen a test.</Note>
          </GateCard>
        );
      }
      case "submitted": {
        const s = data.submission;
        const result = !s ? null : s.resultHidden ? "Not shared for this test" : s.resultVisible ? "Out now" : s.resultAt ? `Out on ${dayTime(s.resultAt)}` : "Your institute will publish it";
        return (
          <GateCard tone="green" icon="done" title="You've already submitted this test" body="Each test can be taken once. Your answers are saved." test={strip} actions={<>
            <Btn label={s?.resultVisible ? "See your result" : "View submission"} href={`/results/${encodeURIComponent(testId)}`} />
            {back}
          </>}>
            {s && <Facts items={[{ k: "Submitted", v: dayTime(s.submittedAt) }, { k: "Receipt", v: <span className="mono">{s.receiptId}</span> }, ...(result ? [{ k: "Result", v: result }] : [])]} />}
          </GateCard>
        );
      }
      case "notAssigned": {
        const theirs = data.batches?.test.map((b) => b.name).join(", ");
        const yours = data.batches?.yours?.name;
        const line = `${t?.name ?? "This test"} is set for ${theirs || "another batch"}.${yours ? ` You're in ${yours}.` : ""}`;
        return (
          <GateCard tone="grey" icon="lock" title="This test isn't for your batch" body={line} actions={<Btn label="Back to tests" href="/tests" />}>
            <Note>If your batch is wrong, tell your institute. They can move you, and the test shows up in your list.</Note>
          </GateCard>
        );
      }
      case "resume": {
        const a = data.attempt;
        const left = a ? (Date.parse(a.expiresAt) - now) / 1000 : 0;
        const pct = a && a.total ? Math.round((a.answered / a.total) * 100) : 0;
        return (
          <GateCard tone="navy" icon="resume" title="Pick up where you left off" body={a ? `You started at ${ist(a.startedAt).time}. Your answers are saved and the timer kept running while you were away.` : "Your answers are saved and the timer kept running while you were away."} test={strip} actions={<>
            <Btn label="Resume test" onClick={() => start("/instructions")} />
            <Btn kind="ghost" label="Read the instructions again" onClick={() => start("/instructions")} />
          </>}>
            {a && (
              <div className="col" style={{ gap: 6 }}>
                <div className="row between">
                  <span className="sm" style={{ fontWeight: 600 }}>{a.answered} of {a.total} answered</span>
                  {a.lastSavedAt && <span className="xs muted">{desktop === false ? "Saved" : "Last saved"} {ist(a.lastSavedAt).time}</span>}
                </div>
                <div className="bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Answered">
                  <i style={{ width: `${pct}%` }} />
                </div>
              </div>
            )}
            {a && <Facts items={[{ k: "Time left", v: `${hm(left)} · ends ${ist(a.expiresAt).time}` }, ...(a.exitsAllowed ? [{ k: "Full-screen exits", v: `${a.fullscreenExits} of ${a.exitsAllowed} allowed` }] : [])]} />}
          </GateCard>
        );
      }
      case "notFound":
      default:
        return (
          <StateCard tone="amber" icon="clipboard" eyebrow="404" title="We couldn't find this test" body="The link may be old, or your institute removed the test. Your other tests and results are safe." primary={{ label: "Back to tests", href: "/tests" }} className="gate-404" headingLevel={1} />
        );
    }
    // `now` is read for the countdown and time left
  }, [data, clientState, browser, desktop, fsOk, name, copied, now, opensIn, testId]); // eslint-disable-line react-hooks/exhaustive-deps

  let content: React.ReactNode = body;
  if (!data) {
    if (query.isError) {
      const e = query.error;
      content =
        e instanceof StudentApiError && e.status === 404 ? (
          <StateCard tone="amber" icon="clipboard" eyebrow="404" title="We couldn't find this test" body="The link may be old, or your institute removed the test. Your other tests and results are safe." primary={{ label: "Back to tests", href: "/tests" }} className="gate-404" headingLevel={1} />
        ) : (
          <StateCard tone="red" icon="warn" role="alert" title="Couldn't load this test" body={e instanceof StudentApiError && e.status === 0 ? "You seem to be offline. Check your connection and try again." : "Nothing has started, so you lose no time. Try again in a moment."} primary={{ label: "Try again", onClick: () => query.refetch() }} secondary={{ label: "Back to tests", href: "/tests" }} code={supportCode(e)} className="gate-404" headingLevel={1} />
        );
    } else if (clientState === "offline") {
      content = (
        <GateCard tone="amber" icon="wifi" title="You're offline" body="Connect to the internet to start. Once you've started, a dropped connection is fine: answers stay on this device and are sent when you're back." actions={<>
          <Btn label="Waiting for connection…" disabled />
          <Btn kind="ghost" label="Back to tests" href="/tests" />
        </>} />
      );
    } else {
      content = (
        <article className="gate" aria-busy="true" aria-label="Checking the test">
          <div className="row" style={{ gap: 14 }}>
            <Skel style={{ width: 48, height: 48, borderRadius: 14 }} />
            <div className="col grow" style={{ gap: 8 }}>
              <Skel style={{ height: 24, width: "60%" }} />
              <Skel style={{ height: 14, width: "90%" }} />
            </div>
          </div>
          <Skel style={{ height: 56, borderRadius: 12 }} />
          <Skel style={{ height: 48, width: 240, borderRadius: 12 }} />
        </article>
      );
    }
  }

  return <GateFrame banner={banner}>{content}</GateFrame>;
}
