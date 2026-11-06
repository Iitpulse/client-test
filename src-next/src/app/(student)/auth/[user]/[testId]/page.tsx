"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { InkUnderline } from "@iitpulse/ui";
import { useAuthStore, useTestStore } from "@/stores";
import { authApi, apiError } from "@/lib/auth-api";
import { SignInCard, SignInFrame } from "@/components/auth/signin-frame";
import { LinkGateProblem, LinkProblem } from "@/components/auth/link-problem";
import { StateCard } from "@/components/student/states";
import { ArrowRightIcon, CheckIcon, Spinner } from "@/components/shell/icons";
import { buttonVariants } from "@/components/ui/button";

/**
 * Student-SignInLink board. Direct-link entry: /auth/{key-or-token}/{testId} (the URL the admin app hands out).
 * - a short value is a test key issued by the institute: POST /student/auth/login-with-key exchanges it for a
 *   session. Refusals (M6): 404 LINK_INVALID and 410 LINK_REVOKED (SignInLink cards), 410 LINK_EXPIRED and
 *   409 LINK_USED (Student-TestGate link-expired / link-used, the newer batch 5 board), 429 TOO_MANY_ATTEMPTS.
 * - a long value is a full session token (legacy links from the admin app).
 * Either way the student lands on the test gate /tests/<id>/start, which leads to the NTA instructions.
 * The steps below show real progress; nothing waits on a timer.
 */
type Problem = "LINK_INVALID" | "LINK_EXPIRED" | "LINK_REVOKED" | "LINK_USED" | "OFFLINE" | { busy: string };
const LINK_CODES = ["LINK_INVALID", "LINK_EXPIRED", "LINK_REVOKED", "LINK_USED"] as const;

export default function AuthWithURIPage() {
  const router = useRouter();
  const params = useParams();
  const { setTestId, login, checkAuth } = useAuthStore();
  const { fetchTest, reset } = useTestStore();
  const hasProcessed = useRef(false);
  const [step, setStep] = useState(0); // 0 checking the link, 1 signing in, 2 loading the instructions, 3 done
  const [studentName, setStudentName] = useState<string | undefined>();
  const [testName, setTestName] = useState<string | undefined>();
  const [problem, setProblem] = useState<Problem | null>(null);
  const [retrying, setRetrying] = useState(false);

  const credential = params.user as string;
  const testId = params.testId as string;
  const gatePath = `/tests/${encodeURIComponent(testId)}/start`;
  const signInHref = `/login?next=${encodeURIComponent(gatePath)}`;

  const run = useCallback(() => {
    if (!testId) {
      router.push("/login");
      return;
    }
    setStep(0);
    reset();
    setTestId(testId);

    const openTest = () => {
      setStep(2);
      return fetchTest(testId)
        .then(() => {
          setTestName(useTestStore.getState().test?.name);
          setStep(3);
          router.push(gatePath);
        })
        .catch(() => {
          setStep(3);
          router.push(gatePath); // the gate shows why the test can't open (closed, not assigned, …)
        });
    };

    if (credential && credential.length <= 32) {
      authApi
        .loginWithKey(credential)
        .then((response) => {
          const data = response.data?.data;
          if (!data?.token) throw new Error("No token in key exchange response");
          setProblem(null);
          setRetrying(false);
          setStudentName(data.student?.name);
          setStep(1);
          login(data.token, data.student?.name);
          setTestId(data.testId || testId);
          return openTest();
        })
        .catch((error) => {
          const { status, code, message } = apiError(error);
          setRetrying(false);
          setProblem(
            code && (LINK_CODES as readonly string[]).includes(code)
              ? (code as (typeof LINK_CODES)[number])
              : status === 0 || status >= 500
                ? "OFFLINE"
                : status === 429
                  ? { busy: message || "Too many tries. Wait a minute and try again." }
                  : "LINK_INVALID"
          );
        });
    } else if (credential && credential.length > 50) {
      try {
        setStep(1);
        login(credential);
        openTest();
      } catch (error) {
        console.error("Failed to authenticate with URL token:", error);
        router.push("/login");
      }
    } else if (checkAuth()) {
      setStep(1);
      openTest();
    } else {
      router.push("/login");
    }
  }, [credential, testId, gatePath, setTestId, login, checkAuth, fetchTest, reset, router]);

  useEffect(() => {
    if (hasProcessed.current) return; // strict-mode double run
    hasProcessed.current = true;
    run();
  }, [run]);

  if (problem === "LINK_EXPIRED" || problem === "LINK_USED") return <LinkGateProblem problem={problem} signInHref={signInHref} />;
  if (problem === "LINK_INVALID" || problem === "LINK_REVOKED") return <LinkProblem problem={problem} signInHref={signInHref} />;
  if (problem === "OFFLINE")
    return (
      <LinkProblem
        problem="OFFLINE"
        retrying={retrying}
        onRetry={() => {
          setRetrying(true);
          run();
        }}
      />
    );
  if (problem) {
    // 429 TOO_MANY_ATTEMPTS: no board state; Kit-States error card with the API's sentence and Try again
    return (
      <SignInFrame footer={false}>
        <StateCard tone="red" icon="warn" role="alert" headingLevel={1} title="Couldn't open your test" body={problem.busy} primary={{ label: "Try again", onClick: run }} className="w-full max-w-[460px]" />
      </SignInFrame>
    );
  }

  const labels = ["Checking your test link", studentName ? `Signing you in as ${studentName}` : "Signing you in", "Loading the instructions"];
  const finished = step >= 3;

  return (
    <SignInFrame>
      <SignInCard>
        <div className="col gap-2.5">
          <h1 className="h2">
            Opening your <InkUnderline delay={450}>test</InkUnderline>
          </h1>
          <p className="sm muted m-0">{testName ? `${testName} · from your teacher's link` : "From your teacher's link"}</p>
        </div>
        <ol className="col m-0 list-none gap-3.5 p-0">
          {labels.map((label, i) => {
            const done = i < step;
            const active = i === step;
            return (
              <li key={i} className="row gap-3">
                {done ? (
                  <span className="pop inline-flex size-7 flex-none items-center justify-center rounded-full bg-success text-white">
                    <CheckIcon size={16} strokeWidth={2.6} />
                  </span>
                ) : active ? (
                  <span className="inline-flex size-7 flex-none items-center justify-center rounded-full border-2 border-brand-100">
                    <Spinner size={16} color="var(--navy)" strokeWidth={3} />
                  </span>
                ) : (
                  <span className="size-7 flex-none rounded-full border-2 border-line" />
                )}
                <span className={i <= step ? "body font-[550] text-ink" : "body text-muted"}>{label}</span>
              </li>
            );
          })}
        </ol>
        <div className="bar" style={{ height: 6 }}>
          <i style={{ width: `${Math.round((Math.min(step, 3) / 3) * 100)}%`, transition: "width 600ms cubic-bezier(.2,.8,.2,1)", animation: "none" }} />
        </div>
        {finished && (
          <div className="row wrap between fade gap-3">
            <span className="sm font-semibold">Starting your test…</span>
            <Link href={gatePath} className={buttonVariants({ className: "group max-md:w-full" })}>
              Continue to instructions <ArrowRightIcon className="transition-transform duration-200 group-hover:translate-x-[3px]" />
            </Link>
          </div>
        )}
        <p role="status" aria-live="polite" className="sr-only">
          {finished ? "Done. Opening the instructions." : labels[step]}
        </p>
      </SignInCard>
    </SignInFrame>
  );
}
