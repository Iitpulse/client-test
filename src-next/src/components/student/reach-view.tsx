"use client";

// Student-ReachYou (batch 9): Profile › How we reach you. Phone verified / not verified, verify by code (wrong code,
// resend after 30 s), change the number, email or none, the parent's phone read-only (set by the institute), and what
// goes by SMS with the switches (codes always on). GET /users/me/reach, POST /users/me/phone/code + /verify,
// PATCH /users/student/me { preferences: { smsClasses, smsTests } } (api-users docs/sms-api.md §3).
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Doodle } from "@iitpulse/ui";
import { b9Keys, reachApi, useReach, useSmsSwitch } from "@/lib/b9-api";
import { StudentApiError } from "@/lib/student-api";
import { dayMonth } from "@/lib/time";
import { useAuthStore } from "@/stores/auth.store";
import { Spinner } from "@/components/shell/icons";
import { PhoneField } from "@/components/auth/form-bits";
import type { ReachResponse } from "@/types/b9";
import { Skel } from "./common";
import { ChevronLeftIcon } from "./icons";
import { istTime, PageError } from "./states";

type Toast = { kind: "ok"; msg: string } | { kind: "err"; msg: string; retry: () => void };

const hour = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  const ap = h! >= 12 ? "PM" : "AM";
  const h12 = h! % 12 || 12;
  return m ? `${h12}:${String(m).padStart(2, "0")} ${ap}` : `${h12} ${ap}`;
};

const ErrI = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true" focusable="false" className="flex-none">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7.5v5.5M12 16.5h.01" />
  </svg>
);

