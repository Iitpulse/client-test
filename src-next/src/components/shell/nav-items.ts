// Student navigation: StudentNav (desktop) and PhoneTabBar both show Home, Tests, Progress, Revision, Doubts
// (Revision is its own item since batch 7, owner 6 Nov 2026; canvas v180 StudentNav / Phone-Revision).
// The shell's links do not prefetch (prefetch={false}): on
// a slow phone, prefetching every tab right after load competes with the screen's own data (Home's LCP); a tab
// fetches its small RSC payload when tapped.
export type NavKey = "home" | "tests" | "progress" | "revision" | "doubts";

export const NAV_ITEMS: Array<{ key: NavKey; href: string; label: string; desktop: boolean }> = [
  { key: "home", href: "/", label: "Home", desktop: true },
  { key: "tests", href: "/tests", label: "Tests", desktop: true },
  { key: "progress", href: "/progress", label: "Progress", desktop: true },
  { key: "revision", href: "/revision", label: "Revision", desktop: true },
  { key: "doubts", href: "/doubts", label: "Doubts", desktop: true },
];

export function activeNav(pathname: string): NavKey | null {
  if (pathname === "/") return "home";
  if (pathname.startsWith("/tests") || pathname.startsWith("/results") || pathname === "/result") return "tests";
  if (pathname.startsWith("/progress") || pathname.startsWith("/practice")) return "progress";
  if (pathname.startsWith("/revision")) return "revision";
  if (pathname.startsWith("/doubts")) return "doubts";
  return null;
}
