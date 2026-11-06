"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { useBrand, type Brand } from "@/lib/brand";
import { cn } from "@/lib/utils";

/** "Sankalp Academy" → "SA" (the square badge when an institute has no icon). */
export function brandInitials(name: string): string {
  const words = name.replace(/[^\p{L}\p{N} ]/gu, " ").split(/\s+/).filter(Boolean);
  return ((words[0]?.[0] ?? "") + (words[1]?.[0] ?? words[0]?.[1] ?? "")).toUpperCase() || "•";
}

/** IIT-PULSE's own look: no institute logo, no other institute. */
export const usesDefaultLogo = (b: Brand) => b.isDefault || (!b.whiteLabel && !b.logoUrl);

/**
 * The institute's logo where the IIT-PULSE logo was (board Student-Whitelabel). `fallback` is the unchanged IIT-PULSE
 * markup (LogoMark or the cropped PNG), drawn for IIT-PULSE and hidden by `html[data-brand]` before React swaps the
 * institute's in, so another institute never flashes IIT-PULSE's logo. Without an uploaded logo: the square icon (or
 * initials in the brand colour) and the institute's name.
 */
export function BrandLogo({ fallback, size = "md", onDark = false, className }: { fallback: ReactNode; size?: "sm" | "md" | "lg"; onDark?: boolean; className?: string }) {
  const b = useBrand();
  if (usesDefaultLogo(b)) return <span className="brand-default">{fallback}</span>;
  if (b.logoUrl) {
    // eslint-disable-next-line @next/next/no-img-element -- the institute's uploaded logo (any size, from the platform)
    return <img src={b.logoUrl} alt={b.name} className={cn("brand-logo", size, className)} decoding="async" />;
  }
  return (
    <span className={cn("brand-wordmark", size, onDark && "on-dark", className)} aria-label={b.name} role="img">
      {b.iconUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- the institute's uploaded square icon
        <img src={b.iconUrl} alt="" className="brand-icon" decoding="async" />
      ) : (
        <span className="brand-initials" aria-hidden="true">
          {brandInitials(b.name)}
        </span>
      )}
      <span className="brand-name" aria-hidden="true">
        {b.name}
      </span>
    </span>
  );
}

/** Content only IIT-PULSE's own pages show (its tagline, its badges); hidden for a white-labelled institute. */
export function DefaultBrandOnly({ children }: { children: ReactNode }) {
  const b = useBrand();
  if (b.whiteLabel) return null;
  return <span className="brand-default">{children}</span>;
}

/** "sankalp.iitpulse.in · Powered by IIT-PULSE" on a white-labelled institute's sign-in pages. */
export function PoweredBy({ className }: { className?: string }) {
  const b = useBrand();
  if (!b.whiteLabel) return null;
  return <p className={cn("m-0", className)}>{b.host ? `${b.host} · ` : ""}Powered by IIT-PULSE</p>;
}

/** The institute's name and one line about the app, on a white-labelled institute's sign-in board. */
export function WhiteLabelIntro({ part, className }: { part: "name" | "about"; className?: string }) {
  const b = useBrand();
  if (!b.whiteLabel) return null;
  return part === "name" ? <p className={className}>{b.name}</p> : <p className={className}>Mock tests, results and AI review for {b.name} students.</p>;
}

/** Tab title and favicon for a white-labelled institute (after hydration; IIT-PULSE's stay as they are). */
export function BrandEffects() {
  const b = useBrand();
  const path = usePathname();
  useEffect(() => {
    if (b.isDefault) return;
    if (b.iconUrl) {
      for (const l of document.querySelectorAll<HTMLLinkElement>('link[rel~="icon"]')) l.href = b.iconUrl;
      if (!document.querySelector('link[rel~="icon"]')) {
        const l = document.createElement("link");
        l.rel = "icon";
        l.href = b.iconUrl;
        document.head.appendChild(l);
      }
    }
    if (b.whiteLabel) {
      const fix = () => {
        if (document.title.includes("IIT-PULSE")) document.title = document.title.replaceAll("IIT-PULSE", b.name);
      };
      fix();
      const t = setTimeout(fix, 300); // pages that set their title after mount
      return () => clearTimeout(t);
    }
  }, [b, path]);
  return null;
}