export function ReachView() {
  const router = useRouter();
  const q = useReach();
  const [toast, setToast] = useState<Toast | null>(null);
  const logout = useAuthStore((s) => s.logout);
  useEffect(() => {
    if (toast?.kind !== "ok") return;
    const id = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(id);
  }, [toast]);
  const r = q.data;

  return (
    <>
      <header className="sticky top-0 z-(--z-topbar) row box-content h-[60px] gap-1.5 border-b border-line bg-white/90 px-3 pt-[env(safe-area-inset-top)] backdrop-blur-md md:hidden">
        <button type="button" className="btn btn-ghost btn-icon size-11 flex-none" aria-label="Back" onClick={() => (window.history.length > 1 ? router.back() : router.push("/profile"))}>
          <ChevronLeftIcon />
        </button>
        <span className="h3 grow">How we reach you</span>
      </header>
      <div className="flex flex-wrap gap-7 md:pt-1 max-md:gap-3 max-md:px-4 max-md:pt-3.5 max-md:pb-6">
        <Doodle name="atom" slot="gl" style={{ top: 420 }} />
        <nav className="col sticky top-24 flex-[1_1_220px] gap-1 self-start max-md:hidden" style={{ maxWidth: 240 }} aria-label="Settings">
          <Link prefetch={false} href="/profile#details" className="navlink">
            Profile
          </Link>
          <Link prefetch={false} href="/profile/reach" className="navlink" aria-current="true">
            How we reach you
          </Link>
          <Link prefetch={false} href="/profile#prefs" className="navlink">
            Preferences
          </Link>
          <Link prefetch={false} href="/profile#password" className="navlink">
            Password
          </Link>
          <hr className="mx-3 my-2 h-px border-0 bg-line" />
          <button
            type="button"
            className="navlink"
            style={{ color: "var(--red-600)" }}
            onClick={() => {
              logout();
              window.location.replace("/login");
            }}
          >
            Sign out
          </button>
        </nav>
        <div className="col min-w-0 flex-[999_1_560px] gap-5 max-md:gap-3">
          <div className="col gap-1">
            <h1 className="h1 max-md:hidden">How we reach you</h1>
            <p className="sm muted m-0">Most messages come by SMS from {r?.senderId ?? "IITPLS"}. Email is the backup when an SMS can&apos;t be delivered.</p>
          </div>
          {!r ? (
            q.isError ? (
              <PageError what="how we reach you" error={q.error} onRetry={() => q.refetch()} safe="Your messages still arrive. Try again in a moment." />
            ) : (
              <div className="col gap-5" aria-busy="true" aria-label="Loading how we reach you">
                <Skel className="h-[260px] rounded-card" />
                <Skel className="h-[280px] rounded-card" />
              </div>
            )
          ) : (
            <>
              {r.phone && !r.phone.verified && (
                <div className="ry-bnr" role="status">
                  <ErrI />
                  <span>
                    <b>Your phone isn&apos;t verified yet.</b> Until it is, class and test messages go by email only, and you can&apos;t sign in with a phone code.
                  </span>
                </div>
              )}
              {r.sms.paused && (
                <div className="ry-bnr" role="status">
                  <ErrI />
                  <span>
                    <b>SMS is paused for your institute for now.</b> Class and test messages come by email and to the bell until it is back. Sign-in codes still come by SMS.
                  </span>
                </div>
              )}
              <section id="reach" className="card pad-lg col rise gap-0 max-md:px-4 max-md:py-1" aria-label="Your phone and email">
                <PhoneRow r={r} onVerified={() => setToast({ kind: "ok", msg: "Phone verified. Class and test messages now come by SMS." })} />
                <EmailRow r={r} />
                <div className="ry-row">
                  <span className="ry-ci grey" aria-hidden="true">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" focusable="false">
                      <circle cx="9" cy="8" r="3.5" />
                      <path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5a6 6 0 0 1 3.5 5.5" />
                    </svg>
                  </span>
                  <div className="col grow min-w-[240px] gap-1 max-md:min-w-0 max-md:basis-0">
                    <span className="sm font-semibold">Parent&apos;s phone</span>
                    {r.parentPhone ? <span className="body num">{r.parentPhone.display}</span> : <span className="body muted">No parent&apos;s phone</span>}
                    <span className="ry-ro">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" focusable="false">
                        <rect x="5" y="11" width="14" height="10" rx="2" />
                        <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                      </svg>
                      {r.parentPhone ? "Set by your institute. Your results go here by SMS. To change it, ask your institute." : "Your institute can add one. Your results then go there by SMS."}
                    </span>
                  </div>
                </div>
              </section>
              <Channels r={r} onToast={setToast} />
            </>
          )}
        </div>
      </div>
      {toast && (
        <div className={toast.kind === "ok" ? "pf-tst" : "pf-tst err"} role={toast.kind === "ok" ? "status" : "alert"}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={toast.kind === "ok" ? "#3DDC84" : "#FF9B9B"} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
            {toast.kind === "ok" ? <path d="m5 12 5 5L20 7" /> : <path d="M12 7.5v5.5M12 16.5h.01" />}
          </svg>
          <span className="msg">
            <b>{toast.msg}</b>
          </span>
          {toast.kind === "err" && (
            <button type="button" className="act" onClick={toast.retry}>
              Try again
            </button>
          )}
        </div>
      )}
    </>
  );
}

type CodeState = { to: string; resendAt: number; err: string | null } | null;

