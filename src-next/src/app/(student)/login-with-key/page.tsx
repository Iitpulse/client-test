"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { InkUnderline } from "@iitpulse/ui";
import { useAuthStore, useTestStore } from "@/stores";
import { api, apiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Notice } from "@/components/auth/notice";
import { SignInCard, SignInFrame } from "@/components/auth/signin-frame";
import { ArrowRightIcon, Spinner } from "@/components/shell/icons";

/**
 * Manual entry for a test access key (Student-SignInLink frame). Links of the form /auth/<key>/<testId> exchange
 * the key automatically; this page is for students who were given the key by itself. Kept at the same URL, with
 * ?key= (prefill) and ?error=invalid (older redirects) still understood.
 * useSearchParams needs a Suspense boundary, or `next build` fails to prerender the page.
 */
const ERROR_TEXT: Record<string, string> = {
  LINK_EXPIRED: "This key has expired. Ask your teacher for a new link, or sign in with your email.",
  LINK_REVOKED: "This key was turned off by your institute. Use the newest link your teacher sent.",
  LINK_INVALID: "That key doesn't match any test. Check the 10 characters and try again.",
};

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
  const [error, setError] = useState(searchParams.get("error") === "invalid" ? ERROR_TEXT.LINK_INVALID : "");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const k = searchParams.get("key");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- prefill from the URL after hydration
    if (k) setKey(k.toUpperCase());
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await api.auth.loginWithKey(key.trim());
      const data = response.data?.data;
      if (!data?.token) throw new Error("No token returned");
      reset();
      login(data.token, data.student?.name);
      setTestId(data.testId);
      router.push("/instructions");
    } catch (err: unknown) {
      const { status, code } = apiError(err);
      setError(
        code && ERROR_TEXT[code]
          ? ERROR_TEXT[code]
          : status === 400 || status === 401 || status === 404
            ? ERROR_TEXT.LINK_INVALID
            : status === 0
              ? "Can't reach IIT-PULSE. Check your connection and try again."
              : "Couldn't sign you in right now. Please try again."
      );
      setLoading(false);
    }
  };

  return (
    <SignInFrame footer={false}>
      <SignInCard gap={22}>
        <div className="col gap-2.5">
          <h1 className="h2">
            Enter your test <InkUnderline delay={450}>key</InkUnderline>
          </h1>
          <p className="sm muted m-0">Your teacher&apos;s link ends with a 10-character key. It signs you in and opens that one test.</p>
        </div>
        {error && <Notice tone="error">{error}</Notice>}
        <form className="col gap-[22px]" onSubmit={handleSubmit}>
          <div className="field">
            <Label htmlFor="key">Key</Label>
            <Input
              id="key"
              value={key}
              onChange={(e) => setKey(e.target.value.toUpperCase())}
              placeholder="e.g. K7PX4M2QHD"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              maxLength={64}
              className="font-mono tracking-[.2em] uppercase placeholder:font-sans placeholder:tracking-normal placeholder:normal-case"
              aria-invalid={error ? true : undefined}
            />
          </div>
          {loading ? (
            <Button type="submit" size="lg" className="w-full disabled:opacity-90" disabled>
              <Spinner />
              Opening your test…
            </Button>
          ) : (
            <Button type="submit" size="lg" className="group w-full" disabled={!key.trim()}>
              Open my test <ArrowRightIcon className="transition-transform duration-200 group-hover:translate-x-[3px]" />
            </Button>
          )}
        </form>
      </SignInCard>
      <p className="xs muted m-0 text-center">
        Have an account instead?{" "}
        <Link href="/login" className="font-semibold">
          Sign in with email
        </Link>
      </p>
    </SignInFrame>
  );
}
