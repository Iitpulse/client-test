"use client";

// Student-Signup board (desktop and phone), views email, email-taken, otp, otp-wrong, otp-expired, account,
// promo-invalid, promo-short, details. Desktop: the welcome blueboard on the left, the taped card on the right;
// phone: the card alone on the paper. Calls (api-users, M6 "Public sign-up"): POST /users/otp/email/send,
// POST /users/otp/email/verify, GET /users/public/promo/:code, POST /users/student/create-student (answers a token:
// the student is signed in and lands on Home, where "Complete your profile" opens).
import { legalApi, type LegalVersions } from "@/lib/legal-api";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Blueboard, LogoMark } from "@iitpulse/ui";
import { Spinner } from "@/components/shell/icons";
import { Picker } from "@/components/onboarding/picker";
import { useAuthStore } from "@/stores/auth.store";
import { authApi, apiError, safeNext } from "@/lib/auth-api";
import { cn } from "@/lib/utils";
import { MIN_PASSWORD_LENGTH, type PromoCheckResponse } from "@/types/m6-auth";
import { CheckMark, ErrText, OkText, OtpBoxes, PasswordMeter, PhoneField, ShowPasswordField, Steps } from "./form-bits";

type Step = "email" | "otp" | "account" | "details";
type PromoState = { s: "idle" } | { s: "checking" } | { s: "ok"; data: PromoCheckResponse } | { s: "invalid" } | { s: "short" } | { s: "error"; message: string };
type Errors = Partial<Record<"email" | "otp" | "promo" | "password" | "confirm" | "name" | "phone" | "dob" | "terms" | "form", string>>;

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const OFFLINE = "You're offline. Connect to the internet and try again.";

const cleanPromo = (v: string) => v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);

