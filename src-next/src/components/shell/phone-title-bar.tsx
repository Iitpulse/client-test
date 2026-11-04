"use client";

import Link from "next/link";
import { InkUnderline } from "@iitpulse/ui";
import { useAuthHydrated, useAuthStore } from "@/stores/auth.store";
import { Avatar } from "./avatar";

/**
 * The sticky title header of Phone-Progress and the Doubts tab (phones only): the page title underlined in blue ink
 * and the avatar, which opens /profile (as Phone-Home's header does).
 */
export function PhoneTitleBar({ title, children }: { title: string; children?: React.ReactNode }) {
  const hydrated = useAuthHydrated();
  const user = useAuthStore((s) => s.currentUser);
  const name = hydrated ? user?.name : undefined;
  const email = hydrated ? user?.email : undefined;
  return (
    <header className="sticky top-0 z-(--z-topbar) col gap-3 border-b border-line bg-white/90 px-4 pt-[calc(14px+env(safe-area-inset-top))] pb-3 backdrop-blur-md md:hidden">
      <div className="row between gap-3">
        <h1 className="h2 text-[24px]">
          <InkUnderline delay={450}>{title}</InkUnderline>
        </h1>
        <Link prefetch={false} href="/profile" aria-label={name ? `${name}, profile` : "Your profile"} className="-mr-1.5 flex size-11 items-center justify-center rounded-full">
          <Avatar name={name} email={email} size={32} />
        </Link>
      </div>
      {children}
    </header>
  );
}
