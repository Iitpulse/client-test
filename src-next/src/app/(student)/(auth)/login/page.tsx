"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { InkUnderline } from "@iitpulse/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordField } from "@/components/auth/password-field";
import { Notice } from "@/components/auth/notice";
import { AuthBox } from "@/components/auth/form-bits";
import { ArrowRightIcon, Spinner } from "@/components/shell/icons";
import { RESET_EMAIL_KEY } from "@/components/auth/reset-email";
import { useAuthStore } from "@/stores/auth.store";
import { authApi, apiError, safeNext } from "@/lib/auth-api";
import { useOnline } from "@/lib/use-online";
import { cn } from "@/lib/utils";
import { PhoneCodeFlow } from "@/components/auth/phone-code";

/**
 * Student-PhoneSignIn (batch 9, E9 Q4): students sign in with a code texted to their phone first; "Email and password"
 * is the second tab (`?with=email` opens it: links from the code screens, a finished reset, the QA flows).
 *
 * Student-Login / Phone-Login, sign-in state and its errors: POST /users/auth/login { app: "student" }.
 * wrong-credentials 401 · too-many 429 LOGIN_LOCKED { retryAfterSeconds } · account-disabled 403 ACCOUNT_DISABLED ·
 * staff-account 403 STAFF_ACCOUNT { adminUrl } · offline (navigator.onLine or no answer: what was typed stays).
 * After signing in: `?next=` when it is a same-origin path (Kit-States: back to the same page), else Home.
 */
type Problem = { kind: "wrong" } | { kind: "locked"; until: number; minutes: number } | { kind: "disabled" } | { kind: "staff"; adminUrl: string | null } | { kind: "failed" } | null;

