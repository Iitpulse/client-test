import { Suspense } from "react";
import type { Metadata } from "next";
import { SignupFlow } from "@/components/auth/signup-flow";
import { LegalFooter } from "@/components/auth/legal-footer";

export const metadata: Metadata = { title: "Sign up · IIT-PULSE" };

// Student-Signup board: email code → password + promo → about you; then "Complete your profile" over Home.
// useSearchParams (?promo=, ?next=) needs a Suspense boundary, or `next build` cannot prerender the page.
export default function SignupPage() {
  return (
    <>
      <Suspense fallback={null}>
        <SignupFlow />
      </Suspense>
      <LegalFooter className="pb-6" />
    </>
  );
}
