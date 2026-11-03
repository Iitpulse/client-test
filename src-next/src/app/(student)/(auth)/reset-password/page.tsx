"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { InkUnderline } from "@iitpulse/ui";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordField } from "@/components/auth/password-field";
import { Notice } from "@/components/auth/notice";
import { ClockIcon, Spinner } from "@/components/shell/icons";
import { RESET_EMAIL_KEY, passwordStrength } from "@/components/auth/reset-email";
import { authApi, apiError } from "@/lib/auth-api";

// Student-Login board, reset state: /reset-password?token=... from the email (new in the student app).
// verify checks the link without using it up; reset sets the password and uses the link up (it works once).
const MIN_LENGTH = 8; // the board's rule; the API accepts 6-128
const MAX_LENGTH = 128;
const SEGMENT_COLOR = ["", "var(--red-600)", "var(--amber)", "var(--green)", "var(--green)"];

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
  const [state, setState] = useState<"checking" | "ready" | "invalid" | "offline">(token ? "checking" : "invalid");
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
        const { status } = apiError(err);
        setState(status === 0 || status >= 500 ? "offline" : "invalid");
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
      const { status, code } = apiError(err);
      setSaving(false);
      if (code === "RESET_TOKEN_INVALID") return setState("invalid");
      setError(status === 0 ? "Can't reach IIT-PULSE. Check your connection and try again." : "Couldn't save your password right now. Please try again.");
    }
  };

  if (state === "checking") return <Checking />;

  if (state === "invalid" || state === "offline") {
    const offline = state === "offline";
    return (
      <div className="col fade gap-[18px]">
        <span className="inline-flex size-[52px] items-center justify-center rounded-[16px] bg-warning-50 text-warning">
          <ClockIcon />
        </span>
        <div className="col gap-2.5">
          <h1 className="h1">
            {offline ? (
              <>
                Can&apos;t check this <InkUnderline delay={300}>link</InkUnderline>
              </>
            ) : (
              <>
                This link has <InkUnderline delay={300}>expired</InkUnderline>
              </>
            )}
          </h1>
          <p className="body muted m-0">
            {offline
              ? "IIT-PULSE didn't answer. Check your connection and open the link again."
              : "Reset links work once and only for 30 minutes. Ask for a new one and use the newest email."}
          </p>
        </div>
        <div className="row wrap gap-2.5">
          {offline ? (
            <Button onClick={() => window.location.reload()}>Try again</Button>
          ) : (
            <Button asChild>
              <Link href="/forgot-password">Send a new link</Link>
            </Button>
          )}
          <Button asChild variant="ghost">
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
