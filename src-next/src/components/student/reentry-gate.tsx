"use client";

// Student-ReEntryGate (design batch 8): the test gate when a student comes back to a running test. States: resuming
// (back by itself, continues in 5 s), waiting for the invigilator (code, checks every 10 s; new device; offline),
// let back in, moved to another device / tab, and the two ends: re-entry not allowed, time ran out while away.
// The rules are the server's (api-tests docs/reentry-api.md); this only draws what GET …/gate says. The frozen NTA
// /instructions and /test screens are unchanged: every "Continue test" opens /instructions as before.

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { DeviceKind, GateReentry, StudentGateResponse } from "@/types/m6";
import { ist } from "@/lib/time";
import { GateCard } from "./gate-card";
import { Facts, Note } from "./states";

type Strip = { name: string; meta: string; metaShort?: string } | null;

const DEVICE_WORD: Record<DeviceKind, string> = { desktop: "laptop", phone: "phone", tablet: "tablet" };
const deviceWord = (k: DeviceKind | null | undefined) => (k ? DEVICE_WORD[k] : "device");

function hm(seconds: number): string {
  const m = Math.max(0, Math.round(seconds / 60));
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`;
}
const dayTime = (at: string) => {
  const p = ist(at);
  return `${p.dow} ${p.day} ${p.mon}, ${p.time}`;
};

function Btn({ label, onClick, href, kind = "primary", disabled }: { label: string; onClick?: () => void; href?: string; kind?: "primary" | "ghost"; disabled?: boolean }) {
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

function Progress({ answered, total, savedAt, desktop, savedLine }: { answered: number; total: number; savedAt: string | null; desktop: boolean | null; savedLine?: string }) {
  const pct = total ? Math.round((answered / total) * 100) : 0;
  return (
    <div className="col" style={{ gap: 6 }}>
      <div className="row between">
        <span className="sm" style={{ fontWeight: 600 }}>
          {answered} of {total} answered
        </span>
        {savedLine ? <span className="xs muted">{savedLine}</span> : savedAt && <span className="xs muted">{desktop === false ? "Saved" : "All saved · last at"} {ist(savedAt).time}</span>}
      </div>
      <div className="bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Answered">
        <i style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/** "Continuing by itself in 5 s" */
function AutoContinue({ seconds, onDone }: { seconds: number; onDone: () => void }) {
  const [left, setLeft] = useState(seconds);
  // the gate re-renders every second (its clock) with a new callback: keep the latest one without restarting the timer
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  }, [onDone]);
  useEffect(() => {
    if (left <= 0) {
      done.current();
      return;
    }
    const t = setTimeout(() => setLeft((x) => x - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);
  return (
    <span className="xs muted" role="status" aria-live="polite">
      Continuing by itself in {Math.max(0, left)} s
    </span>
  );
}

function CodeBox({ code, checking, paused }: { code: string; checking: string; paused: boolean }) {
  return (
    <div className="col" style={{ gap: 8 }}>
      <div className="codebox">
        <span className="col" style={{ gap: 2 }}>
          <span className="xs muted">Show this code to your invigilator</span>
          <span className="c" aria-label={`Code ${code.replace(/-/g, "").split("").join(" ")}`}>
            {code}
          </span>
        </span>
      </div>
      <span className="rg-chk" role="status" aria-live="polite">
        {paused ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
            <path d="M9 6v12M15 6v12" />
          </svg>
        ) : (
          <svg className="spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <path d="M21 12a9 9 0 1 1-6.2-8.6" strokeLinecap="round" />
          </svg>
        )}
        {checking}
      </span>
    </div>
  );
}

/** Why staff have to say yes, in the student's words */
function waitingBody(re: GateReentry, phone: boolean, offline: boolean): string {
  const left = re.facts.leftAt ? ist(re.facts.leftAt).time : null;
  if (offline) return phone ? "Staff need to let you back in. We'll ask as soon as you're online." : `${left ? `You left the test at ${left}. ` : ""}Staff have to let you back in, and we can't reach them until you're online again.`;
  switch (re.why) {
    case "signedOut":
      return phone ? "You signed out during the test, so staff need to let you back in." : `You signed out of the test${left ? ` at ${left}` : ""}, so a staff member has to let you back in.`;
    case "newDevice":
    case "otherDevice":
      return phone
        ? "This isn't the device you started on, so staff need to let you continue here."
        : `You started this test on a ${deviceWord(re.facts.previousDeviceKind)} and this is a different device, so a staff member has to let you continue here. Your answers move with you.`;
    case "onceOnly":
      return phone ? "This test is written in one sitting, so staff need to let you back in." : "This test is written in one sitting, so a staff member has to let you back in. Your answers are saved.";
    case "tooLate":
    default:
      return phone
        ? `It's been more than ${re.minutes} minute${re.minutes === 1 ? "" : "s"} since your last saved answer, so staff need to let you back in.`
        : `You left the test${left ? ` at ${left}` : ""} and it's been more than ${re.minutes} minute${re.minutes === 1 ? "" : "s"} since your last saved answer, so a staff member has to let you back in.`;
  }
}

