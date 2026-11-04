"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthHydrated, useAuthStore } from "@/stores/auth.store";
import { studentApi } from "@/lib/student-api";
import { cn } from "@/lib/utils";
import { Avatar } from "./avatar";
import { PhoneHeader } from "./phone-header";
import { PhoneTabBar } from "./phone-tabbar";
import { StudentNav } from "./student-nav";

/**
 * What a phone (below 768px) shows around a screen, as the Phone-* boards draw it:
 * - "full": Phone-Home's compact header (logo + avatar) and the PhoneTabBar (Home, Tests, Progress, Doubts).
 * - "tabs": the screen draws its own sticky header (Phone-Tests: the title and the status tabs; Phone-Progress and
 *   the Doubts list: the title and the avatar, PhoneTitleBar); tab bar stays.
 * - "none": a drill-in screen with its own back header and no tab bar (Phone-Result, Phone-Review, Phone-Doubt,
 *   a practice set).
 */
type PhoneChrome = "full" | "tabs" | "none";
function phoneChrome(pathname: string): PhoneChrome {
  if (pathname.startsWith("/results/") || pathname.startsWith("/practice/")) return "none";
  if (pathname === "/tests" || pathname === "/progress" || pathname === "/doubts") return "tabs";
  return "full";
}

/**
 * The signed-in student shell. Desktop (768px and up): StudentNav and a 1136px column with the red margin rule
 * 20px to its left. Phone: see phoneChrome(); no margin rule. 100dvh, so the browser's own bars never hide the
 * tab bar. Signed-out visitors are sent to /login.
 */
export function StudentShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const chrome = phoneChrome(usePathname());
  const hydrated = useAuthHydrated();
  const { currentUser, checkAuth, setUserName } = useAuthStore();
  const askedName = useRef(false);

  useEffect(() => {
    if (!hydrated) return;
    if (!checkAuth()) router.replace("/login");
  }, [hydrated, checkAuth, router]);

  // The session token carries no name: fetch it once for the avatar (sign-in links already supply it).
  useEffect(() => {
    if (!hydrated || !currentUser || currentUser.name || askedName.current) return;
    askedName.current = true;
    // Not urgent (Home's own response carries the name too): ask a moment after load, off the first paint.
    const ask = () =>
      studentApi
        .me()
        .then((me) => {
          if (me?.name) setUserName(me.name);
        })
        .catch(() => {});
    setTimeout(ask, 1500); // no cleanup: the ref above makes it once per session, also under React's dev double run
  }, [hydrated, currentUser, setUserName]);

  const name = hydrated ? currentUser?.name : undefined;
  const email = hydrated ? currentUser?.email : undefined;

  return (
    <div className="flex min-h-dvh flex-col">
      <span className="cl-margin max-md:hidden" aria-hidden="true" style={{ left: "calc(50% - 588px)" }} />
      <StudentNav name={name} email={email} />
      {chrome === "full" && (
        <PhoneHeader
          className="md:hidden"
          homeHref="/"
          right={
            <Link prefetch={false} href="/profile" aria-label={name ? `${name}, profile` : "Your profile"} className="-mr-1.5 flex size-11 items-center justify-center rounded-full">
              <Avatar name={name} email={email} size={32} />
            </Link>
          }
        />
      )}
      <main
        className={cn(
          "mx-auto w-full max-w-[1200px] flex-1 px-8 pt-8 pb-16",
          chrome === "full" && "max-md:px-4 max-md:pt-4",
          chrome !== "full" && "max-md:px-0 max-md:pt-0",
          chrome === "none" ? "max-md:pb-0" : "max-md:pb-[calc(92px+env(safe-area-inset-bottom))]"
        )}
      >
        {children}
      </main>
      {chrome !== "none" && <PhoneTabBar />}
    </div>
  );
}
