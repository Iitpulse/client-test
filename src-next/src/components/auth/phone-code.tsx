"use client";

// Student-PhoneSignIn (batch 9): sign in, or reset the password, with a code texted to the phone. Number → code by
// SMS to ••••••4321 (resend after 30 s, "Send by email instead" after 30 s, wrong code, too many tries) → on a shared
// number "Which account?" → signed in, or (reset) "Choose a new password". api-users docs/sms-api.md §2.
// Never says whether a number has an account: every send answers the same.
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { InkUnderline } from "@iitpulse/ui";
import { authApi, apiError } from "@/lib/auth-api";
import { useOnline } from "@/lib/use-online";
import { useAuthStore } from "@/stores/auth.store";
import { Spinner } from "@/components/shell/icons";
import { initialsOf } from "@/components/shell/avatar";
import type { PhoneAccount, PhonePurpose, PhoneVerifyAnswer } from "@/types/b9";
import { AuthBox, ErrText, PhoneField } from "./form-bits";
import { PasswordField } from "./password-field";

type Step = "phone" | "code" | "pick" | "newPw";
type CodeProblem = { kind: "wrong"; triesLeft: number | null } | { kind: "locked"; until: number; minutes: number } | { kind: "expired" } | { kind: "disabled" } | { kind: "failed" } | null;
type SendProblem = { kind: "limited"; until: number } | { kind: "locked"; until: number } | { kind: "failed" } | null;

const istClock = (ms: number) => new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" }).format(new Date(ms)).replace(/\s?(am|pm)$/i, (m) => ` ${m.trim().toUpperCase()}`);
const lockOf = (until: number) => ({ kind: "locked" as const, until, minutes: Math.max(1, Math.round((until - Date.now()) / 60_000)) });
const untilOf = (details?: Record<string, unknown>, fallbackSec = 15 * 60) => {
  const u = typeof details?.until === "string" ? Date.parse(details.until) : NaN;
  if (!Number.isNaN(u)) return u;
  return Date.now() + (Number(details?.retryAfterSeconds) || fallbackSec) * 1000;
};

