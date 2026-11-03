"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuthHydrated, useAuthStore } from "@/stores";
import { api } from "@/lib/api";
import { Avatar } from "./avatar";
import { PhoneHeader } from "./phone-header";
import { PhoneTabBar } from "./phone-tabbar";
import { StudentNav } from "./student-nav";

/**
 * The signed-in student shell. Desktop (768px and up): StudentNav and a 1136px column with the red margin rule
 * 20px to its left. Phone: Phone-Home's compact header and the fixed PhoneTabBar; no margin rule. 100dvh, so the
 * browser's own bars never hide the tab bar. Signed-out visitors are sent to /login.
 */
export function StudentShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
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
    api.auth
      .me()
      .then((res) => {
        const name = res.data?.data?.name;
        if (name) setUserName(name);
      })
      .catch(() => {});
  }, [hydrated, currentUser, setUserName]);

  const name = hydrated ? currentUser?.name : undefined;
  const email = hydrated ? currentUser?.email : undefined;

  return (
    <div className="flex min-h-dvh flex-col">
      <span className="cl-margin max-md:hidden" aria-hidden="true" style={{ left: "calc(50% - 588px)" }} />
      <StudentNav name={name} email={email} />
      <PhoneHeader
        className="md:hidden"
        homeHref="/"
        right={
          <Link href="/profile" aria-label={name ? `${name}, profile` : "Your profile"} className="-mr-1.5 flex size-11 items-center justify-center rounded-full">
            <Avatar name={name} email={email} size={32} />
          </Link>
        }
      />
      <main className="mx-auto w-full max-w-[1200px] flex-1 px-8 pt-8 pb-16 max-md:px-4 max-md:pt-4 max-md:pb-[calc(92px+env(safe-area-inset-bottom))]">
        {children}
      </main>
      <PhoneTabBar />
    </div>
  );
}
