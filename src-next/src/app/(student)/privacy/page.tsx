import type { Metadata } from "next";
import { LegalDoc } from "@/components/student/legal-doc";
import { PRIVACY_MD } from "@/content/legal";

export const metadata: Metadata = { title: "Privacy Policy · IIT-PULSE" };

// Student-Legal (batch 7): public, no sign-in.
export default function PrivacyPage() {
  return <LegalDoc md={PRIVACY_MD} other={{ href: "/terms", label: "Terms of Use" }} />;
}