/** "2010-06-05" from the three birthday fields, or null when they don't make a real past date. */
function dobIso(d: string, m: string | null, y: string): string | null {
  const day = Number(d);
  const month = m ? MONTHS.indexOf(m) + 1 : 0;
  const year = Number(y);
  if (!day || !month || !/^\d{4}$/.test(y)) return null;
  const dt = new Date(Date.UTC(year, month - 1, day));
  if (dt.getUTCFullYear() !== year || dt.getUTCMonth() !== month - 1 || dt.getUTCDate() !== day) return null;
  const thisYear = new Date().getFullYear();
  if (year < thisYear - 60 || year > thisYear - 5) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function useCountdown() {
  const [left, setLeft] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  useEffect(() => () => clearInterval(timer.current), []);
  const start = (seconds: number) => {
    clearInterval(timer.current);
    const until = Date.now() + seconds * 1000;
    setLeft(seconds);
    timer.current = setInterval(() => {
      const n = Math.max(0, Math.ceil((until - Date.now()) / 1000));
      setLeft(n);
      if (n <= 0) clearInterval(timer.current);
    }, 1000);
  };
  return { left, start };
}

export function SignupFlow() {
  const router = useRouter();
  const params = useSearchParams();
  const { login, checkAuth } = useAuthStore();
  const next = safeNext(params.get("next"));

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [taken, setTaken] = useState(false);
  const [code, setCode] = useState("");
  const [codeErr, setCodeErr] = useState<{ kind: "wrong"; triesLeft: number | null } | { kind: "expired" } | null>(null);
  const [verified, setVerified] = useState<{ email: string; code: string } | null>(null);
  const [promo, setPromo] = useState(() => cleanPromo(params.get("promo") ?? ""));
  const [promoState, setPromoState] = useState<PromoState>({ s: "idle" });
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState<{ d: string; m: string | null; y: string }>({ d: "", m: null, y: "" });
  const [terms, setTerms] = useState(false);
  // The versions the terms checkbox stands for, sent with the sign-up (owner, 6 Nov): read once, best effort
  const [legal, setLegal] = useState<LegalVersions | null>(null);
  useEffect(() => {
    const ctl = new AbortController();
    legalApi.current(ctl.signal).then(setLegal).catch(() => {});
    return () => ctl.abort();
  }, []);
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const resend = useCountdown();
  const promoSeq = useRef(0);
  const headingEl = useRef<HTMLElement | null>(null);
  const heading = (el: HTMLElement | null) => {
    headingEl.current = el;
  };
  const firstStep = useRef(true);

  useEffect(() => {
    if (checkAuth()) router.replace(next);
  }, [checkAuth, router, next]);

  // Each step moves focus to its heading, so a screen reader hears where it is.
  useEffect(() => {
    if (firstStep.current) {
      firstStep.current = false;
      return;
    }
    headingEl.current?.focus({ preventScroll: true });
  }, [step]);

  const err = (k: keyof Errors, v?: string) => setErrors((e) => ({ ...e, [k]: v }));
  const go = (s: Step) => {
    setErrors({});
    setStep(s);
    // a full code (from ?promo= or typed before going back) is checked as the step opens
    if (s === "account" && promo.length === 6 && promoState.s === "idle") void checkPromo(promo);
  };

  /* ---------- 1. email → code ---------- */
  const sendCode = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const address = email.trim().toLowerCase();
    setTaken(false);
    if (!EMAIL_RE.test(address)) return err("email", "Enter the full email address, like name@example.com.");
    setBusy(true);
    setErrors({});
    try {
      await authApi.signup.sendCode(address);
      setEmail(address);
      setCode("");
      setCodeErr(null);
      resend.start(60);
      go("otp");
    } catch (ex) {
      const { status, code: c, details, message } = apiError(ex);
      if (c === "EMAIL_TAKEN") setTaken(true);
      else if (c === "OTP_COOLDOWN") {
        // a code was sent less than a minute ago: it still works
        resend.start(Number(details?.retryAfterSeconds) || 60);
        go("otp");
      } else err("email", status === 0 ? OFFLINE : message || "Couldn't send the code. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const verify = async (value = code) => {
    if (busy) return;
    if (!/^\d{6}$/.test(value)) return err("otp", "Type all 6 digits.");
    if (verified && verified.email === email && verified.code === value) return go("account");
    setBusy(true);
    setCodeErr(null);
    err("otp");
    try {
      await authApi.signup.verifyCode(email, value);
      setVerified({ email, code: value });
      go("account");
    } catch (ex) {
      const { status, code: c, details, message } = apiError(ex);
      if (c === "OTP_EXPIRED") setCodeErr({ kind: "expired" });
      else if (c === "OTP_WRONG") setCodeErr({ kind: "wrong", triesLeft: typeof details?.triesLeft === "number" ? details.triesLeft : null });
      else err("otp", status === 0 ? OFFLINE : message || "Couldn't check the code. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const sendAgain = async () => {
    if (busy || resend.left > 0) return;
    setBusy(true);
    try {
      await authApi.signup.sendCode(email);
      setCode("");
      setCodeErr(null);
      err("otp");
      resend.start(60);
    } catch (ex) {
      const { status, code: c, details, message } = apiError(ex);
      if (c === "OTP_COOLDOWN") resend.start(Number(details?.retryAfterSeconds) || 60);
      else err("otp", status === 0 ? OFFLINE : message || "Couldn't send the code. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  /* ---------- 2. promo + password ---------- */
  const checkPromo = async (value: string): Promise<PromoState> => {
    if (value.length !== 6) {
      const st: PromoState = value ? { s: "short" } : { s: "idle" };
      setPromoState(st);
      return st;
    }
    const seq = ++promoSeq.current;
    setPromoState({ s: "checking" });
    let st: PromoState;
    try {
      const res = await authApi.signup.promo(value);
      st = { s: "ok", data: res.data.data };
    } catch (ex) {
      const { status, code: c, message } = apiError(ex);
      st = c === "PROMO_INVALID" ? { s: "invalid" } : c === "PROMO_LENGTH" ? { s: "short" } : { s: "error", message: status === 0 ? OFFLINE : message || "Couldn't check the code. Please try again." };
    }
    if (seq === promoSeq.current) setPromoState(st);
    return st;
  };

  const pwError = (p: string) => (p.length < MIN_PASSWORD_LENGTH ? `Use at least ${MIN_PASSWORD_LENGTH} characters.` : undefined);
  const confirmError = (c: string, p = password) => (c !== p ? "The two passwords don't match." : undefined);

  const toDetails = async () => {
    const e: Errors = { password: pwError(password), confirm: confirmError(confirm) };
    setErrors(e);
    let st = promoState;
    if (st.s !== "ok") st = await checkPromo(promo);
    if (st.s !== "ok" && promo.length === 0) setPromoState({ s: "short" });
    if (st.s !== "ok" || e.password || e.confirm) return;
    go("details");
  };

  /* ---------- 3. about you → account ---------- */
  const create = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const iso = dobIso(dob.d, dob.m, dob.y);
    const e: Errors = {
      name: name.trim().length < 2 ? "Enter your full name" : undefined,
      phone: phone.length !== 10 ? "Phone numbers have 10 digits" : undefined,
      dob: iso ? undefined : "Enter your date of birth",
      terms: terms ? undefined : "Accept the terms to continue",
    };
    setErrors(e);
    if (Object.values(e).some(Boolean) || !iso || promoState.s !== "ok") return;
    setBusy(true);
    try {
      const res = await authApi.signup.create({
        email,
        password,
        confirmPassword: confirm,
        name: name.trim(),
        contact: phone,
        dob: iso,
        promoCode: promo,
        acceptedTerms: true,
        ...(legal ? { legal } : {}),
      });
      const data = res.data.data;
      login(data.token, data.user?.name ?? name.trim());
      router.replace(next);
    } catch (ex) {
      setBusy(false);
      const { status, code: c, details, message } = apiError(ex);
      const fields = (details?.fields ?? {}) as Record<string, { message?: string } | string>;
      const msg = (k: string) => (typeof fields[k] === "string" ? (fields[k] as string) : (fields[k] as { message?: string } | undefined)?.message);
      if (c === "EMAIL_TAKEN") {
        setTaken(true);
        return go("email");
      }
      if (c === "PROMO_INVALID" || c === "PROMO_LENGTH") {
        setPromoState(c === "PROMO_INVALID" ? { s: "invalid" } : { s: "short" });
        return go("account");
      }
      if (c === "WEAK_PASSWORD" || msg("confirmPassword")) {
        go("account");
        return setErrors({ password: c === "WEAK_PASSWORD" ? pwError("") : undefined, confirm: msg("confirmPassword") ? "The two passwords don't match." : undefined });
      }
      if (c === "PHONE_TAKEN") return err("phone", "This phone already has an account");
      if (msg("contact") || msg("acceptedTerms")) return setErrors({ phone: msg("contact") ? "Phone numbers have 10 digits" : undefined, terms: msg("acceptedTerms") ? "Accept the terms to continue" : undefined });
      // the email check ran out (30 minutes): send a new code
      if (status === 400 && /verify/i.test(message ?? "")) {
        setVerified(null);
        go("email");
        return err("email", message);
      }
      err("form", status === 0 ? OFFLINE : message || "Couldn't create your account. Please try again.");
    }
  };

  const stepNo = step === "account" ? 2 : step === "details" ? 3 : 1;
  const promoBad = promoState.s === "invalid" || promoState.s === "short" || promoState.s === "error";

  return (
    <div className="su-page">
      <Blueboard as="section" className="su-board auth-board" smudge={{ left: -90, top: 300, width: 560, height: 200 }}>
        <div className="row gap-3">
          <span className="inline-flex rounded-[10px] bg-white px-3.5 py-2.5">
            <LogoMark size="lg" />
          </span>
        </div>
        <div className="col max-w-[460px] gap-[18px]">
          <span className="cl-note chalk" style={{ "--rot": "-3deg", fontSize: 40, lineHeight: 1.1 } as CSSProperties}>
            Welcome to class.
          </span>
          <p className="d1 m-0 text-white">Your institute&apos;s tests, results and study plan in one place.</p>
          <p className="body m-0 text-on-brand-2">Sign up with the 6-character promo code your institute gave you. It puts you straight into your batch.</p>
        </div>
        <span className="xs text-on-brand-2">
          Already have an account?{" "}
          <Link href={next === "/" ? "/login" : `/login?next=${encodeURIComponent(next)}`} className="font-semibold text-white hover:text-white">
            Sign in
          </Link>
        </span>
      </Blueboard>

      <section className="su-main">
        <div className="card pad-lg col su-card">
          <span className="cl-tape" aria-hidden="true" style={{ "--rot": "-2deg" } as CSSProperties} />
          <Steps labels={["Email", "Account", "About you"]} current={stepNo} label="Sign-up steps" />

          {step === "email" && (
            <form className="col fade" style={{ gap: 18 }} onSubmit={sendCode} noValidate>
              <div className="col" style={{ gap: 6 }}>
                <h1 ref={heading} tabIndex={-1} className="h1 outline-none">
                  Create your account
                </h1>
                <p className="sm muted m-0">We&apos;ll send a 6-digit code to check it&apos;s your email.</p>
              </div>
              <div className="field">
                <label className="label" htmlFor="su-email">
                  Email
                </label>
                <input
                  id="su-email"
                  className={cn("input", (taken || errors.email) && "e")}
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  spellCheck={false}
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setTaken(false);
                    err("email");
                  }}
                  aria-invalid={taken || !!errors.email || undefined}
                  aria-describedby={taken || errors.email ? "su-email-e" : undefined}
                />
                {taken ? (
                  <span id="su-email-e" className="au-err" role="alert">
                    <span>
                      This email already has an account.{" "}
                      <Link href={`/login?email=${encodeURIComponent(email.trim())}${next !== "/" ? `&next=${encodeURIComponent(next)}` : ""}`}>Sign in</Link>
                    </span>
                  </span>
                ) : (
                  errors.email && <ErrText id="su-email-e">{errors.email}</ErrText>
                )}
              </div>
              <button type="submit" className="btn btn-primary btn-lg w-full" disabled={busy}>
                {busy && <Spinner size={16} />}
                Send code
              </button>
            </form>
          )}

          {step === "otp" && (
            <form
              className="col fade"
              style={{ gap: 18 }}
              onSubmit={(e) => {
                e.preventDefault();
                void verify();
              }}
              noValidate
            >
              <div className="col" style={{ gap: 6 }}>
                <h1 ref={heading} tabIndex={-1} className="h1 outline-none">
                  Check your email
                </h1>
                <p className="sm muted m-0" style={{ overflowWrap: "anywhere" }}>
                  We sent a code to <b>{email}</b>.{" "}
                  <button type="button" className="au-inl" style={{ color: "var(--navy)", textDecoration: "none", minHeight: 0, display: "inline" }} onClick={() => go("email")}>
                    Change
                  </button>
                </p>
              </div>
              <div className="field">
                <span className="label" id="su-otp-l">
                  6-digit code
                </span>
                <OtpBoxes
                  value={code}
                  onChange={(v) => {
                    setCode(v);
                    if (codeErr?.kind === "wrong") setCodeErr(null);
                    err("otp");
                  }}
                  onComplete={(v) => void verify(v)}
                  invalid={!!codeErr}
                  describedBy="su-otp-l su-otp-e su-otp-h"
                />
                <span id="su-otp-e">
                  {codeErr?.kind === "wrong" && (
                    <ErrText>
                      That code isn&apos;t right.
                      {codeErr.triesLeft !== null && ` ${codeErr.triesLeft} ${codeErr.triesLeft === 1 ? "try" : "tries"} left.`}
                    </ErrText>
                  )}
                  {codeErr?.kind === "expired" && <ErrText>That code has expired. Codes work for 10 minutes.</ErrText>}
                  {errors.otp && <ErrText>{errors.otp}</ErrText>}
                </span>
                <span id="su-otp-h" className="hint">
                  Didn&apos;t get it? Look in spam, or{" "}
                  {resend.left > 0 && codeErr?.kind !== "expired" ? (
                    <span className="font-semibold text-ink-2 tabular-nums">send again in {`${Math.floor(resend.left / 60)}:${String(resend.left % 60).padStart(2, "0")}`}</span>
                  ) : (
                    <button type="button" className="au-inl" style={{ color: "var(--navy)", textDecoration: "none", minHeight: 0, display: "inline" }} onClick={sendAgain} disabled={busy || resend.left > 0}>
                      {codeErr?.kind === "expired" || codeErr?.triesLeft === 0 ? "send a new code" : "send again"}
                    </button>
                  )}
                </span>
              </div>
              <button type="submit" className="btn btn-primary btn-lg w-full" disabled={busy}>
                {busy && <Spinner size={16} />}
                Check code
              </button>
            </form>
          )}

          {step === "account" && (
            <form
              className="col fade"
              style={{ gap: 16 }}
              onSubmit={(e) => {
                e.preventDefault();
                void toDetails();
              }}
              noValidate
            >
              <div className="au-msg ok" role="status">
                <CheckMark />
                <span ref={heading} tabIndex={-1} className="outline-none">
                  Email checked: {email}
                </span>
              </div>
              <div className="field">
                <label className="label" htmlFor="su-promo">
                  Promo code from your institute
                </label>
                <input
                  id="su-promo"
                  className={cn("input au-promo", promoBad && "e")}
                  value={promo}
                  maxLength={6}
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  onChange={(e) => {
                    const v = cleanPromo(e.target.value);
                    setPromo(v);
                    if (v.length === 6) void checkPromo(v);
                    else {
                      promoSeq.current++;
                      setPromoState((s) => (s.s === "short" && v.length > 0 ? s : { s: "idle" }));
                    }
                  }}
                  onBlur={() => promo.length > 0 && promo.length < 6 && setPromoState({ s: "short" })}
                  aria-invalid={promoBad || undefined}
                  aria-describedby="su-promo-s su-promo-h"
                />
                <span id="su-promo-s">
                  {promoState.s === "ok" && (
                    <OkText>
                      {promoState.data.batch.name} at {promoState.data.institute.name}
                    </OkText>
                  )}
                  {promoState.s === "checking" && (
                    <span className="hint row" style={{ gap: 6 }}>
                      <Spinner size={14} />
                    </span>
                  )}
                  {promoState.s === "invalid" && <ErrText>We don&apos;t know this code. Check it with your institute.</ErrText>}
                  {promoState.s === "short" && <ErrText>Promo codes have 6 characters</ErrText>}
                  {promoState.s === "error" && <ErrText>{promoState.message}</ErrText>}
                </span>
                <span id="su-promo-h" className="hint">
                  6 letters or digits, like JEE7KQ.
                </span>
              </div>
              <div className="field">
                <label className="label" htmlFor="su-pw">
                  Password
                </label>
                <ShowPasswordField
                  id="su-pw"
                  value={password}
                  onChange={(v) => {
                    setPassword(v);
                    if (errors.password && !pwError(v)) err("password");
                  }}
                  onBlur={() => password && err("password", pwError(password))}
                  invalid={!!errors.password}
                  describedBy="su-pw-h"
                />
                <PasswordMeter password={password} />
                {errors.password ? (
                  <ErrText id="su-pw-h">{errors.password}</ErrText>
                ) : (
                  <span id="su-pw-h" className="hint">
                    At least {MIN_PASSWORD_LENGTH} characters.
                  </span>
                )}
              </div>
              <div className="field">
                <label className="label" htmlFor="su-pw2">
                  Confirm password
                </label>
                <input
                  id="su-pw2"
                  className={cn("input", errors.confirm && "e")}
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  maxLength={128}
                  onChange={(e) => {
                    setConfirm(e.target.value);
                    if (errors.confirm && !confirmError(e.target.value)) err("confirm");
                  }}
                  onBlur={() => confirm && err("confirm", confirmError(confirm))}
                  aria-invalid={!!errors.confirm || undefined}
                  aria-describedby={errors.confirm ? "su-pw2-e" : undefined}
                />
                {errors.confirm && <ErrText id="su-pw2-e">{errors.confirm}</ErrText>}
              </div>
              <div className="row" style={{ gap: 8 }}>
                <button type="button" className="btn btn-ghost btn-lg" onClick={() => go("otp")}>
                  Back
                </button>
                <button type="submit" className="btn btn-primary btn-lg" style={{ flex: 1 }} disabled={promoState.s === "checking"}>
                  Continue
                </button>
              </div>
            </form>
          )}

          {step === "details" && (
            <form className="col fade" style={{ gap: 16 }} onSubmit={create} noValidate>
              <div className="col" style={{ gap: 6 }}>
                <h1 ref={heading} tabIndex={-1} className="h1 outline-none">
                  About you
                </h1>
                <p className="sm muted m-0">Your institute sees these on your profile.</p>
              </div>
              <div className="field">
                <label className="label" htmlFor="su-name">
                  Full name
                </label>
                <input
                  id="su-name"
                  className={cn("input", errors.name && "e")}
                  value={name}
                  autoComplete="name"
                  maxLength={120}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (errors.name) err("name");
                  }}
                  aria-invalid={!!errors.name || undefined}
                  aria-describedby={errors.name ? "su-name-e" : undefined}
                />
                {errors.name && <ErrText id="su-name-e">{errors.name}</ErrText>}
              </div>
              <div className="field">
                <label className="label" htmlFor="su-phone">
                  Phone
                </label>
                <PhoneField
                  id="su-phone"
                  value={phone}
                  onChange={(d) => {
                    setPhone(d);
                    if (errors.phone && d.length === 10) err("phone");
                  }}
                  onBlur={() => phone && phone.length !== 10 && err("phone", "Phone numbers have 10 digits")}
                  invalid={!!errors.phone}
                  describedBy={errors.phone ? "su-phone-e" : undefined}
                />
                {errors.phone && <ErrText id="su-phone-e">{errors.phone}</ErrText>}
              </div>
              <fieldset className="m-0 flex flex-col gap-1.5 border-0 p-0" aria-describedby={errors.dob ? "su-dob-e" : undefined}>
                <legend className="label mb-1.5 p-0">Date of birth</legend>
                <div className="au-dob">
                  <input
                    className={cn("input num", errors.dob && "e")}
                    aria-label="Day"
                    inputMode="numeric"
                    autoComplete="bday-day"
                    placeholder="DD"
                    maxLength={2}
                    value={dob.d}
                    onChange={(e) => {
                      setDob((s) => ({ ...s, d: e.target.value.replace(/\D/g, "").slice(0, 2) }));
                      err("dob");
                    }}
                  />
                  <Picker
                    id="su-dob-m"
                    label="Month"
                    ariaLabel="Month"
                    value={dob.m}
                    options={MONTHS}
                    placeholder="Month"
                    invalid={!!errors.dob}
                    onChange={(m) => {
                      setDob((s) => ({ ...s, m }));
                      err("dob");
                    }}
                  />
                  <input
                    className={cn("input num", errors.dob && "e")}
                    aria-label="Year"
                    inputMode="numeric"
                    autoComplete="bday-year"
                    placeholder="YYYY"
                    maxLength={4}
                    value={dob.y}
                    onChange={(e) => {
                      setDob((s) => ({ ...s, y: e.target.value.replace(/\D/g, "").slice(0, 4) }));
                      err("dob");
                    }}
                  />
                </div>
                {errors.dob && <ErrText id="su-dob-e">{errors.dob}</ErrText>}
              </fieldset>
              <div className="col" style={{ gap: 6 }}>
                <label className="row sm" style={{ gap: 10, alignItems: "flex-start", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={terms}
                    onChange={(e) => {
                      setTerms(e.target.checked);
                      if (e.target.checked) err("terms");
                    }}
                    style={{ width: 18, height: 18, accentColor: "var(--navy)", margin: "1px 0 0", flex: "none" }}
                    aria-invalid={!!errors.terms || undefined}
                    aria-describedby={errors.terms ? "su-terms-e" : undefined}
                  />
                  <span>
                    I have read and agree to the{" "}
                    <a href="/terms" target="_blank" rel="noopener">
                      Terms of Use
                    </a>{" "}
                    and the{" "}
                    <a href="/privacy" target="_blank" rel="noopener">
                      Privacy Policy
                    </a>
                    .
                  </span>
                </label>
                {errors.terms && <ErrText id="su-terms-e">{errors.terms}</ErrText>}
              </div>
              {errors.form && <ErrText icon>{errors.form}</ErrText>}
              <div className="row" style={{ gap: 8 }}>
                <button type="button" className="btn btn-ghost btn-lg" onClick={() => go("account")} disabled={busy}>
                  Back
                </button>
                <button type="submit" className="btn btn-primary btn-lg" style={{ flex: 1 }} disabled={busy}>
                  {busy && <Spinner size={16} />}
                  Create account
                </button>
              </div>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}