function PhoneRow({ r, onVerified }: { r: ReachResponse; onVerified: () => void }) {
  const client = useQueryClient();
  const p = r.phone;
  const [changing, setChanging] = useState(false);
  const [digits, setDigits] = useState("");
  const [numErr, setNumErr] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [open, setOpen] = useState<CodeState>(null);
  const [busy, setBusy] = useState(false);
  const [clock, setClock] = useState(() => Date.now());
  const [newNumber, setNewNumber] = useState<string | null>(null);
  const codeRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!open || open.resendAt <= clock) return;
    const t = setTimeout(() => setClock(Date.now()), 1000);
    return () => clearTimeout(t);
  }, [open, clock]);
  const cd = open ? Math.max(0, Math.ceil((open.resendAt - clock) / 1000)) : 0;

  const sendErr = (e: unknown): string => {
    const x = e instanceof StudentApiError ? e : null;
    if (x?.code === "INVALID_PHONE") return "Phone numbers have 10 digits";
    if (x?.code === "ALREADY_VERIFIED") return "This number is already verified.";
    if (x?.code === "NO_PHONE") return "Add a phone number first.";
    if (x?.code === "OTP_RATE_LIMITED" || x?.code === "OTP_LOCKED") {
      const until = typeof x.details?.until === "string" ? Date.parse(x.details.until) : Date.now() + (Number(x.details?.retryAfterSeconds) || 900) * 1000;
      return `Too many codes for this number. Ask for a new one after ${istTime(until)}.`;
    }
    if (x?.status === 0) return "You seem to be offline. Check your connection and try again.";
    return "Couldn't send the code right now. Try again.";
  };

  const send = async (phone?: string) => {
    setBusy(true);
    setNumErr(null);
    try {
      const res = await reachApi.sendCode(phone);
      const now = Date.now();
      setClock(now);
      setOpen({ to: res.sentTo, resendAt: now + (res.resendAfterSeconds ?? 30) * 1000, err: null });
      setNewNumber(phone ?? null);
      setChanging(false);
      setCode("");
      requestAnimationFrame(() => codeRef.current?.focus());
    } catch (e) {
      const x = e instanceof StudentApiError ? e : null;
      if (x?.code === "OTP_COOLDOWN") {
        const now = Date.now();
        setClock(now);
        setOpen({ to: phone ? `••••••${phone.slice(-4)}` : `••••••${p?.last4 ?? ""}`, resendAt: now + (Number(x.details?.retryAfterSeconds) || 30) * 1000, err: null });
        setChanging(false);
      } else if (open) setOpen({ ...open, err: sendErr(e) });
      else setNumErr(sendErr(e));
    } finally {
      setBusy(false);
    }
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!open || busy) return;
    if (!/^\d{6}$/.test(code)) return setOpen({ ...open, err: "Enter the 6-digit code from the SMS." });
    setBusy(true);
    try {
      const res = await reachApi.verify(code);
      client.setQueryData<ReachResponse>(b9Keys.reach, (d) => (d ? { ...d, phone: { ...res.phone, verifiedAt: new Date().toISOString() } } : d));
      client.invalidateQueries({ queryKey: b9Keys.reach });
      client.invalidateQueries({ queryKey: ["student", "me"] });
      setOpen(null);
      setNewNumber(null);
      onVerified();
    } catch (err) {
      const x = err instanceof StudentApiError ? err : null;
      const msg =
        x?.code === "OTP_WRONG"
          ? `That code isn't right.${typeof x.details?.triesLeft === "number" ? ` ${x.details.triesLeft} ${x.details.triesLeft === 1 ? "try" : "tries"} left.` : ""}`
          : x?.code === "OTP_EXPIRED"
            ? "That code has expired. Ask for a new one."
            : x?.code === "OTP_LOCKED"
              ? "Too many wrong codes. Ask for a new one in 15 minutes."
              : x?.status === 0
                ? "You seem to be offline. Check your connection and try again."
                : "Couldn't check the code right now. Try again.";
      setOpen({ ...open, err: msg });
      codeRef.current?.select();
    } finally {
      setBusy(false);
    }
  };

  const verified = !!p?.verified;
  const hint = !p ? "Add one so class and test messages come by SMS." : verified ? `${p.verifiedAt ? `Verified ${dayMonth(p.verifiedAt)}. ` : ""}Used for sign-in codes and for class and test messages.` : "We text a 6-digit code to check this number is yours.";
  const wrong = !!open?.err;

  return (
    <div className="ry-row">
      <span className="ry-ci" aria-hidden="true">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" focusable="false">
          <rect x="6" y="2" width="12" height="20" rx="2" />
          <path d="M11 18h2" />
        </svg>
      </span>
      <div className="col grow min-w-[240px] gap-1 max-md:min-w-0 max-md:basis-0">
        <div className="row wrap gap-2">
          <span className="sm font-semibold">Your phone</span>
          {p &&
            (verified ? (
              <span className="badge b-green">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
                  <path d="m5 12 5 5L20 7" />
                </svg>
                Verified
              </span>
            ) : (
              <span className="badge b-amber">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true" focusable="false">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 8v4M12 16h.01" />
                </svg>
                Not verified
              </span>
            ))}
        </div>
        {p ? <span className="body num">{p.display}</span> : <span className="body muted">No phone</span>}
        <span className="xs muted">{hint}</span>

        {changing && !open && (
          <form
            className="col mt-2 gap-2"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              if (digits.length !== 10 || !/^[6-9]/.test(digits)) return setNumErr("Phone numbers have 10 digits");
              void send(digits);
            }}
          >
            <label className="label" htmlFor="ry-new">
              {p ? "New phone number" : "Phone number"}
            </label>
            <div className="row wrap gap-2.5">
              <div className="w-[240px] max-md:w-full">
                <PhoneField
                  id="ry-new"
                  value={digits}
                  onChange={(d) => {
                    setDigits(d);
                    setNumErr(null);
                  }}
                  invalid={!!numErr}
                  describedBy="ry-new-h"
                />
              </div>
              <button type="submit" className="btn btn-primary max-md:h-11 max-md:flex-1" disabled={busy}>
                {busy && <Spinner size={16} />}
                Send code
              </button>
              <button type="button" className="btn btn-ghost max-md:h-11" onClick={() => setChanging(false)}>
                Cancel
              </button>
            </div>
            {numErr ? (
              <span className="ry-err" id="ry-new-h" role="alert">
                <ErrI />
                {numErr}
              </span>
            ) : (
              <span className="xs muted" id="ry-new-h">
                We text a code to the new number. It replaces the old one once you enter it.
              </span>
            )}
          </form>
        )}
        {!changing && numErr && !open && (
          <span className="ry-err" role="alert">
            <ErrI />
            {numErr}
          </span>
        )}

        {open && (
          <form className="col mt-2 gap-2" onSubmit={verify} noValidate>
            <label className="label" htmlFor="vc">
              Code sent by SMS to {open.to}
            </label>
            <div className="row wrap gap-2.5">
              <input
                ref={codeRef}
                id="vc"
                className={wrong ? "input otp-in sm e" : "input otp-in sm"}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.replace(/\D/g, "").slice(0, 6));
                  if (open.err) setOpen({ ...open, err: null });
                }}
                aria-invalid={wrong || undefined}
                aria-describedby="vc-h"
              />
              <button type="submit" className="btn btn-primary max-md:h-11 max-md:flex-1" disabled={busy}>
                {busy && <Spinner size={16} />}
                Verify
              </button>
              <button
                type="button"
                className="btn btn-ghost max-md:h-11"
                onClick={() => {
                  setOpen(null);
                  setNewNumber(null);
                }}
              >
                Cancel
              </button>
            </div>
            {open.err ? (
              <span className="ry-err" id="vc-h" role="alert">
                {open.err}
              </span>
            ) : (
              <span className="xs muted" id="vc-h">
                Expires in 10 minutes.{" "}
                {cd > 0 ? (
                  <>
                    Didn&apos;t get it? Resend in <span className="num font-semibold">0:{String(cd).padStart(2, "0")}</span>
                  </>
                ) : (
                  <>
                    Didn&apos;t get it?{" "}
                    <button type="button" className="au-inl" style={{ color: "var(--navy)", minHeight: 0, display: "inline" }} onClick={() => send(newNumber ?? undefined)} disabled={busy}>
                      Resend code
                    </button>
                  </>
                )}
              </span>
            )}
          </form>
        )}
      </div>
      {!open && !changing && (
        <div className="row gap-2 max-md:w-full">
          {p && !verified && (
            <button type="button" className="btn btn-primary max-md:h-11 max-md:flex-1" onClick={() => send()} disabled={busy}>
              {busy && <Spinner size={16} />}
              Verify by code
            </button>
          )}
          <button
            type="button"
            className={p ? "btn btn-secondary max-md:h-11 max-md:flex-1" : "btn btn-primary max-md:h-11 max-md:flex-1"}
            onClick={() => {
              setDigits("");
              setNumErr(null);
              setChanging(true);
            }}
          >
            {p ? "Change number" : "Add phone"}
          </button>
        </div>
      )}
    </div>
  );
}

