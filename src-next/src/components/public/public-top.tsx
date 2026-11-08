"use client";

import { LogoMark } from "@iitpulse/ui";
import { BrandLogo } from "@/components/brand/brand-logo";
import { LOGO_WEBP } from "@/components/shell/phone-header";

/** The bare top bar of the public pages (Parent-Reports, Student-ShortLink): the institute's logo, no menu. */
export function PublicTop({ right }: { right?: React.ReactNode }) {
  return (
    <header className="pub-top">
      <BrandLogo size="sm" fallback={<LogoMark src={LOGO_WEBP} />} />
      {right}
    </header>
  );
}
