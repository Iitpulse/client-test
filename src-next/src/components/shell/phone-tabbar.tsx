"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS, activeNav, type NavKey } from "./nav-items";
import { DoubtsIcon, HomeIcon, ProgressIcon, TestsIcon } from "./icons";

const ICONS: Record<NavKey, () => React.ReactElement> = { home: HomeIcon, tests: TestsIcon, progress: ProgressIcon, doubts: DoubtsIcon };

/**
 * PhoneTabBar (drawn in the Phone-* boards): fixed to the bottom below 768px, safe-area padded, four 48px+
 * targets. The active tab is navy with the 3px bar on top (.tb.on from @iitpulse/ui).
 */
export function PhoneTabBar() {
  const active = activeNav(usePathname());
  return (
    <nav className="phone-tabbar md:hidden" aria-label="Tabs">
      {NAV_ITEMS.map(({ key, href, label }) => {
        const Icon = ICONS[key];
        const on = key === active;
        return (
          <Link key={key} href={href} className={on ? "tb on" : "tb"} aria-current={on ? "page" : undefined}>
            <Icon />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
