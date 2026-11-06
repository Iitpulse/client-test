import type { Metadata } from "next";
import { LegalDoc } from "@/components/student/legal-doc";
import { TERMS_MD } from "@/content/legal";

export const metadata: Metadata = { title: "Terms of Use · IIT-PULSE" };

// Student-Legal (batch 7): public, no sign-in. Linked from sign-up, the sign-in footers (both apps) and the guardian page.
export default function TermsPage() {
  return <LegalDoc md={TERMS_MD} other={{ href: "/privacy", label: "Privacy Policy" }} />;
}