export interface ReentryGateProps {
  data: StudentGateResponse;
  strip: Strip;
  now: number;
  desktop: boolean | null;
  online: boolean;
  /** ?moved=1: this tab's save was refused because the test moved on */
  moved: boolean;
  /** when the gate was last asked (the waiting page's "last checked") */
  checkedAt: number;
  onContinue: () => void;
  /** ask staff from this device (moved: "Ask to continue here") */
  onAsk: () => void;
}

/** Whether ReentryCard draws this gate answer (else the plain "Pick up where you left off" applies). */
export function reentryCardApplies(data: StudentGateResponse, moved: boolean): boolean {
  const re = data.attempt?.reentry;
  if (!re) return false;
  if ((moved || re.replacedHere) && re.decision !== "continue" && re.decision !== "approved") return true;
  return re.decision === "auto" || re.decision === "approved" || re.decision === "staff";
}

/** The card for a running attempt coming back, or null when the plain "Pick up where you left off" applies. */
export function ReentryCard({ data, strip, now, desktop, online, moved, checkedAt, onContinue, onAsk }: ReentryGateProps): React.ReactNode {
  const a = data.attempt;
  const re = a?.reentry;
  if (!a || !re) return null;
  const phone = desktop === false;
  const left = (Date.parse(a.expiresAt) - now) / 1000;
  const exits = a.exitsAllowed ? [{ k: "Fullscreen exits", v: `${a.fullscreenExits} of ${a.exitsAllowed} used` }] : [];
  const back = <Btn kind="ghost" label="Back to tests" href="/tests" />;
  const progress = <Progress answered={a.answered} total={a.total} savedAt={a.lastSavedAt} desktop={desktop} />;

  // The test moved to another device or tab (this tab's saves were refused): Student-ReEntryGate "moved to another
  // device" (v223). Under "any time" opening it here again moves it back; otherwise staff decide.
  if ((moved || re.replacedHere) && re.decision !== "continue" && re.decision !== "approved") {
    const tab = !re.newDevice;
    const at = re.moved?.at ? ist(re.moved.at).time : null;
    const where = deviceWord(re.moved?.deviceKind ?? "desktop");
    return (
      <GateCard
        tone="navy"
        icon="device"
        title={tab ? "This test is open in another tab" : "This test moved to another device"}
        body={
          tab
            ? "You carried on in another tab, so this one has stopped. Nothing you answered here is lost, because it was saved before the move."
            : `You opened ${strip?.name ?? "this test"} on another ${where}${at ? ` at ${at}` : ""}, so it continues there. This one has stopped; nothing you answered here is lost, because it was saved before the move.`
        }
        test={strip}
        actions={
          <>
            <Btn label="Back to tests" href="/tests" />
            {re.decision === "auto" ? <Btn kind="ghost" label="Continue on this device instead" onClick={onContinue} /> : re.decision === "staff" ? <Btn kind="ghost" label="Ask to continue here" onClick={onAsk} /> : null}
          </>
        }
      >
        <Progress answered={a.answered} total={a.total} savedAt={a.lastSavedAt} desktop={desktop} savedLine={at ? `All saved · moved with you at ${at}` : undefined} />
        <Facts items={[...(tab ? [] : [{ k: "Now on", v: `Another ${where}${at ? ` · since ${at}` : ""}` }]), { k: "Time left", v: `${hm(left)} · still running` }]} />
        <Note tone="warn">{re.policy === "any" ? "Wasn't you? Tell your invigilator now. Only one device can have the test open at a time; opening it here again moves it back." : "Wasn't you? Tell your invigilator now. Only one device can have the test open at a time."}</Note>
      </GateCard>
    );
  }

  if (re.decision === "approved") {
    const r = re.request;
    const who = r?.decidedBy?.name || "Your invigilator";
    const at = r?.decidedAt ? ist(r.decidedAt).time : null;
    const extra = r?.extraMinutes ? ` and gave you ${r.extraMinutes} minutes extra` : "";
    return (
      <GateCard
        tone="green"
        icon="check"
        title="You're back in"
        body={phone ? `${who} let you back in${r?.extraMinutes ? `, with ${r.extraMinutes} minutes extra` : ""}.` : `${who} let you back in${at ? ` at ${at}` : ""}${extra}. You continue at the question you were on.`}
        test={strip}
        actions={<Btn label="Continue test" onClick={onContinue} />}
      >
        {progress}
        <Facts items={[{ k: "Time left", v: `${hm(left)} · ends ${ist(a.expiresAt).time}` }, ...exits]} />
        <Note>This yes works once, for the next 15 minutes.</Note>
      </GateCard>
    );
  }

  if (re.decision === "staff") {
    const offline = !online;
    const code = re.request?.code;
    const checked = `Checking every ${re.pollSeconds} seconds · last checked ${new Date(checkedAt || now).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "numeric", minute: "2-digit", second: "2-digit" }).toUpperCase()}`;
    return (
      <GateCard tone="amber" icon="hand" title="Ask your invigilator to let you back in" body={waitingBody(re, phone, offline)} test={strip} actions={<><Btn label="Waiting for your invigilator…" disabled />{back}</>}>
        {code ? <CodeBox code={code} paused={offline} checking={offline ? (phone ? "Paused while offline" : "Not checking while offline") : phone ? `Checking every ${re.pollSeconds} s` : checked} /> : <span className="rg-chk" role="status">Asking your invigilator…</span>}
        {progress}
        <Facts items={[{ k: "Time left", v: `${hm(left)} · still running` }, ...exits]} />
        <Note>Your answers are safe. Not at a centre? Call or message your teacher with this code. This page moves on by itself when they say yes.</Note>
      </GateCard>
    );
  }

  if (re.decision === "auto") {
    const lastSave = re.facts.lastSaveAt ? ist(re.facts.lastSaveAt).time : null;
    const takeover = re.how === "takeover" || re.newDevice;
    const body =
      re.policy === "crash"
        ? phone
          ? `You came back within ${re.minutes} minute${re.minutes === 1 ? "" : "s"} on the same device, so you can carry on.`
          : `${lastSave ? `Your last answer was saved at ${lastSave} and you` : "You"} came back within ${re.minutes} minute${re.minutes === 1 ? "" : "s"} on the same ${deviceWord(re.facts.deviceKind)}, so you can carry on where you stopped.`
        : takeover
          ? "You can carry on here. The test moves to this device and closes on the other one."
          : "You can carry on where you stopped. Every return is noted for your institute.";
    return (
      <GateCard tone="navy" icon="resume" title="Resuming your test" body={body} test={strip} actions={<><Btn label="Continue test" onClick={onContinue} />{!takeover && <AutoContinue seconds={5} onDone={onContinue} />}</>}>
        {progress}
        <Facts items={[{ k: "Time left", v: `${hm(left)} · ends ${ist(a.expiresAt).time}` }, ...exits]} />
        <Note>The clock kept running while you were away, as in the real exam.</Note>
      </GateCard>
    );
  }
  return null;
}

