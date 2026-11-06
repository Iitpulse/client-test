"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { InkUnderline } from "@iitpulse/ui";
import { useAuthStore, useTestStore } from "@/stores";
import { authApi, apiError } from "@/lib/auth-api";
import { ErrText } from "@/components/auth/form-bits";
import { LinkGateProblem } from "@/components/auth/link-problem";
import { SignInFrame } from "@/components/auth/signin-frame";
import { ArrowRightIcon, Spinner } from "@/components/shell/icons";
import { cn } from "@/lib/utils";

/**
 * Student-SignInLink key-entry / key-entry-error: the 6-character test key typed in (owner: keys are 6 characters;
 * older 10-character keys keep working until they expire). POST /users/student/auth/login-with-key; success opens
 * the test gate /tests/<id>/start. 404 LINK_INVALID, 410 LINK_EXPIRED / LINK_REVOKED → the board's inline error;
 * 409 LINK_USED → Student-TestGate link-used. ?key= prefills, ?error=invalid (older redirects) shows the error.
 * useSearchParams needs a Suspense boundary, or `next build` fails to prerender the page.
 */
const WRONG_KEY = "This key is wrong or has expired. Check it with your teacher.";

export default function LoginWithKeyPage() {
  return (
    <Suspense fallback={null}>
      <LoginWithKeyForm />
    </Suspense>
  );
}

function LoginWithKeyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, setTestId } = useAuthStore();
  const { reset } = useTestStore();
  const [key, setKey] = useState("");
  const [error, setError] = useState(searchParams.get("error") === "invalid" ? WRONG_KEY : "");
  const [used, setUsed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const k = searchParams.get("key");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- prefill from the URL after hydration
    if (k) setKey(k.toUpperCase().replace(/[^A-Z0-9]/g, ""));
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const k = key.trim();
    if (k.length < 6) return setError("Test keys have 6 characters");
    setError("");
    setLoading(true);
    try {
      const response = await authApi.loginWithKey(k);
      const data = response.data?.data;
      if (!data?.token) throw new Error("No token returned");
      reset();
      login(data.token, data.student?.name, data.expiresAt);
      setTestId(data.testId);
      router.push(`/tests/${encodeURIComponent(data.testId)}/start`);
    } catch (err: unknown) {
      const { status, code, message } = apiError(err);
      setLoading(false);
      if (code === "LINK_USED") return setUsed(true);
      setError(
        code === "LINK_INVALID" || code === "LINK_EXPIRED" || code === "LINK_REVOKED" || status === 400 || status === 401 || status === 404 || status === 410
          ? WRONG_KEY
          : status === 0
            ? "You're offline. Connect to the internet and try again."
            : status === 429
              ? message || "Too many tries. Wait a minute and try again."
              : "Couldn't open the test right now. Please try again."
      );
    }
  };

  if (used) return <LinkGateProblem problem="LINK_USED" />;

  return (
    <SignInFrame footer={false}>
      <form className="card col pop relative w-full max-w-[460px] p-8 max-md:rounded-[16px] max-md:px-5 max-md:py-6" style={{ gap: 20, margin: 0 }} onSubmit={handleSubmit} noValidate>
        <span className="cl-tape" aria-hidden="true" style={{ "--rot": "-2deg", "--d": 700 } as React.CSSProperties} />
        <div className="col gap-2.5">
          <h1 className="h2">
            Open a test with a <InkUnderline delay={450}>key</InkUnderline>
          </h1>
          <p className="sm muted m-0">Type the test key your teacher gave you.</p>
        </div>
        <div className="field">
          <label className="label" htmlFor="tk">
            Test key
          </label>
          <input
            id="tk"
            className={cn("input au-keyin", error && "e")}
            value={key}
            onChange={(e) => {
              setKey(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""));
              if (error) setError("");
            }}
            placeholder="K7P2QX"
            maxLength={10}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            aria-invalid={!!error || undefined}
            aria-describedby="tk-h"
          />
          {error ? (
            <ErrText id="tk-h" icon>
              {error}
            </ErrText>
          ) : (
            <span id="tk-h" className="hint">
              6 letters and numbers, like K7P2QX
            </span>
          )}
        </div>
        {loading ? (
          <button type="submit" className="btn btn-primary btn-lg w-full" disabled style={{ opacity: 0.9 }}>
            <Spinner size={16} />
            Opening your test…
          </button>
        ) : (
          <button type="submit" className="btn btn-primary btn-lg group w-full">
            Open test <ArrowRightIcon className="transition-transform duration-200 group-hover:translate-x-[3px]" />
          </button>
        )}
        <p className="xs muted m-0 text-center">
          Have an account?{" "}
          <Link href="/login" className="font-semibold">
            Sign in
          </Link>
        </p>
      </form>
    </SignInFrame>
  );
}
