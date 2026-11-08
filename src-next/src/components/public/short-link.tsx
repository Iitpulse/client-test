"use client";

// Student-ShortLink (batch 9, owner approved v246; rule 9): a student's SMS link (`iitpulse.in/s/<code>`) that has
// expired or does not work, opened while signed out: one action, Sign in. Names only the kind of link (class, test,
// result report), never its title or time. A student who is signed in skips this page: the link opens directly.
// The gateway redirects an expired link here as /link-expired?what=class|test|result (api-users docs/sms-api.md §7
// v1.1) and an unknown code to /link-invalid (the same page, invalid state). The expired redirect does not name the
// target (backend gap), so a signed-in student goes to the list it belongs to (or to `next` when the API sends one).
// Parents' links never come here (they open /parent-reports).
import { useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { safeNext } from "@/lib/auth-api";
import { useAuthHydrated, useAuthStore } from "@/stores/auth.store";
import { PublicTop } from "@/components/public/public-top";

type Kind = "class" | "test" | "result";
const COPY: Record<Kind, { what: string; body: string; short: string }> = {
  class: { what: "Link to a class", body: "Links in our SMS work for 62 days. The class is still in your account: sign in and it opens.", short: "SMS links work for 62 days. Sign in and the class opens." },
  test: { what: "Link to a test", body: "Links in our SMS work for 62 days. Sign in to see the test in Tests.", short: "SMS links work for 62 days. Sign in to see the test." },
  result: { what: "Link to a result report", body: "Report links work for 30 days. Your result and its PDF are always in your account after you sign in.", short: "Report links work for 30 days. Sign in to download it again." },
};

const LIST: Record<Kind, string> = { class: "/classes", test: "/tests", result: "/tests?tab=completed" };

/** /link-expired, and /link-invalid (invalid: no `what`). */
export function ShortLink({ invalid = false }: { invalid?: boolean }) {
  const sp = useSearchParams();
  const router = useRouter();
  const hydrated = useAuthHydrated();
  const checkAuth = useAuthStore((s) => s.checkAuth);
  const k = invalid ? null : (sp.get("what") ?? sp.get("kind"));
  const kind: Kind | null = k === "class" || k === "test" || k === "result" ? k : null;
  const rawNext = sp.get("next");
  const next = kind ? (rawNext ? safeNext(rawNext, LIST[kind]) : LIST[kind]) : "";
  const signedIn = hydrated && checkAuth();

  // Signed in: open the link's page directly (an expired link still names its target)
  useEffect(() => {
    if (signedIn && kind && next) router.replace(next);
  }, [signedIn, kind, next, router]);

  if (signedIn && kind && next) return null;
  const c = kind ? COPY[kind] : null;
  const title = c ? "This link has expired" : "This link doesn't work";
  const body = c ? c.body : "It may be cut short or mistyped. Sign in to find what you were looking for in the app.";
  const short = c ? c.short : "It may be cut short or mistyped. Sign in to find it in the app.";
  const action = signedIn ? { href: "/", label: "Go to Home" } : { href: next ? `/login?next=${encodeURIComponent(next)}` : "/login", label: "Sign in" };

  return (
    <div className="flex min-h-dvh flex-col">
      <PublicTop />
      <main className="col flex-1 items-center justify-center p-5 md:p-8">
        <div className="pub-ctr rise w-full max-w-[460px]" role="status">
          <span className="pub-ico size-[46px] md:size-[52px] md:rounded-2xl" aria-hidden="true">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" focusable="false">
              <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" />
              <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
              <path d={c ? "M19 19l2 2" : "M3 3l18 18"} />
            </svg>
          </span>
          <h1 className="h2 m-0 max-md:text-[22px]">{title}</h1>
          {c && <span className="pub-what">{c.what}</span>}
          <p className="body muted m-0 max-md:hidden" style={{ textWrap: "pretty" }}>
            {body}
          </p>
          <p className="sm muted m-0 md:hidden">{short}</p>
          <Link href={action.href} className="btn btn-lg btn-primary max-md:w-full">
            {action.label}
          </Link>
        </div>
      </main>
    </div>
  );
}
