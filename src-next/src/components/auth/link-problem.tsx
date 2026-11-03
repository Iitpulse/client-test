import Link from "next/link";
import type { ReactNode } from "react";
import { InkUnderline } from "@iitpulse/ui";
import { Button } from "@/components/ui/button";
import { BlockedIcon, ClockIcon, LinkBrokenIcon } from "@/components/shell/icons";
import type { LinkErrorCode } from "@/lib/api";
import { SignInCard } from "./signin-frame";

type Problem = LinkErrorCode | "OFFLINE";

const COPY: Record<Problem, { icon: ReactNode; tone: string; lead: string; mark: string; body: string }> = {
  LINK_EXPIRED: {
    icon: <ClockIcon />,
    tone: "bg-warning-50 text-warning",
    lead: "This link has",
    mark: "expired",
    body: "Test links work for a limited time. Sign in normally and you'll find the test under Tests, or ask your teacher for a new link.",
  },
  LINK_REVOKED: {
    icon: <BlockedIcon />,
    tone: "bg-line-2 text-ink-2",
    lead: "This link was",
    mark: "turned off",
    body: "Your institute switched this link off, usually because a newer one was sent. Use the newest link from your teacher, or sign in normally.",
  },
  LINK_INVALID: {
    icon: <LinkBrokenIcon />,
    tone: "bg-danger-50 text-danger",
    lead: "This link doesn't",
    mark: "work",
    body: "It may have been copied only in part. Open it again from the message your teacher sent, or type the 10-character key from it.",
  },
  OFFLINE: {
    icon: <LinkBrokenIcon />,
    tone: "bg-line-2 text-ink-2",
    lead: "Can't reach",
    mark: "IIT-PULSE",
    body: "Your link wasn't checked because the connection dropped. Check your internet, then try again.",
  },
};

/** The SignInLink board's "expired" card, with its own wording for each refusal (LINK_EXPIRED / _REVOKED / _INVALID). */
export function LinkProblem({ problem, onRetry }: { problem: Problem; onRetry?: () => void }) {
  const c = COPY[problem];
  return (
    <SignInCard gap={18} taped={false}>
      <span className={`inline-flex size-[52px] items-center justify-center rounded-[16px] ${c.tone}`}>{c.icon}</span>
      <div className="col gap-2.5">
        <h1 className="h2">
          {c.lead} <InkUnderline delay={450}>{c.mark}</InkUnderline>
        </h1>
        <p className="body muted m-0">{c.body}</p>
      </div>
      <div className="row wrap gap-2.5">
        {problem === "OFFLINE" && onRetry ? (
          <Button onClick={onRetry}>Try again</Button>
        ) : (
          <Button asChild>
            <Link href="/login">Sign in</Link>
          </Button>
        )}
        {problem === "LINK_INVALID" ? (
          <Button asChild variant="ghost">
            <Link href="/login-with-key">Type the key</Link>
          </Button>
        ) : problem === "OFFLINE" ? (
          <Button asChild variant="ghost">
            <Link href="/login">Sign in instead</Link>
          </Button>
        ) : null}
      </div>
    </SignInCard>
  );
}