function EmailRow({ r }: { r: ReachResponse }) {
  // No student route changes the email (backend gap): the button says who can.
  const [asked, setAsked] = useState(false);
  const e = r.email;
  return (
    <div className="ry-row">
      <span className="ry-ci" aria-hidden="true">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" focusable="false">
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="m3 7 9 6 9-6" />
        </svg>
      </span>
      <div className="col grow min-w-[240px] gap-1 max-md:min-w-0 max-md:basis-0">
        <span className="sm font-semibold">Email</span>
        {e ? (
          <>
            <span className="body break-all">{e.address}</span>
            <span className="xs muted">Backup for every message, and where result emails and AI review notices go.</span>
          </>
        ) : (
          <>
            <span className="body muted">No email</span>
            <span className="xs muted">Add one so messages still reach you if an SMS fails.</span>
          </>
        )}
        {asked && (
          <span className="xs" role="status" style={{ color: "#2B2F4A" }}>
            Your institute keeps your email on your account. Ask them to {e ? "change" : "add"} it.
          </span>
        )}
      </div>
      <button type="button" className={e ? "btn btn-secondary max-md:h-11 max-md:w-full" : "btn btn-primary max-md:h-11 max-md:w-full"} aria-expanded={asked} onClick={() => setAsked(true)}>
        {e ? "Change email" : "Add email"}
      </button>
    </div>
  );
}

