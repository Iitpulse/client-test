"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PhoneCodeFlow } from "@/components/auth/phone-code";
import { InkUnderline } from "@iitpulse/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Notice } from "@/components/auth/notice";
import { ArrowLeftIcon, MailIcon, Spinner } from "@/components/shell/icons";
import { authApi, apiError } from "@/lib/auth-api";

// Student-PhoneSignIn (batch 9, SMS first): "Reset your password" by a code texted to the phone on the account
// (reset-phone, reset-code, reset-pick-account, reset-new-password). `?by=email` is the email link reset below.
export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ForgotPassword />
    </Suspense>
  );
}

function ForgotPassword() {
  const by = useSearchParams().get("by");
  if (by === "email") return <EmailReset />;
  return (
    <div className="col gap-[22px]">
      <Link href="/login" className="sm row -my-2 gap-1.5 self-start py-2 font-semibold text-muted hover:text-ink">
        <ArrowLeftIcon />
        Back to sign in
      </Link>
      <PhoneCodeFlow purpose="reset" />
    </div>
  );
}

// Student-Login board, forgot-password state. POST /users/reset-password/request { email, app: "student" }:
// always the same 200 whether or not the account exists, so the screen never says whether it does.
function EmailReset() {
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  // "Didn't get it? Resend in 0:45": a new link can be asked for 45 seconds after the last one (board).
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const send = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const address = (sentTo ?? email).trim();
    setError("");
    setLoading(true);
    try {
      await authApi.passwordReset.request(address);
      setSentTo(address);
      setCooldown(45);
    } catch (err: unknown) {
      const { status } = apiError(err);
      setError(
        status === 429
          ? "Too many reset requests for this email. Wait a while, then try again."
          : status === 400
            ? "Enter the full email address, like name@example.com."
            : status === 0
              ? "Can't reach IIT-PULSE. Check your connection and try again."
              : "Couldn't send the link right now. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="col fade gap-[22px]">
      <Link href="/login?with=email" className="sm row -my-2 gap-1.5 self-start py-2 font-semibold text-muted hover:text-ink">
        <ArrowLeftIcon />
        Back to sign in
      </Link>
      <div className="col gap-2.5">
        <h1 className="h1">
          Reset your <InkUnderline delay={300}>password</InkUnderline>
        </h1>
        <p className="sm muted m-0">We&apos;ll email you a link. It works once and expires in 30 minutes.</p>
      </div>
      {error && <Notice tone="error">{error}</Notice>}
      {sentTo === null ? (
        <form className="col gap-4" onSubmit={send}>
          <div className="field">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              inputMode="email"
              autoCapitalize="none"
              spellCheck={false}
            />
          </div>
          <Button type="submit" size="lg" className="w-full disabled:opacity-90" disabled={loading}>
            {loading && <Spinner />}
            {loading ? "Sending…" : "Send reset link"}
          </Button>
          <p className="xs muted m-0 text-center">
            Have your phone?{" "}
            <Link href="/forgot-password" className="font-semibold">
              Reset with a code by SMS
            </Link>
          </p>
        </form>
      ) : (
        <div className="col pop items-center gap-3.5 py-2 text-center max-md:gap-3 max-md:py-1">
          <span className="inline-flex size-16 items-center justify-center rounded-[20px] bg-success-50 text-success max-md:size-[60px] max-md:rounded-[18px]">
            <MailIcon />
          </span>
          <span className="h3">Check your inbox</span>
          <span className="sm muted" role="status">
            We sent a link to {sentTo}.
          </span>
          {cooldown > 0 ? (
            <p className="sm muted m-0 flex min-h-8 items-center max-md:min-h-11">
              Didn&apos;t get it? Resend in&nbsp;
              <span className="font-semibold text-ink-2 tabular-nums">0:{String(cooldown).padStart(2, "0")}</span>
            </p>
          ) : (
            <p className="sm muted m-0 flex items-center">
              Didn&apos;t get it?&nbsp;
              <button type="button" className="au-inl max-md:min-h-11 max-md:px-1.5" style={{ color: "var(--navy)" }} onClick={() => send()} disabled={loading}>
                {loading ? "Sending…" : "Resend"}
              </button>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
