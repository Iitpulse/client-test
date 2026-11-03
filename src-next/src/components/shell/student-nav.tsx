"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoMark } from "@iitpulse/ui";
import { cn } from "@/lib/utils";
import { Avatar } from "./avatar";
import { NAV_ITEMS, activeNav } from "./nav-items";

/**
 * StudentNav board: the desktop top bar (768px and up). Logo, Home / Tests / Progress (the active one underlined
 * in blue ink, drawn once, never boxed), and the avatar with the student's name, which opens /profile.
 * The board's notification bell is left out until notifications exist (M4); it would only show a fake count.
 */
export function StudentNav({ name, email }: { name?: string; email?: string }) {
  const active = activeNav(usePathname());
  return (
    <nav className="topbar max-md:hidden" aria-label="Main">
      <div className="row between mx-auto h-[72px] max-w-[1200px] gap-6 px-8">
        <div className="row gap-9">
          <Link href="/" aria-label="IIT-PULSE home" className="flex">
            <LogoMark />
          </Link>
          <div className="row gap-1">
            {NAV_ITEMS.filter((i) => i.desktop).map(({ key, href, label }) => {
              const on = key === active;
              return (
                <Link key={key} href={href} className={cn("btn btn-ghost btn-sm nav-a", on && "on")} aria-current={on ? "page" : undefined}>
                  {label}
                  <svg className="cl-ink nav-ink" viewBox="0 0 60 8" preserveAspectRatio="none" aria-hidden="true" focusable="false" style={{ "--d": 250 } as React.CSSProperties}>
                    <path pathLength={1} d="M2 5.2C14 3.4 27 3 40 3.9S54 5.6 58 4.4" />
                  </svg>
                </Link>
              );
            })}
          </div>
        </div>
        <Link
          href="/profile"
          className="row gap-2.5 rounded-full py-1 pr-1.5 pl-1 text-ink hover:bg-brand-50 hover:text-ink"
          aria-label={name ? `${name}, profile` : "Your profile"}
        >
          <Avatar name={name} email={email} />
          {name && <span className="sm font-semibold">{name}</span>}
        </Link>
      </div>
    </nav>
  );
}