function Channels({ r, onToast }: { r: ReachResponse; onToast: (t: Toast | null) => void }) {
  const m = useSmsSwitch((ok, retry) => onToast(ok ? { kind: "ok", msg: "Setting saved" } : { kind: "err", msg: "Couldn't save that setting.", retry }));
  const sw = (on: boolean, label: string, flip: () => void) => (
    <button type="button" className="swhit" role="switch" aria-checked={on} aria-label={label} onClick={flip}>
      <span className={on ? "sw on" : "sw off"} aria-hidden="true" />
    </button>
  );
  const via = (sms: boolean) => (
    <span className="ry-via">
      {sms && <span className="badge b-navy">SMS</span>}
      <span className="badge b-grey">bell</span>
      <span className="badge b-grey">{sms ? "email backup" : "email"}</span>
    </span>
  );
  return (
    <section className="card pad-lg col rise gap-1 max-md:px-4 max-md:py-3" style={{ "--i": 1 } as React.CSSProperties} aria-labelledby="ry-what">
      <div className="row between wrap mb-1 gap-2">
        <h2 id="ry-what" className="h3 m-0">
          What we send, and how
        </h2>
        <span className="xs muted">
          No SMS from {hour(r.quietHours.from)} to {hour(r.quietHours.to)} except sign-in codes
        </span>
      </div>
      <div className="ry-chan xs muted pt-1 font-semibold max-md:hidden" aria-hidden="true">
        <span>Message</span>
        <span>Sent by</span>
        <span>SMS</span>
      </div>
      <div className="ry-chan">
        <span className="col gap-px">
          <span className="font-semibold">Sign-in and reset codes</span>
          <span className="xs muted">Always on, so you can get into your account</span>
        </span>
        <span className="ry-via">
          <span className="badge b-navy">SMS</span>
          <span className="badge b-grey">email if SMS fails</span>
        </span>
        <span className="swhit" style={{ cursor: "not-allowed" }}>
          <span className="sw lock" role="switch" aria-checked="true" aria-disabled="true" aria-label="SMS for sign-in codes, always on" />
        </span>
      </div>
      <div className="ry-chan">
        <span className="col gap-px">
          <span className="font-semibold">Classes</span>
          <span className="xs muted">Added, moved, cancelled, 1 hour before</span>
        </span>
        {via(r.sms.classes)}
        {sw(r.sms.classes, "SMS about classes", () => m.mutate({ smsClasses: !r.sms.classes }))}
      </div>
      <div className="ry-chan">
        <span className="col gap-px">
          <span className="font-semibold">Tests</span>
          <span className="xs muted">New test for you, opens soon</span>
        </span>
        {via(r.sms.tests)}
        {sw(r.sms.tests, "SMS about tests", () => m.mutate({ smsTests: !r.sms.tests }))}
      </div>
      <div className="ry-chan">
        <span className="col gap-px">
          <span className="font-semibold">Results, AI review, practice</span>
          <span className="xs muted">
            Email switches are under{" "}
            <Link prefetch={false} href="/profile#prefs">
              Preferences
            </Link>
          </span>
        </span>
        <span className="ry-via">
          <span className="badge b-grey">bell</span>
          <span className="badge b-grey">email</span>
        </span>
        <span className="xs muted">No SMS</span>
      </div>
      <span className="xs muted pt-2">If SMS is off for a message, it still comes to the bell and by email.</span>
    </section>
  );
}
