"use client";

import { useState } from "react";
import Link from "next/link";
import { InkUnderline } from "@iitpulse/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Notice } from "@/components/auth/notice";
import { ArrowLeftIcon, MailIcon, Spinner } from "@/components/shell/icons";
import { api, apiError } from "@/lib/api";

// Student-Login board, forgot-password state. POST /users/reset-password/request { email, app: "student" }:
// always the same 200 whether or not the account exists, so the screen never says whether it does.
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const send = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const address = (sentTo ?? email).trim();
    setError("");
    setLoading(true);
    try {
      await api.passwordReset.request(address);
      setSentTo(address);
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
      <Link href="/login" className="sm row -my-2 gap-1.5 self-start py-2 font-semibold text-muted hover:text-ink">
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
        </form>
      ) : (
        <div className="col pop items-center gap-3.5 py-2 text-center" role="status">
          <span className="inline-flex size-16 items-center justify-center rounded-[20px] bg-success-50 text-success">
            <MailIcon />
          </span>
          <span className="h3">Check your inbox</span>
          <span className="sm muted">
            If <strong className="font-semibold text-ink-2">{sentTo}</strong> has an IIT-PULSE account, a reset link is on its way. Check spam if it
            isn&apos;t there in a few minutes.
          </span>
          <Button variant="secondary" onClick={() => send()} disabled={loading}>
            {loading && <Spinner />}
            Send it again
          </Button>
        </div>
      )}
    </div>
  );
}