/** The submitted state when re-entry ended it: denied by staff, or the time ran out while away. null otherwise. */
export function ReentryEndCard({ data, strip, testId, test }: { data: StudentGateResponse; strip: Strip; testId: string; test: StudentGateResponse["test"] }): React.ReactNode {
  const s = data.submission;
  if (!s?.endedBy) return null;
  const at = ist(s.submittedAt).time;
  const n = s.answered ?? 0;
  const view = <Btn label="View submission" href={`/results/${encodeURIComponent(testId)}`} />;
  const back = <Btn kind="ghost" label="Back to tests" href="/tests" />;
  const result = s.resultHidden ? "Not shared for this test" : s.resultVisible ? "Out now" : s.resultAt ? `Out on ${dayTime(s.resultAt)}` : "With everyone else, after it closes";
  if (s.endedBy === "reentryDenied")
    return (
      <GateCard tone="grey" icon="lock" title="Re-entry not allowed" body={`Your institute didn't let you back into this test. ${n === 1 ? "The 1 answer you saved was" : `The ${n} answers you saved were`} submitted at ${at} and count as your attempt.`} test={strip} actions={<>{view}{back}</>}>
        <Facts items={[{ k: "Submitted", v: dayTime(s.submittedAt) }, { k: "Receipt", v: <span className="mono">{s.receiptId}</span> }, { k: "Result", v: result }]} />
        <Note tone="warn">If you think this is a mistake, talk to your teacher. Only they can change it.</Note>
      </GateCard>
    );
  return (
    <GateCard tone="grey" icon="clock" title="Your time ran out while you were away" body={`Your ${n} saved answer${n === 1 ? " was" : "s were"} submitted at ${at}, when your ${test?.durationMinutes ?? ""} minutes ended. Nobody can reopen it now.`} test={strip} actions={<>{view}{back}</>}>
      <Facts items={[{ k: "Submitted", v: `${dayTime(s.submittedAt)} · by itself` }, { k: "Receipt", v: <span className="mono">{s.receiptId}</span> }]} />
    </GateCard>
  );
}
