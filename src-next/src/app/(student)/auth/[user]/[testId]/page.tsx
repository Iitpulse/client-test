"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { InkUnderline } from "@iitpulse/ui";
import { useAuthStore, useTestStore } from "@/stores";
import { api, apiError, type LinkErrorCode } from "@/lib/api";
import { SignInCard, SignInFrame } from "@/components/auth/signin-frame";
import { LinkProblem } from "@/components/auth/link-problem";
import { ArrowRightIcon, CheckIcon, Spinner } from "@/components/shell/icons";
import { buttonVariants } from "@/components/ui/button";

/**
 * Student-SignInLink board. Direct-link entry: /auth/{key-or-token}/{testId} (the URL the admin app hands out).
 * - a short value is a test access key issued by the institute: POST /student/auth/login-with-key exchanges it
 *   for a session. A refusal is 401 with code LINK_INVALID, LINK_EXPIRED or LINK_REVOKED, each with its own card.
 * - a long value is a full session token (legacy links from the admin app).
 * Either way the student lands on the NTA instructions for that test (a full page load into the (exam) layout).
 * The steps below show real progress; nothing waits on a timer.
 */
type Problem = LinkErrorCode | "OFFLINE";
const LINK_CODES: LinkErrorCode[] = ["LINK_INVALID", "LINK_EXPIRED", "LINK_REVOKED"];

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

  const credential = params.user as string;
  const testId = params.testId as string;

  const run = useCallback(() => {
    if (!testId) {
      router.push("/login");
      return;
    }
    setProblem(null);
    setStep(0);
    reset();
    setTestId(testId);

    const openTest = () => {
      setStep(2);
      return fetchTest(testId)
        .then(() => {
          setTestName(useTestStore.getState().test?.name);
          setStep(3);
          router.push("/instructions");
        })
        .catch((error) => {
          console.error("Failed to fetch test:", error);
          setStep(3);
          router.push("/instructions"); // the instructions page shows the server's reason
        });
    };

    if (credential && credential.length <= 32) {
      api.auth
        .loginWithKey(credential)
        .then((response) => {
          const data = response.data?.data;
          if (!data?.token) throw new Error("No token in key exchange response");
          setStudentName(data.student?.name);
          setStep(1);
          login(data.token, data.student?.name);
          setTestId(data.testId || testId);
          return openTest();
        })
        .catch((error) => {
          const { status, code } = apiError(error);
          console.error("Access key rejected:", status, code);
          setProblem(code && (LINK_CODES as string[]).includes(code) ? (code as LinkErrorCode) : status === 0 || status >= 500 ? "OFFLINE" : "LINK_INVALID");
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
  }, [credential, testId, setTestId, login, checkAuth, fetchTest, reset, router]);

  useEffect(() => {
    if (hasProcessed.current) return; // strict-mode double run
    hasProcessed.current = true;
    run();
  }, [run]);

  if (problem) {
    return (
      <SignInFrame>
        <LinkProblem problem={problem} onRetry={run} />
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
            <Link href="/instructions" className={buttonVariants({ className: "group" })}>
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
