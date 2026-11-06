"use client";

// The frame and card of the batch 5 one-card screens: Student-TestGate (/tests/[id]/start), Student-Submitted
// (/result) and the sign-in link problems (link expired / used). Desktop: a 64px top bar (logo, "Back to tests",
// avatar) and the card centred; phone: a 60px bar (44px back button, logo, avatar) and the card at the top.
import Link from "next/link";
import { useAuthHydrated, useAuthStore } from "@/stores/auth.store";
import { Avatar } from "@/components/shell/avatar";
import { cn } from "@/lib/utils";
import { StateIco, type StateTone } from "./states";
import type { StateIconName } from "./state-icons";

function Logo({ width = 139 }: { width?: number }) {
  return (
    <span role="img" aria-label="IIT-PULSE" className="relative block h-[27px] overflow-hidden" style={{ width }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- the logo is a fixed, unchanged PNG cropped by CSS */}
      <img src="/iitpulse-logo.png" alt="" className="absolute top-[-7px] left-0 h-[44px] w-auto max-w-none" decoding="async" />
    </span>
  );
}

export function GateFrame({
  children,
  back = { href: "/tests", label: "Back to tests" },
  banner,
  signedIn = true,
}: {
  children: React.ReactNode;
  /** null: no back link (Student-Submitted) */
  back?: { href: string; label: string } | null;
  /** a strip under the top bar (offline) */
  banner?: React.ReactNode;
  signedIn?: boolean;
}) {
  const hydrated = useAuthHydrated();
  const user = useAuthStore((s) => s.currentUser);
  const avatar =
    signedIn && hydrated && user ? (
      <Link prefetch={false} href="/profile" aria-label={user.name ? `${user.name}, profile` : "Your profile"} className="flex size-11 items-center justify-center rounded-full">
        <Avatar name={user.name} email={user.email} size={32} />
      </Link>
    ) : (
      <span style={{ width: 32 }} />
    );
  return (
    <div className="gate-page">
      <header className="gate-top">
        {back && (
          <Link prefetch={false} href={back.href} className="btn btn-ghost btn-icon md:hidden" aria-label={back.label} style={{ width: 44, height: 44, marginLeft: -10 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M19 12H5M11 6l-6 6 6 6" />
            </svg>
          </Link>
        )}
        <Link prefetch={false} href="/" aria-label="IIT-PULSE home" className="flex">
          <Logo />
        </Link>
        <div className="row" style={{ gap: 16 }}>
          {back && (
            <Link prefetch={false} href={back.href} className="sm row max-md:hidden" style={{ gap: 6, fontWeight: 600, color: "var(--muted)" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M19 12H5M11 6l-6 6 6 6" />
              </svg>
              {back.label}
            </Link>
          )}
          {avatar}
        </div>
      </header>
      {banner}
      <main className="gate-main">{children}</main>
    </div>
  );
}

/** The gate card: icon tile, title and body, then the screen's own parts, then the actions. */
export function GateCard({
  tone,
  icon,
  title,
  body,
  test,
  children,
  actions,
  stamp,
  labelledBy = "gate-title",
}: {
  tone: StateTone;
  icon: StateIconName;
  title: React.ReactNode;
  body?: React.ReactNode;
  /** the test strip: name and facts line (desktop) / short facts (phone) */
  test?: { name: string; meta: string; metaShort?: string } | null;
  children?: React.ReactNode;
  actions?: React.ReactNode;
  /** Student-Submitted: the "Submitted · 11:42 AM" stamp */
  stamp?: string;
  labelledBy?: string;
}) {
  return (
    <article className={cn("gate rise", stamp && "has-stamp")} aria-labelledby={labelledBy}>
      {stamp && (
        <span className="cl-stamp gate-stamp" style={{ "--rot": "-8deg", "--d": 500 } as React.CSSProperties}>
          {stamp}
        </span>
      )}
      <div className="gate-head">
        <StateIco tone={tone} icon={icon} />
        <div className="col" style={{ gap: 6, minWidth: 0 }}>
          <h1 id={labelledBy} className="h2 gate-h" style={{ margin: 0 }}>
            {title}
          </h1>
          {body && <p className="body muted gate-body" style={{ margin: 0, textWrap: "pretty" }}>{body}</p>}
        </div>
      </div>
      {test && (
        <div className="tstrip">
          <span className="sm" style={{ fontWeight: 600 }}>
            {test.name}
          </span>
          <span className="xs muted max-md:hidden">{test.meta}</span>
          <span className="xs muted md:hidden">{test.metaShort ?? test.meta}</span>
        </div>
      )}
      {children}
      {actions && <div className="gate-acts">{actions}</div>}
    </article>
  );
}
