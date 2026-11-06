"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { GateCard, GateFrame } from "@/components/student/gate-card";
import { Note } from "@/components/student/states";
import { Spinner } from "@/components/shell/icons";
import { SignInCard, SignInFrame } from "./signin-frame";

const ico = { width: 26, height: 26, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", "aria-hidden": true, focusable: false } as const;

/** Student-SignInLink revoked / invalid / offline cards (the 52px tinted icon, title, body, actions). */
const COPY: Record<"LINK_REVOKED" | "LINK_INVALID" | "OFFLINE", { tone: "amber" | "grey"; icon: ReactNode; title: string; body: string }> = {
  LINK_REVOKED: {
    tone: "grey",
    icon: (
      <svg {...ico} strokeLinejoin="round">
        <path d="M9 15l6-6" />
        <path d="M11 6l.5-.5a4.6 4.6 0 0 1 6.5 6.5l-.5.5M13 18l-.5.5a4.6 4.6 0 0 1-6.5-6.5l.5-.5" />
        <path d="M3 3l18 18" />
      </svg>
    ),
    title: "Your teacher turned this link off",
    body: "This test link no longer opens. Sign in to find your tests under Tests, or ask your teacher for a new link or a test key.",
  },
  LINK_INVALID: {
    tone: "amber",
    icon: (
      <svg {...ico}>
        <circle cx="12" cy="12" r="9" />
        <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.4M12 17h.01" />
      </svg>
    ),
    title: "This link doesn't work",
    body: "Part of it may be missing. Open it again from your teacher's message, or sign in and find the test under Tests.",
  },
  OFFLINE: {
    tone: "amber",
    icon: (
      <svg {...ico}>
        <path d="M2 8.5a15 15 0 0 1 20 0M5.5 12a10 10 0 0 1 13 0M9 15.5a5 5 0 0 1 6 0M12 19h.01M3 3l18 18" />
      </svg>
    ),
    title: "You're offline",
    body: "Connect to the internet and try again. Your test link still works.",
  },
};

export function LinkProblem({ problem, onRetry, retrying, signInHref = "/login" }: { problem: keyof typeof COPY; onRetry?: () => void; retrying?: boolean; signInHref?: string }) {
  const c = COPY[problem];
  return (
    <SignInFrame footer={false}>
      <SignInCard gap={18} taped={false}>
        <div className="col" style={{ gap: 18 }} role={problem === "OFFLINE" ? "alert" : undefined}>
          <span className={`au-ico ${c.tone}`}>{c.icon}</span>
          <div className="col gap-2.5">
            <h1 className="h2">{c.title}</h1>
            <p className="body muted m-0">{c.body}</p>
          </div>
        </div>
        <div className="au-acts">
          {problem === "OFFLINE" ? (
            <button type="button" className="btn btn-primary" onClick={onRetry} disabled={retrying} style={retrying ? { opacity: 0.9 } : undefined}>
              {retrying && <Spinner size={16} />}
              {retrying ? "Checking…" : "Try again"}
            </button>
          ) : (
            <>
              <Link href={signInHref} className="btn btn-primary">
                Sign in
              </Link>
              <Link href="/login-with-key" className="btn btn-ghost">
                I have a test key
              </Link>
            </>
          )}
        </div>
      </SignInCard>
    </SignInFrame>
  );
}

/**
 * Student-TestGate link-expired / link-used: the one-card gate screen (login-with-key 410 LINK_EXPIRED,
 * 409 LINK_USED). The student is signed out here, so the top bar has no avatar and no back link.
 */
export function LinkGateProblem({ problem, signInHref = "/login" }: { problem: "LINK_EXPIRED" | "LINK_USED"; signInHref?: string }) {
  const expired = problem === "LINK_EXPIRED";
  return (
    <GateFrame back={null} signedIn={false}>
      <GateCard
        tone="amber"
        icon="link"
        title={expired ? "This test link has expired" : "This link has already been used"}
        body={
          expired
            ? "Links from your teacher work for a limited time. Sign in with your email to find the test, or ask your teacher for a new link."
            : "Each test link signs in one student, once. If that was you on another device, sign in there or with your email here."
        }
        actions={
          <>
            <Link href={signInHref} className="btn btn-lg btn-primary">
              Sign in
            </Link>
            {expired ? (
              <Link href="/login-with-key" className="btn btn-lg btn-ghost">
                Enter a test key
              </Link>
            ) : (
              <Link href="/tests" className="btn btn-lg btn-ghost">
                Back to tests
              </Link>
            )}
          </>
        }
      >
        {!expired && <Note tone="warn">If it wasn&apos;t you, tell your teacher now so they can block the link.</Note>}
      </GateCard>
    </GateFrame>
  );
}