export function PhoneCodeFlow({ purpose, tabs, next = "/" }: { purpose: PhonePurpose; tabs?: React.ReactNode; next?: string }) {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const online = useOnline();
  const reset = purpose === "reset";
  const [step, setStep] = useState<Step>("phone");
  const [digits, setDigits] = useState("");
  const [numErr, setNumErr] = useState(false);
  const [sendProblem, setSendProblem] = useState<SendProblem>(null);
  const [noAnswer, setNoAnswer] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState("");
  const [resendAt, setResendAt] = useState(0);
  const [clock, setClock] = useState(() => Date.now());
  const [code, setCode] = useState("");
  const [problem, setProblem] = useState<CodeProblem>(null);
  const [emailed, setEmailed] = useState(false);
  const [pick, setPick] = useState<{ token: string; accounts: PhoneAccount[] } | null>(null);
  const [resetFor, setResetFor] = useState<{ token: string; label: string } | null>(null);
  const [pw, setPw] = useState({ a: "", b: "", err: "" as string });
  const codeRef = useRef<HTMLInputElement>(null);

  // the resend countdown, by the second
  useEffect(() => {
    if (step !== "code" || resendAt <= clock) return;
    const t = setTimeout(() => setClock(Date.now()), 1000);
    return () => clearTimeout(t);
  }, [step, resendAt, clock]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reacting to the browser's online event
    if (online) setNoAnswer(false);
  }, [online]);
  const offline = !online || noAnswer;
  const cd = Math.max(0, Math.ceil((resendAt - clock) / 1000));

  const toCode = (to: string, afterSec: number) => {
    setSentTo(to);
    const now = Date.now();
    setClock(now);
    setResendAt(now + afterSec * 1000);
    setStep("code");
    setCode("");
    setProblem(null);
    requestAnimationFrame(() => codeRef.current?.focus());
  };

  const send = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (offline || busy) return;
    if (digits.length !== 10 || !/^[6-9]/.test(digits)) return setNumErr(true);
    setSendProblem(null);
    setBusy(true);
    try {
      const r = await authApi.phone.sendCode(digits, purpose);
      setEmailed(false);
      toCode(r.data.data.sentTo, r.data.data.resendAfterSeconds ?? 30);
    } catch (err) {
      const { status, code: c, details } = apiError(err);
      if (status === 0) setNoAnswer(true);
      else if (c === "INVALID_PHONE" || status === 400) setNumErr(true);
      else if (c === "OTP_COOLDOWN") toCode(`••••••${digits.slice(-4)}`, Number(details?.retryAfterSeconds) || 30); // a code is already on its way
      else if (c === "OTP_LOCKED") {
        toCode(`••••••${digits.slice(-4)}`, 0);
        setProblem(lockOf(untilOf(details)));
      } else if (c === "OTP_RATE_LIMITED" || status === 429) {
        if (step === "code") setProblem(lockOf(untilOf(details, 60 * 60)));
        else setSendProblem({ kind: "limited", until: untilOf(details, 60 * 60) });
      } else setSendProblem({ kind: "failed" });
    } finally {
      setBusy(false);
    }
  };

  const done = (a: PhoneVerifyAnswer) => {
    if (a.status === "signed_in") {
      login(a.token, undefined, a.expiresAt);
      router.push(next);
    } else if (a.status === "reset_ready") {
      setResetFor({ token: a.resetToken, label: a.account.label });
      setStep("newPw");
    } else {
      setPick({ token: a.pickToken, accounts: a.accounts });
      setStep("pick");
    }
  };

  const verify = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (offline || busy || problem?.kind === "locked") return;
    if (!/^\d{6}$/.test(code)) return setProblem({ kind: "wrong", triesLeft: null });
    setBusy(true);
    try {
      const r = await authApi.phone.verify(digits, purpose, code);
      done(r.data.data);
    } catch (err) {
      const { status, code: c, details } = apiError(err);
      if (status === 0) setNoAnswer(true);
      else if (c === "OTP_LOCKED" || status === 429) setProblem(lockOf(untilOf(details)));
      else if (c === "OTP_EXPIRED" || status === 410) setProblem({ kind: "expired" });
      else if (c === "ACCOUNT_DISABLED") setProblem({ kind: "disabled" });
      else if (c === "OTP_WRONG" || status === 400) setProblem({ kind: "wrong", triesLeft: typeof details?.triesLeft === "number" ? details.triesLeft : null });
      else setProblem({ kind: "failed" });
      codeRef.current?.select();
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    setEmailed(false);
    await send();
  };
  const byEmail = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await authApi.phone.byEmail(digits, purpose);
      setEmailed(true);
    } catch (err) {
      const { status, code: c, details } = apiError(err);
      if (status === 0) setNoAnswer(true);
      else if (c === "OTP_COOLDOWN") setResendAt(Date.now() + (Number(details?.retryAfterSeconds) || 30) * 1000);
      else if (c === "OTP_EXPIRED" || status === 410) setProblem({ kind: "expired" });
      else setProblem({ kind: "failed" });
    } finally {
      setBusy(false);
    }
  };

  const pickAccount = async (id: string) => {
    if (!pick || busy) return;
    setBusy(true);
    try {
      const r = await authApi.phone.pick(pick.token, id, purpose);
      done(r.data.data);
    } catch (err) {
      const { status } = apiError(err);
      if (status === 0) setNoAnswer(true);
      else {
        // PICK_EXPIRED (5 minutes, works once) or anything else: start again with a new code
        setStep("phone");
        setPick(null);
        setSendProblem({ kind: "failed" });
      }
    } finally {
      setBusy(false);
    }
  };

  const savePw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetFor || busy) return;
    if (pw.a.length < 8) return setPw((x) => ({ ...x, err: "Too short. Use at least 8 characters." }));
    if (pw.a !== pw.b) return setPw((x) => ({ ...x, err: "The two passwords don't match." }));
    setBusy(true);
    try {
      await authApi.phone.reset(resetFor.token, pw.a);
      router.push("/login?reset=done&with=email");
    } catch (err) {
      const { status, code: c, message } = apiError(err);
      if (status === 0) setNoAnswer(true);
      else if (c === "RESET_EXPIRED" || status === 401) {
        setStep("phone");
        setResetFor(null);
        setSendProblem({ kind: "failed" });
      } else setPw((x) => ({ ...x, err: c === "WEAK_PASSWORD" ? message || "Too short. Use at least 8 characters." : "Couldn't save the new password. Please try again." }));
    } finally {
      setBusy(false);
    }
  };

  const offlineBox = offline && (
    <AuthBox tone="srv" icon="wifi" title="You're offline">
      <span className="xs">Connect to the internet to {reset ? "reset your password" : "sign in"}. What you typed stays here.</span>
    </AuthBox>
  );
  const emailLink = reset ? "/forgot-password?by=email" : "/login?with=email";

  if (step === "phone")
    return (
      <form className="col fade gap-5" onSubmit={send} noValidate>
        <div className="col gap-2.5">
          <h1 className="h1">
            {reset ? (
              <>
                Reset your <InkUnderline delay={300}>password</InkUnderline>
              </>
            ) : (
              <>
                Welcome <InkUnderline delay={450}>back</InkUnderline>
              </>
            )}
          </h1>
          <p className="sm muted m-0">{reset ? "We'll text a 6-digit code to the phone on your account. It works once and expires in 10 minutes." : "Sign in with a code we text to your phone. No password needed."}</p>
        </div>
        {tabs}
        {offlineBox}
        {sendProblem?.kind === "limited" && (
          <AuthBox tone="sum" icon="clock" title="Too many codes for this number">
            <span className="xs">Ask for a new one after {istClock(sendProblem.until)}, or use email and password.</span>
          </AuthBox>
        )}
        {sendProblem?.kind === "failed" && (
          <AuthBox tone="sum" icon="wrong" title="Couldn't send the code right now">
            <span className="xs">Try again in a moment, or use email and password.</span>
          </AuthBox>
        )}
        <div className="field">
          <label className="label" htmlFor="ph">
            Phone number
          </label>
          <PhoneField
            id="ph"
            value={digits}
            onChange={(d) => {
              setDigits(d);
              setNumErr(false);
            }}
            invalid={numErr}
            describedBy="ph-h"
          />
          {numErr ? (
            <ErrText id="ph-h" icon>
              Phone numbers have 10 digits
            </ErrText>
          ) : (
            <span className="hint" id="ph-h">
              The number your institute has for you, or your parent&apos;s if you share it.
            </span>
          )}
        </div>
        <button type="submit" className={offline ? "btn btn-primary btn-lg au-btn-off" : "btn btn-primary btn-lg w-full"} disabled={busy || offline}>
          {busy && <Spinner />}
          {offline ? "Offline · waiting to connect" : busy ? "Sending…" : "Send code by SMS"}
        </button>
        {reset ? (
          <p className="xs muted m-0 text-center">
            No phone on your account?{" "}
            <Link href={emailLink} className="font-semibold">
              Reset by email instead
            </Link>
          </p>
        ) : (
          <p className="xs muted m-0 text-center text-balance">The SMS comes from IITPLS. Got a test link from your teacher? Opening it signs you in.</p>
        )}
      </form>
    );

  if (step === "code") {
    const locked = problem?.kind === "locked";
    return (
      <form className="col fade gap-[18px]" onSubmit={verify} noValidate>
        <button
          type="button"
          className="sm row min-h-8 gap-1.5 self-start border-0 bg-transparent p-0 font-semibold text-muted hover:text-ink max-md:min-h-11"
          onClick={() => {
            setStep("phone");
            setProblem(null);
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" focusable="false">
            <path d="M19 12H5M11 18l-6-6 6-6" />
          </svg>
          Change number
        </button>
        <div className="col gap-2.5">
          <h1 className="h1">Enter the code</h1>
          <p className="sm muted m-0" role="status">
            Code sent by SMS to {sentTo}. It expires in 10 minutes.
          </p>
        </div>
        {offlineBox}
        {problem?.kind === "wrong" && (
          <AuthBox tone="sum" icon="wrong" title="That code isn't right" id="otp-err">
            <span className="xs">
              Check the latest SMS.{problem.triesLeft !== null ? ` ${problem.triesLeft} ${problem.triesLeft === 1 ? "try" : "tries"} left.` : ""}
            </span>
          </AuthBox>
        )}
        {locked && (
          <AuthBox tone="sum" icon="wrong" title="Too many wrong codes" id="otp-err">
            <span className="xs">
              This code no longer works. Ask for a new one after {istClock(problem.until)} ({problem.minutes} minutes), or use email and password.
            </span>
            <Link href={emailLink} className="au-inl sm">
              Use email and password
            </Link>
          </AuthBox>
        )}
        {problem?.kind === "expired" && (
          <AuthBox tone="sum" icon="clock" title="That code has expired" id="otp-err">
            <span className="xs">Ask for a new one below.</span>
          </AuthBox>
        )}
        {problem?.kind === "disabled" && (
          <AuthBox tone="sum" icon="lock" title="Your account is turned off. Ask your institute.">
            <span className="xs">IIT-PULSE Indore can turn it back on.</span>
          </AuthBox>
        )}
        {problem?.kind === "failed" && (
          <AuthBox tone="sum" icon="wrong" title="Couldn't check the code right now">
            <span className="xs">Try again in a moment.</span>
          </AuthBox>
        )}
        {emailed && !locked && (
          <div className="au-box ok pop" role="status">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <path d="m3 7 9 6 9-6" />
            </svg>
            <span className="sm">The same code is on its way by email to the address on your account. The SMS code still works too.</span>
          </div>
        )}
        <div className="field">
          <label className="label" htmlFor="otp">
            6-digit code
          </label>
          <input
            ref={codeRef}
            id="otp"
            className={problem?.kind === "wrong" ? "input otp-in e" : "input otp-in"}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(e) => {
              setCode(e.target.value.replace(/\D/g, "").slice(0, 6));
              if (problem?.kind === "wrong" || problem?.kind === "failed") setProblem(null);
            }}
            aria-invalid={problem?.kind === "wrong" || undefined}
            aria-describedby={problem ? "otp-err" : undefined}
            disabled={locked}
          />
        </div>
        {!locked && (
          <button type="submit" className="btn btn-primary btn-lg w-full" disabled={busy || offline}>
            {busy && <Spinner />}
            {reset ? "Continue" : "Verify and sign in"}
          </button>
        )}
        {!locked && (
          <div className="col items-center gap-1">
            {cd > 0 ? (
              <p className="sm muted m-0 flex min-h-8 items-center">
                Didn&apos;t get it? Resend in&nbsp;
                <span className="num font-semibold text-ink-2">0:{String(cd).padStart(2, "0")}</span>
              </p>
            ) : (
              <>
                <p className="sm muted m-0 flex items-center">
                  Didn&apos;t get it?&nbsp;
                  <button type="button" className="au-inl" style={{ color: "var(--navy)" }} onClick={resend} disabled={busy}>
                    Resend code
                  </button>
                </p>
                {!emailed && (
                  <p className="sm muted m-0 flex items-center text-center">
                    SMS didn&apos;t arrive?&nbsp;
                    <button type="button" className="au-inl" style={{ color: "var(--navy)" }} onClick={byEmail} disabled={busy}>
                      Send by email instead
                    </button>
                  </p>
                )}
              </>
            )}
          </div>
        )}
      </form>
    );
  }

  if (step === "pick" && pick)
    return (
      <div className="col fade gap-[18px]">
        <div className="col gap-2.5">
          <h1 className="h1">Which account?</h1>
          <p className="sm muted m-0">This number is on {pick.accounts.length} accounts. Pick yours. Only accounts on this number are shown.</p>
        </div>
        {offlineBox}
        <ul className="col m-0 list-none gap-2.5 p-0">
          {pick.accounts.map((a, i) => (
            <li key={a.id}>
              <button type="button" className="acct" onClick={() => pickAccount(a.id)} disabled={busy}>
                <span className="avatar" aria-hidden="true" data-initials={a.initials || initialsOf(a.label)} style={i % 2 ? { background: "#E9F6EE", color: "#0B4D27" } : undefined} />
                <span className="col grow gap-px">
                  <span className="sm font-semibold">{a.label}</span>
                  <span className="xs muted">
                    {a.role} · {a.institute}
                  </span>
                </span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#575C75" strokeWidth="2" strokeLinecap="round" aria-hidden="true" focusable="false">
                  <path d="m9 6 6 6-6 6" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
        <p className="xs muted m-0">
          {reset ? "Not yours? Reset by email instead, and ask your institute to put your own number on your account." : "Not yours? Sign in with your own email and password, and ask your institute to put your own number on your account."}
        </p>
      </div>
    );

  return (
    <form className="col fade gap-[18px]" onSubmit={savePw} noValidate>
      {resetFor && (
        <span className="chip2">
          <span className="avatar" style={{ width: 24, height: 24, fontSize: 10 }} aria-hidden="true" data-initials={initialsOf(resetFor.label)} />
          Resetting for {resetFor.label}
        </span>
      )}
      <div className="col gap-2.5">
        <h1 className="h1">Choose a new password</h1>
        <p className="sm muted m-0">At least 8 characters. Your old password stops working right away.</p>
      </div>
      {offlineBox}
      <div className="field">
        <label className="label" htmlFor="np">
          New password
        </label>
        <PasswordField id="np" value={pw.a} onChange={(e) => setPw({ ...pw, a: e.target.value, err: "" })} autoComplete="new-password" aria-describedby={pw.err ? "np-err" : undefined} />
      </div>
      <div className="field">
        <label className="label" htmlFor="cp">
          Confirm password
        </label>
        <PasswordField id="cp" value={pw.b} onChange={(e) => setPw({ ...pw, b: e.target.value, err: "" })} autoComplete="new-password" aria-describedby={pw.err ? "np-err" : undefined} />
        {pw.err && (
          <ErrText id="np-err" icon>
            {pw.err}
          </ErrText>
        )}
      </div>
      <button type="submit" className="btn btn-primary btn-lg w-full" disabled={busy || offline}>
        {busy && <Spinner />}
        Save new password
      </button>
    </form>
  );
}
