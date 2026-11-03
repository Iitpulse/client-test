// Student navigation. Desktop (StudentNav board) shows Home, Tests, Progress; the phone tab bar adds Doubts.
// Home becomes Student-Home in M2 (today "/" forwards to /tests); Progress and Doubts show a "coming soon" page until M4.
export type NavKey = "home" | "tests" | "progress" | "doubts";

export const NAV_ITEMS: Array<{ key: NavKey; href: string; label: string; desktop: boolean }> = [
  { key: "home", href: "/", label: "Home", desktop: true },
  { key: "tests", href: "/tests", label: "Tests", desktop: true },
  { key: "progress", href: "/progress", label: "Progress", desktop: true },
  { key: "doubts", href: "/doubts", label: "Doubts", desktop: false },
];

export function activeNav(pathname: string): NavKey | null {
  if (pathname === "/") return "home";
  if (pathname.startsWith("/tests") || pathname.startsWith("/results") || pathname === "/result") return "tests";
  if (pathname.startsWith("/progress")) return "progress";
  if (pathname.startsWith("/doubts")) return "doubts";
  return null;
}
