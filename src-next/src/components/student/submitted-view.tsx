"use client";

// Student-Submitted (/result, right after the frozen /test submits). States:
// - submitted-pending / submitted-out / result-hidden / auto-time / auto-exits: from the student result
//   (GET /tests/student/results/:id: submission, visibility, M6 rankPending; 403 RESULT_HIDDEN details).
// - submitting / offline-saved / failed: when the exam hands over a submit it could not finish
//   (localStorage IITP_SUBMIT_PENDING, see lib/submit-handoff.ts), this page sends it and retries.
// "Email me" = M4 PATCH /users/student/me { preferences: { emailResults } }.

import { useCallback, useEffect, useRef, useState } from "react";
import api from "@/lib/api";
import { m4Api } from "@/lib/m4-api";
import { studentApi, StudentApiError } from "@/lib/student-api";
import { fixtureParam } from "@/lib/fixtures";
import { useOnline } from "@/lib/use-online";
import { ist } from "@/lib/time";
import { clearPendingSubmit, readPendingSubmit, type PendingSubmit } from "@/lib/submit-handoff";
import { useAuthHydrated, useAuthStore } from "@/stores/auth.store";
import type { StudentResult } from "@/types/m2-student";
import type { ResultHiddenDetails, StudentResultExtras } from "@/types/m6-student";
import { GateCard, GateFrame } from "./gate-card";
import { Facts, Note, StateCard, supportCode } from "./states";
import { StateIcon } from "./state-icons";
import { Skel } from "./common";

const LAST_KEY = "IITP_LAST_SUBMITTED";

