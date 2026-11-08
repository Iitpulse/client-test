"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { InkUnderline } from "@iitpulse/ui";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordField } from "@/components/auth/password-field";
import { Notice } from "@/components/auth/notice";
import { Spinner } from "@/components/shell/icons";
import { RESET_EMAIL_KEY, passwordStrength } from "@/components/auth/reset-email";
import { authApi, apiError } from "@/lib/auth-api";
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from "@/types/m6-auth";

// Student-Login board, reset state: /reset-password?token=... from the email (new in the student app).
// verify checks the link without using it up; reset sets the password and uses the link up (it works once).
const MIN_LENGTH = MIN_PASSWORD_LENGTH; // owner: 8 everywhere; the API answers 400 WEAK_PASSWORD below it
const MAX_LENGTH = MAX_PASSWORD_LENGTH;
const SEGMENT_COLOR = ["", "var(--red-600)", "var(--amber)", "var(--green)", "var(--green)"];

/** Student-Login reset-link-invalid / -expired / -used (400 RESET_TOKEN_INVALID { reason }) */
const LINK_COPY = {
  invalid: { title: "This reset link doesn't work", text: "Part of the link may be missing. Ask for a new one." },
  expired: { title: "This reset link has expired", text: "Reset links last 30 minutes. Ask for a new one." },
  used: { title: "This reset link was already used", text: "Each link works once. If you changed your password, sign in with it. If not, ask for a new link." },
} as const;
const reasonOf = (details?: Record<string, unknown>): keyof typeof LINK_COPY =>
  details?.reason === "expired" ? "expired" : details?.reason === "used" ? "used" : "invalid";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<Checking />}>
      <ResetPasswordForm />
    </Suspense>
  );
}

function Checking() {
  return (
    <div className="col fade items-center gap-3 py-10 text-brand" role="status">
      <Spinner size={28} />
      <span className="sm muted">Checking your reset link…</span>
    </div>
  );
}

function ResetPasswordForm() {
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";
  const [state, setState] = useState<"checking" | "ready" | "invalid" | "expired" | "used" | "offline">(token ? "checking" : "invalid");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token) return;
    let live = true;
    authApi.passwordReset
      .verify(token)
      .then((res) => {
        if (!live) return;
        try {
          if (res.data?.data?.email) sessionStorage.setItem(RESET_EMAIL_KEY, res.data.data.email);
        } catch {}
        setState("ready");
      })
      .catch((err: unknown) => {
        if (!live) return;
        const { status, details } = apiError(err);
        setState(status === 0 || status >= 500 ? "offline" : reasonOf(details));
      });
    return () => {
      live = false;
    };
  }, [token]);

  const strength = passwordStrength(password);
  const tooShort = password.length > 0 && password.length < MIN_LENGTH;
  const mismatch = confirm.length > 0 && confirm !== password;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < MIN_LENGTH) return setError(`Use at least ${MIN_LENGTH} characters.`);
    if (password.length > MAX_LENGTH) return setError(`Use at most ${MAX_LENGTH} characters.`);
    if (password !== confirm) return setError("The two passwords don't match.");
    setSaving(true);
    try {
      await authApi.passwordReset.reset(token, password);
      router.replace("/login?reset=done");
    } catch (err: unknown) {
      const { status, code, details } = apiError(err);
      setSaving(false);
      if (code === "RESET_TOKEN_INVALID") return setState(reasonOf(details));
      if (code === "WEAK_PASSWORD") return setError(`Use at least ${MIN_LENGTH} characters.`);
      setError(status === 0 ? "Can't reach IIT-PULSE. Check your connection and try again." : "Couldn't save your password right now. Please try again.");
    }
  };

  if (state === "checking") return <Checking />;

  if (state === "offline") {
    return (
      <div className="col fade gap-5 max-md:gap-[18px]">
        <div className="col gap-2.5 max-md:gap-2" role="alert">
          <h1 className="h2">
            Can&apos;t check this <InkUnderline delay={300}>link</InkUnderline>
          </h1>
          <p className="sm muted m-0">IIT-PULSE didn&apos;t answer. Check your connection and open the link again.</p>
        </div>
        <div className="col gap-2">
          <Button size="lg" className="w-full" onClick={() => window.location.reload()}>
            Try again
          </Button>
          <Button asChild size="lg" variant="ghost" className="w-full">
            <Link href="/login">Back to sign in</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (state !== "ready") {
    const c = LINK_COPY[state];
    return (
      <div className="col fade gap-5 max-md:gap-[18px]">
        <span className="inline-flex size-14 items-center justify-center rounded-[16px] bg-[#FFF4E2] text-[#9A5800] max-md:size-[52px]">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
            <path d="M9 15l6-6" />
            <path d="M11 6l.5-.5a4.6 4.6 0 0 1 6.5 6.5l-.5.5M13 18l-.5.5a4.6 4.6 0 0 1-6.5-6.5l.5-.5" />
            <path d="M3 3l18 18" />
          </svg>
        </span>
        <div className="col gap-2.5 max-md:gap-2" role="alert">
          <h1 className="h2">{c.title}</h1>
          <p className="sm muted m-0">{c.text}</p>
        </div>
        <div className="col gap-2">
          <Button asChild size="lg" className="w-full">
            <Link href="/forgot-password?by=email">Send a new link</Link>
          </Button>
          <Button asChild size="lg" variant="ghost" className="w-full">
            <Link href="/login">Back to sign in</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form className="col fade gap-5" onSubmit={save} noValidate>
      <div className="col gap-2.5">
        <h1 className="h1">
          Choose a new <InkUnderline delay={300}>password</InkUnderline>
        </h1>
        <p className="sm muted m-0">At least {MIN_LENGTH} characters. Your old password stops working right away.</p>
      </div>
      {error && <Notice tone="error">{error}</Notice>}
      <div className="field">
        <Label htmlFor="new-password">New password</Label>
        <PasswordField
          id="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={MIN_LENGTH}
          maxLength={MAX_LENGTH}
          autoComplete="new-password"
          aria-describedby="pw-strength"
          aria-invalid={tooShort ? true : undefined}
        />
      </div>
      <div className="col gap-1.5">
        <div className="grid grid-cols-4 gap-1.5" aria-hidden="true">
          {[1, 2, 3, 4].map((seg) => (
            <div key={seg} className="bar" style={{ height: 6 }}>
              <i
                style={{
                  width: strength.score >= seg ? "100%" : "0%",
                  background: SEGMENT_COLOR[strength.score],
                  animationDelay: `${(seg - 1) * 0.1}s`,
                }}
              />
            </div>
          ))}
        </div>
        <span id="pw-strength" className="xs min-h-[17px] font-semibold" style={{ color: SEGMENT_COLOR[strength.score] || "var(--muted)" }} aria-live="polite">
          {strength.label}
        </span>
      </div>
      <div className="field">
        <Label htmlFor="confirm-password">Confirm password</Label>
        <PasswordField
          id="confirm-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          maxLength={MAX_LENGTH}
          autoComplete="new-password"
          aria-invalid={mismatch ? true : undefined}
        />
      </div>
      <Button type="submit" size="lg" className="w-full disabled:opacity-90" disabled={saving}>
        {saving && <Spinner />}
        {saving ? "Saving…" : "Save new password"}
      </Button>
    </form>
  );
}
