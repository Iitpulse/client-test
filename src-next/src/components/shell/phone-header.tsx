import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Phone-Home's compact header: 60px, the logo cropped to 139x27 (the unchanged PNG, tagline hidden by CSS),
 * and on signed-in screens the avatar, which opens /profile. Shown below 768px; sign-in screens use it without
 * the avatar (they collapse to one column with this header and no tab bar).
 */
export function PhoneHeader({ right, homeHref, className }: { right?: ReactNode; homeHref?: string; className?: string }) {
  const logo = (
    <span role="img" aria-label="IIT-PULSE" className="relative block h-[27px] w-[139px] overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element -- the logo is a fixed, unchanged PNG cropped by CSS */}
      <img src="/iitpulse-logo.png" alt="" className="absolute top-[-7px] left-0 h-[44px] w-auto max-w-none" decoding="async" />
    </span>
  );
  return (
    <header
      className={cn(
        "sticky top-0 z-(--z-topbar) flex h-[60px] flex-none items-center justify-between border-b border-line bg-white/90 px-4 backdrop-blur-md",
        "pt-[env(safe-area-inset-top)] box-content",
        className
      )}
    >
      {homeHref ? (
        <Link prefetch={false} href={homeHref} aria-label="IIT-PULSE home" className="-m-2 flex min-h-11 items-center p-2">
          {logo}
        </Link>
      ) : (
        logo
      )}
      {right}
    </header>
  );
}