/** "Mon 2 Nov, 11:42 AM" */
const dayTime = (at: string) => {
  const p = ist(at);
  return `${p.dow} ${p.day} ${p.mon}, ${p.time}`;
};
function hm(seconds: number): string {
  const m = Math.max(0, Math.round(seconds / 60));
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`;
}

type Result = StudentResult & Partial<StudentResultExtras>;

type View =
  | { kind: "loading" }
  | { kind: "submitting"; step: number; pending: PendingSubmit }
  | { kind: "offline"; pending: PendingSubmit; nextIn: number }
  | { kind: "failed"; pending: PendingSubmit; error: unknown }
  | { kind: "done"; testName: string; testId: string; result: Result; maxExits?: number | null }
  | { kind: "hidden"; testName: string; details: ResultHiddenDetails }
  | { kind: "error"; error: unknown; testId: string | null }
  | { kind: "none" };

/* ───────────── fixtures (?fixture=submitting|submitted-pending|submitted-out|result-hidden|auto-time|auto-exits|offline-saved|failed) ───────────── */

function fixtureView(state: string): View | null {
  const now = Date.now();
  const iso = (ms: number) => new Date(ms).toISOString();
  const test = { id: "fx-mock-12", name: "JEE Main Mock 12", shortName: "M12", kind: "full" as const, exam: null, subjects: ["Physics", "Chemistry", "Maths"], totalQuestions: 75, durationMinutes: 180, maxScore: 300, opensAt: iso(now - 4 * 3600e3), closesAt: iso(now + 8 * 3600e3) };
  const sub = (o: Partial<StudentResult["submission"]> = {}) => ({ receiptId: "TR-7F3A-21C9", submittedAt: iso(now - 60e3), autoSubmitted: false, attemptedCount: 73, totalQuestions: 75, timeUsedSeconds: 178 * 60, durationMinutes: 180, ...o });
  const vis = (status: "published" | "pending", availableAt: string | null) => ({ status, mode: "autoAfterXDays" as const, availableAt, publishedAt: status === "published" ? iso(now) : null, reason: null });
  const base: Result = { now: iso(now), test, submission: sub(), visibility: vis("pending", iso(now + 18 * 86400e3)), review: { available: false, availableAt: null, reason: null }, result: null };
  const pending: PendingSubmit = { testId: test.id, testName: test.name, answered: 73, total: 75, submittedAtDevice: iso(now - 30e3), body: {} };
  switch (state) {
    case "submitting":
      return { kind: "submitting", step: 0, pending };
    case "submitted-pending":
      return { kind: "done", testName: test.name, testId: test.id, result: base };
    case "submitted-out":
      return { kind: "done", testName: test.name, testId: test.id, result: { ...base, visibility: vis("published", null), rankPending: { availableAt: test.closesAt, submittedSoFar: 118, assigned: 212 } } };
    case "result-hidden":
      return { kind: "hidden", testName: "Chemistry Sectional 3", details: { submittedAt: iso(now - 60e3), receiptId: "TR-91C2-04AB" } };
    case "auto-time":
      return { kind: "done", testName: test.name, testId: test.id, result: { ...base, submission: sub({ autoSubmitted: true, attemptedCount: 75, timeUsedSeconds: 180 * 60 }) } };
    case "auto-exits":
      return { kind: "done", testName: test.name, testId: test.id, result: { ...base, submission: sub({ autoSubmitted: true, attemptedCount: 52, timeUsedSeconds: 95 * 60 }) } };
    case "offline-saved":
      return { kind: "offline", pending, nextIn: 8 };
    case "failed":
      return { kind: "failed", pending, error: new StudentApiError(503, "Service unavailable", "INTERNAL") };
  }
  return null;
}

/* ───────────── pieces ───────────── */

const STEPS = (answered: number) => ["Saving your last answers", `Sending ${answered} answers`, "Getting your receipt"];

function Steps({ step, answered }: { step: number; answered: number }) {
  return (
    <ol className="steps" aria-live="polite">
      {STEPS(answered).map((label, i) => {
        const done = i < step;
        const active = i === step;
        return (
          <li key={label}>
            <span className={`sd ${done ? "done" : active ? "active" : "wait"}`} aria-hidden="true">
              {done && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
              )}
              {active && <span className="spin" />}
            </span>
            <span style={i <= step ? { color: "var(--ink)", fontWeight: 550 } : { color: "var(--muted)" }}>{label}</span>
          </li>
        );
      })}
    </ol>
  );
}

function EmailMe({ id, initial }: { id: string; initial: boolean }) {
  const [on, setOn] = useState(initial);
  const [busy, setBusy] = useState(false);
  const toggle = async () => {
    const next = !on;
    setOn(next);
    setBusy(true);
    try {
      await m4Api.patchMe({ preferences: { emailResults: next } });
    } catch {
      setOn(!next); // rolled back: the switch shows what is saved
    } finally {
      setBusy(false);
    }
  };
  return (
    <span className="row" style={{ gap: 8 }}>
      <span id={id} className="xs" style={{ fontWeight: 600 }}>
        Email me
      </span>
      <button type="button" className="swhit" role="switch" aria-checked={on} aria-labelledby={id} onClick={toggle} disabled={busy}>
        <span className={`sw ${on ? "on" : "off"}`} />
      </button>
    </span>
  );
}

function Acts({ primary, secondary }: { primary: { label: string; href?: string; onClick?: () => void; disabled?: boolean }; secondary?: { label: string; href: string } }) {
  const P = primary.href ? (
    <a href={primary.href} className="btn btn-lg btn-primary">
      {primary.label}
    </a>
  ) : (
    <button type="button" className="btn btn-lg btn-primary" onClick={primary.onClick} disabled={primary.disabled}>
      {primary.label}
    </button>
  );
  return (
    <>
      {P}
      {secondary && (
        <a href={secondary.href} className="btn btn-lg btn-ghost">
          {secondary.label}
        </a>
      )}
    </>
  );
}

/* ───────────── the page ───────────── */

export function SubmittedView() {
  const hydrated = useAuthHydrated();
  const checkAuth = useAuthStore((s) => s.checkAuth);
  const online = useOnline();
  const [view, setView] = useState<View>({ kind: "loading" });
  const [emailPref, setEmailPref] = useState<boolean | null>(null);
  const fixture = useRef<string | null>(null);
  const attempt = useRef(0);

  /** The submitted result: published / pending / hidden; NO_SUBMISSION means the submit never arrived. */
  const loadResult = useCallback(async (testId: string, testName?: string) => {
    try {
      const r = (await studentApi.result(testId)) as Result;
      // an automatic submit: the gate holds the test's full-screen policy ("You left full screen 3 times")
      const maxExits = r.submission.autoSubmitted ? await studentApi.gate(testId).then((g) => (g.fullscreenPolicy.enabled ? g.fullscreenPolicy.maxExits : null)).catch(() => null) : null;
      setView({ kind: "done", testName: r.test.name, testId, result: r, maxExits });
    } catch (e) {
      if (e instanceof StudentApiError && e.code === "RESULT_HIDDEN" && e.details) {
        setView({ kind: "hidden", testName: testName ?? "", details: e.details as unknown as ResultHiddenDetails });
      } else setView({ kind: "error", error: e, testId });
    }
  }, []);

  /** Send a handed-over submit; offline or 5xx: keep it on the device and try again (8 s, then 15 s, 30 s). */
  const send = useCallback(
    async (p: PendingSubmit) => {
      if (!navigator.onLine) {
        setView({ kind: "offline", pending: p, nextIn: 8 });
        return;
      }
      setView({ kind: "submitting", step: 0, pending: p });
      const t1 = setTimeout(() => setView((v) => (v.kind === "submitting" ? { ...v, step: 1 } : v)), 700);
      try {
        await api.tests.submit(p.body as Parameters<typeof api.tests.submit>[0]);
        clearTimeout(t1);
        setView((v) => (v.kind === "submitting" ? { ...v, step: 2 } : v));
        clearPendingSubmit();
        await loadResult(p.testId, p.testName);
      } catch (err) {
        clearTimeout(t1);
        const res = (err as { response?: { status?: number; data?: { code?: string } } })?.response;
        const code = res?.data?.code;
        if (code === "ALREADY_SUBMITTED" || code === "SUBMIT_TOO_LATE") {
          // already in (another tab), or the auto-submit used the saved answers: show what the server has
          clearPendingSubmit();
          await loadResult(p.testId, p.testName);
          return;
        }
        attempt.current += 1;
        if (!res || (res.status ?? 0) >= 500) {
          const wait = [8, 15, 30][Math.min(attempt.current - 1, 2)];
          setView(!navigator.onLine || !res ? { kind: "offline", pending: p, nextIn: wait } : { kind: "failed", pending: p, error: new StudentApiError(res.status ?? 0, "", code as never) });
        } else setView({ kind: "failed", pending: p, error: new StudentApiError(res.status ?? 0, "", code as never) });
      }
    },
    [loadResult]
  );

  // First load: a fixture, a handed-over submit, or the test this page was opened for.
  useEffect(() => {
    if (!hydrated) return;
    const f = fixtureParam();
    if (f) {
      fixture.current = f;
      const v = fixtureView(f);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- fixture states are set once after mount
      if (v) setView(v);
      if (f === "submitting") {
        let s = 0;
        const iv = setInterval(() => {
          s += 1;
          if (s >= 4) {
            clearInterval(iv);
            setView(fixtureView("submitted-pending")!);
          } else setView((v2) => (v2.kind === "submitting" ? { ...v2, step: s } : v2));
        }, 1100);
        return () => clearInterval(iv);
      }
      return;
    }
    if (!checkAuth()) {
      window.location.replace("/login");
      return;
    }
    const pending = readPendingSubmit();
    if (pending) {
      void send(pending);
      return;
    }
    let testId: string | null = null;
    try {
      const raw = localStorage.getItem("result");
      if (raw && raw.startsWith("{")) testId = (JSON.parse(raw) as { testId?: string }).testId ?? null;
      // the exam's hand-over keys: cleared here so /test does not bounce back to /result; the id is kept for a reload
      localStorage.removeItem("IITP_TEST_SUBMITTED_KEY");
      localStorage.removeItem("result");
      if (testId) sessionStorage.setItem(LAST_KEY, testId);
      else testId = sessionStorage.getItem(LAST_KEY);
    } catch {
      testId = null;
    }
    if (!testId) setView({ kind: "none" });
    else void loadResult(testId);
  }, [hydrated, checkAuth, send, loadResult]);

  // The "Email me" switch starts from the saved preference.
  useEffect(() => {
    if (view.kind !== "done" || emailPref !== null || fixture.current) return;
    m4Api
      .me()
      .then((r) => setEmailPref(r.profile.preferences.emailResults))
      .catch(() => setEmailPref(true));
  }, [view.kind, emailPref]);

  // Offline-saved: count down and retry; coming back online retries at once.
  const nextIn = view.kind === "offline" ? view.nextIn : null;
  useEffect(() => {
    if (view.kind !== "offline" || fixture.current) return;
    if (online && view.nextIn <= 0) {
      void send(view.pending);
      return;
    }
    const t = setTimeout(() => setView((v) => (v.kind === "offline" ? { ...v, nextIn: Math.max(0, v.nextIn - 1) } : v)), 1000);
    return () => clearTimeout(t);
  }, [view, nextIn, online, send]);
  useEffect(() => {
    if (online && view.kind === "offline" && !fixture.current) void send(view.pending);
    // only on the switch back online
  }, [online]); // eslint-disable-line react-hooks/exhaustive-deps

  const offlineBanner = (
    <div className="gate-banner" role="status">
      <StateIcon name="wifi" size={16} />
      <span className="max-md:hidden">
        <b>You&apos;re offline.</b> Keep this tab open. We send your answers the moment you&apos;re back.
      </span>
      <span className="md:hidden">
        <b>Offline.</b> Keep this open.
      </span>
    </div>
  );

  let content: React.ReactNode;
  switch (view.kind) {
    case "loading":
      content = (
        <article className="gate" aria-busy="true" aria-label="Loading your receipt">
          <div className="row" style={{ gap: 14 }}>
            <Skel style={{ width: 48, height: 48, borderRadius: 14 }} />
            <div className="col grow" style={{ gap: 8 }}>
              <Skel style={{ height: 24, width: "50%" }} />
              <Skel style={{ height: 14, width: "85%" }} />
            </div>
          </div>
          <Skel style={{ height: 110, borderRadius: 12 }} />
        </article>
      );
      break;
    case "submitting":
      content = (
        <GateCard tone="navy" icon="send" title="Submitting your answers" body="Please don't close this tab. It takes a few seconds.">
          <Steps step={view.step} answered={view.pending.answered} />
        </GateCard>
      );
      break;
    case "offline":
      content = (
        <GateCard
          tone="amber"
          icon="deviceSaved"
          title="Your answers are safe on this device"
          body={`We'll send them as soon as you're back online. Your submit time stays ${ist(view.pending.submittedAtDevice).time}, so waiting costs you nothing.`}
          actions={<Acts primary={{ label: "Try now", onClick: () => void send(view.pending) }} />}
        >
          <Facts items={[{ k: "Test", v: view.pending.testName }, { k: "Answered", v: `${view.pending.answered} of ${view.pending.total}` }, { k: "Next try", v: online ? `In ${view.nextIn} seconds` : "When you're back online" }]} />
          <Note tone="warn">Keep this tab open until you see the receipt. Closing it now keeps the answers on this device only.</Note>
        </GateCard>
      );
      break;
    case "failed":
      content = (
        <GateCard
          tone="red"
          icon="warn"
          title="We couldn't submit yet"
          body={`Your ${view.pending.answered} answers are safe on this device. Try again. If it keeps failing, show your teacher this screen.`}
          actions={<Acts primary={{ label: "Try again", onClick: () => void send(view.pending) }} />}
        >
          <Facts items={[{ k: "Test", v: view.pending.testName }, { k: "Time ended", v: dayTime(view.pending.submittedAtDevice) }]} />
          <span className="xs muted mono">Code {supportCode(view.error)}</span>
        </GateCard>
      );
      break;
    case "hidden":
      content = (
        <GateCard
          tone="green"
          icon="check"
          stamp={`Submitted · ${ist(view.details.submittedAt).time}`}
          title="Test submitted"
          body="Your answers are saved. Your institute isn't sharing scores for this test; your teacher will go through it in class."
          actions={<Acts primary={{ label: "Back to tests", href: "/tests" }} />}
        >
          <Facts items={[...(view.testName ? [{ k: "Test", v: view.testName }] : []), { k: "Submitted", v: dayTime(view.details.submittedAt) }, { k: "Receipt", v: <span className="mono">{view.details.receiptId}</span> }]} />
        </GateCard>
      );
      break;
    case "done": {
      const r = view.result;
      const s = r.submission;
      const published = r.visibility.status === "published";
      const resultHref = `/results/${encodeURIComponent(view.testId)}`;
      const answered = `${s.attemptedCount} of ${s.totalQuestions}`;
      const receipt = { k: "Receipt", v: <span className="mono">{s.receiptId}</span> };
      // The submit answer's autoSubmitted.reason is not handed over by the exam; an auto-submit well before the
      // time ran out can only be the full-screen exit limit.
      const auto = s.autoSubmitted ? (s.timeUsedSeconds < s.durationMinutes * 60 - 60 ? "exitLimit" : "timeUp") : null;
      const pendingBox = (
        <div className="res">
          <div className="col grow" style={{ gap: 2 }}>
            <span className="sm" style={{ fontWeight: 600 }}>
              {r.visibility.availableAt ? `Result out ${dayTime(r.visibility.availableAt)}` : "Result out when your institute publishes it"}
            </span>
            <span className="xs muted max-md:hidden">Everyone&apos;s result comes out together.</span>
          </div>
          {emailPref !== null || fixture.current ? <EmailMe id="em-sub" initial={emailPref ?? true} /> : null}
        </div>
      );
      if (auto === "timeUp") {
        content = (
          <GateCard tone="navy" icon="clock" title="Time's up. We submitted your test" body={`Every answer you marked before ${ist(s.submittedAt).time} is saved, including ones marked for review.`} actions={<Acts primary={published ? { label: "See your result", href: resultHref } : { label: "Back to tests", href: "/tests" }} />}>
            <Facts items={[{ k: "Test", v: view.testName }, { k: "Submitted", v: `${dayTime(s.submittedAt)} · automatically` }, { k: "Answered", v: answered }, receipt]} />
            {!published && pendingBox}
          </GateCard>
        );
      } else if (auto === "exitLimit") {
        content = (
          <GateCard tone="amber" icon="exit" title="Your test was submitted for you" body={`You left full screen ${view.maxExits ?? (fixture.current ? 3 : null) ? `${view.maxExits ?? 3} times` : "too many times"}, the limit for this test, so it was submitted then.`} actions={<Acts primary={published ? { label: "See your result", href: resultHref } : { label: "Back to tests", href: "/tests" }} />}>
            <Facts items={[{ k: "Test", v: view.testName }, { k: "Submitted", v: `${dayTime(s.submittedAt)} · automatically` }, { k: "Answered", v: answered }, receipt]} />
            {!published && pendingBox}
            <Note tone="warn">If this happened by mistake (a call, a pop-up), tell your teacher. They can see the time of each exit.</Note>
          </GateCard>
        );
      } else {
        content = (
          <GateCard
            tone="green"
            icon="check"
            stamp={`Submitted · ${ist(s.submittedAt).time}`}
            title="Test submitted"
            body={published ? "Your answers are saved and your result is already out." : "Your answers are saved. Keep the receipt number if you need to ask about it."}
            actions={<Acts primary={published ? { label: "See your result", href: resultHref } : { label: "Back to tests", href: "/tests" }} secondary={published ? { label: "Back to tests", href: "/tests" } : { label: "Home", href: "/" }} />}
          >
            <Facts items={[{ k: "Test", v: view.testName }, { k: "Submitted", v: dayTime(s.submittedAt) }, { k: "Answered", v: `${answered} · ${hm(s.timeUsedSeconds)} used` }, receipt]} />
            {published ? (
              <div className="res ok">
                <div className="col grow" style={{ gap: 2 }}>
                  <span className="sm" style={{ fontWeight: 600, color: "#0E7A3D" }}>
                    Your result is ready
                  </span>
                  {r.rankPending && <span className="xs muted max-md:hidden">Rank fills in after the test closes at {ist(r.rankPending.availableAt).time}.</span>}
                </div>
              </div>
            ) : (
              pendingBox
            )}
          </GateCard>
        );
      }
      break;
    }
    case "error":
      content = (
        <StateCard
          tone="red"
          icon="warn"
          role="alert"
          title="Couldn't load your receipt"
          body="Your answers were sent. Open the test from your list to see its receipt."
          primary={view.testId ? { label: "Try again", onClick: () => view.testId && void loadResult(view.testId) } : undefined}
          secondary={{ label: "Back to tests", href: "/tests" }}
          code={supportCode(view.error)}
          className="gate-404"
          headingLevel={1}
        />
      );
      break;
    case "none":
      // opened without a submitted test (an old bookmark): nothing to show here
      content = <StateCard tone="grey" icon="clipboard" title="No test was just submitted" body="Your submitted tests and their receipts are in your list." primary={{ label: "Back to tests", href: "/tests" }} className="gate-404" headingLevel={1} />;
      break;
  }

  return (
    <GateFrame back={null} banner={view.kind === "offline" && !online ? offlineBanner : view.kind === "offline" && fixture.current ? offlineBanner : null}>
      {content}
    </GateFrame>
  );
}
