"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { InkUnderline } from "@iitpulse/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordField } from "@/components/auth/password-field";
import { Notice } from "@/components/auth/notice";
import { ArrowRightIcon, Spinner } from "@/components/shell/icons";
import { RESET_EMAIL_KEY } from "@/components/auth/reset-email";
import { useAuthStore } from "@/stores";
import { api, apiError } from "@/lib/api";

// Student-Login board, sign-in state. POST /users/auth/login (unchanged); the session token goes to the auth store.
export default function LoginPage() {
  // useSearchParams needs a Suspense boundary, or `next build` cannot prerender the page.
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, checkAuth } = useAuthStore();
  const passwordUpdated = searchParams.get("reset") === "done";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (checkAuth()) router.replace("/tests");
  }, [checkAuth, router]);

  // After a reset, offer the email the link was for (kept for this tab only).
  useEffect(() => {
    if (!passwordUpdated) return;
    try {
      const remembered = sessionStorage.getItem(RESET_EMAIL_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sessionStorage is only readable after hydration
      if (remembered) setEmail(remembered);
    } catch {}
  }, [passwordUpdated]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await api.auth.login({ email: email.trim(), password });
      // The users service wraps payloads as { success, data: { token } }
      const token = response.data?.data?.token ?? response.data?.token;
      if (!token) throw new Error("No token returned");
      try {
        sessionStorage.removeItem(RESET_EMAIL_KEY);
      } catch {}
      login(token);
      router.push("/tests");
    } catch (err: unknown) {
      // 400/401/404 all mean the credentials did not match: never reveal whether the email exists.
      const { status } = apiError(err);
      setError(
        status === 400 || status === 401 || status === 404
          ? "That email and password don't match. Check them and try again."
          : status === 429
            ? "Too many attempts. Wait a minute, then try again."
            : status === 0
              ? "Can't reach IIT-PULSE. Check your connection and try again."
              : "Couldn't sign you in right now. Please try again."
      );
      setLoading(false);
    }
  };

  return (
    <div className="col fade gap-[22px]">
      {passwordUpdated && <Notice tone="success">Password updated. Sign in with your new password.</Notice>}
      <div className="col gap-2.5">
        <h1 className="h1">
          Welcome <InkUnderline delay={450}>back</InkUnderline>
        </h1>
        <p className="sm muted m-0">Sign in with the email your institute registered.</p>
      </div>
      {error && <Notice tone="error">{error}</Notice>}
      <form className="col gap-[22px]" onSubmit={handleSubmit} noValidate={false}>
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
            aria-invalid={error ? true : undefined}
          />
        </div>
        <div className="field">
          <div className="row between">
            <Label htmlFor="password">Password</Label>
            <Link href="/forgot-password" className="sm -mx-1.5 -my-[7px] px-1.5 py-[7px] font-semibold text-brand">
              Forgot password?
            </Link>
          </div>
          <PasswordField
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            aria-invalid={error ? true : undefined}
          />
        </div>
        {loading ? (
          <Button type="submit" size="lg" className="w-full disabled:opacity-90" disabled>
            <Spinner />
            Signing in…
          </Button>
        ) : (
          <Button type="submit" size="lg" className="group w-full">
            Sign in <ArrowRightIcon className="transition-transform duration-200 ease-standard group-hover:translate-x-[3px]" />
          </Button>
        )}
      </form>
      <p className="xs muted m-0 text-center text-balance">Got a test link from your teacher? Opening it signs you in.</p>
    </div>
  );
}