export default function LoginPage() {
  // useSearchParams needs a Suspense boundary, or `next build` cannot prerender the page.
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

type Via = "phone" | "email";

/** "Sign in with": Phone code | Email and password (a segmented control; the choice is kept in the URL). */
function SignInTabs({ via, onChange }: { via: Via; onChange: (v: Via) => void }) {
  const opts: Array<[Via, string]> = [
    ["phone", "Phone code"],
    ["email", "Email and password"],
  ];
  return (
    <div className="seg full" role="radiogroup" aria-label="Sign in with">
      {opts.map(([k, l]) => (
        <button
          key={k}
          type="button"
          role="radio"
          aria-checked={via === k}
          className={via === k ? "tab on" : "tab"}
          onClick={() => onChange(k)}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
              e.preventDefault();
              onChange(k === "phone" ? "email" : "phone");
            }
          }}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // from the URL, so a link to /login?with=email (the code screens' "Use email and password") switches the tab
  const via: Via = searchParams.get("with") === "email" ? "email" : "phone";
  const pickVia = (v: Via) => {
    const q = new URLSearchParams(searchParams.toString());
    if (v === "email") q.set("with", "email");
    else q.delete("with");
    const qs = q.toString();
    router.replace(qs ? `/login?${qs}` : "/login", { scroll: false });
  };
  const { login, checkAuth } = useAuthStore();
  const online = useOnline();
  const passwordUpdated = searchParams.get("reset") === "done";
  const next = safeNext(searchParams.get("next"));

  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [problem, setProblem] = useState<Problem>(null);
  const [noAnswer, setNoAnswer] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (checkAuth()) router.replace(next);
  }, [checkAuth, router, next]);

  // After a reset, offer the email the link was for (kept for this tab only).
  useEffect(() => {
    if (!passwordUpdated) return;
    try {
      const remembered = sessionStorage.getItem(RESET_EMAIL_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sessionStorage is only readable after hydration
      if (remembered) setEmail(remembered);
    } catch {}
  }, [passwordUpdated]);

  // The pause ends by itself: the Sign in button comes back when retryAfterSeconds have passed.
  useEffect(() => {
    if (problem?.kind !== "locked") return;
    const t = setTimeout(() => setProblem(null), Math.max(0, problem.until - Date.now()));
    return () => clearTimeout(t);
  }, [problem]);

  // Back online: the offline box goes away and Sign in works again.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reacting to the browser's online event
    if (online) setNoAnswer(false);
  }, [online]);

  const offline = !online || noAnswer;
  const locked = problem?.kind === "locked";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (offline || locked) return;
    setProblem(null);
    setLoading(true);
    try {
      const response = await authApi.login({ email: email.trim(), password });
      // The users service wraps payloads as { success, data: { token } }
      const token = response.data?.data?.token ?? response.data?.token;
      if (!token) throw new Error("No token returned");
      try {
        sessionStorage.removeItem(RESET_EMAIL_KEY);
      } catch {}
      login(token, undefined, response.data?.data?.expiresAt);
      router.push(next);
    } catch (err: unknown) {
      const { status, code, details } = apiError(err);
      setLoading(false);
      if (status === 0) return setNoAnswer(true);
      if (code === "LOGIN_LOCKED" || status === 429) {
        const s = Number(details?.retryAfterSeconds) || 15 * 60;
        return setProblem({ kind: "locked", until: Date.now() + s * 1000, minutes: Math.max(1, Math.ceil(s / 60)) });
      }
      if (code === "ACCOUNT_DISABLED") return setProblem({ kind: "disabled" });
      if (code === "STAFF_ACCOUNT") return setProblem({ kind: "staff", adminUrl: typeof details?.adminUrl === "string" ? details.adminUrl : null });
      // 400/401/404 all mean the credentials did not match: never reveal whether the email exists.
      setProblem(status === 400 || status === 401 || status === 404 ? { kind: "wrong" } : { kind: "failed" });
    }
  };

  const wrong = problem?.kind === "wrong";
  const tabs = <SignInTabs via={via} onChange={pickVia} />;

  if (via === "phone")
    return (
      <>
        {passwordUpdated && <Notice tone="success">Password updated. Sign in with your new password.</Notice>}
        <PhoneCodeFlow purpose="signin" tabs={tabs} next={next} />
      </>
    );

  return (
    <div className="col fade gap-[22px] max-md:gap-[18px]">
      {passwordUpdated && <Notice tone="success">Password updated. Sign in with your new password.</Notice>}
      <div className="col gap-2.5 max-md:gap-2">
        <h1 className="h1">
          Welcome <InkUnderline delay={450}>back</InkUnderline>
        </h1>
        <p className="sm muted m-0">Sign in with the email your institute registered.</p>
      </div>
      {tabs}
      {wrong && (
        <AuthBox id="form-err" tone="sum" icon="wrong" title="Email or password is wrong">
          <span className="xs">Check both and try again.</span>
        </AuthBox>
      )}
      {problem?.kind === "locked" && (
        <AuthBox tone="sum" icon="clock" title={`Too many tries. Wait ${problem.minutes} ${problem.minutes === 1 ? "minute" : "minutes"} or reset your password.`}>
          <Link href="/forgot-password" className="au-inl sm max-md:min-h-11">
            Reset password
          </Link>
        </AuthBox>
      )}
      {offline && (
        <AuthBox tone="srv" icon="wifi" title="You're offline">
          <span className="xs">Connect to the internet to sign in. What you typed stays here.</span>
        </AuthBox>
      )}
      {problem?.kind === "disabled" && (
        <AuthBox tone="sum" icon="lock" title="Your account is turned off. Ask your institute.">
          <span className="xs">IIT-PULSE Indore can turn it back on.</span>
        </AuthBox>
      )}
      {problem?.kind === "staff" && (
        <AuthBox tone="inf" icon="info" title="This is a staff account. Sign in at the admin app.">
          {problem.adminUrl && (
            <a href={problem.adminUrl} className="au-inl sm max-md:min-h-11" style={{ color: "var(--navy)" }}>
              Open the admin app
            </a>
          )}
        </AuthBox>
      )}
      {problem?.kind === "failed" && <Notice tone="error">Couldn&apos;t sign you in right now. Please try again.</Notice>}
      <form className="col gap-[22px] max-md:gap-[18px]" onSubmit={handleSubmit}>
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
            className={cn(wrong && "au-e")}
            aria-invalid={wrong || undefined}
            aria-describedby={wrong ? "form-err" : undefined}
          />
        </div>
        <div className="field">
          <div className="row between">
            <Label htmlFor="password">Password</Label>
            <Link href="/forgot-password" className="sm -mx-1.5 -my-[7px] px-1.5 py-[7px] font-semibold text-brand max-md:my-0 max-md:inline-flex max-md:min-h-11 max-md:items-center max-md:py-0">
              Forgot password?
            </Link>
          </div>
          <PasswordField
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className={cn(wrong && "au-e")}
            aria-invalid={wrong || undefined}
            aria-describedby={wrong ? "form-err" : undefined}
          />
        </div>
        {loading ? (
          <Button type="submit" size="lg" className="w-full disabled:opacity-90" disabled>
            <Spinner />
            Signing in…
          </Button>
        ) : offline || locked ? (
          <button type="submit" className="btn btn-primary btn-lg au-btn-off" disabled>
            {offline ? "Offline · waiting to connect" : "Sign in"}
          </button>
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
