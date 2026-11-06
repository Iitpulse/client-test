/*
  Server side of tenant branding (proxy.ts and the /brand-theme route): host → the institute's public face, cached per
  process for 60 s (a failed lookup keeps the last good answer for up to 10 minutes, else IIT-PULSE's default).
*/
import { deriveTenantTheme, tenantCss } from "@iitpulse/ui/tenant";
import { BRAND_COOKIE, DEFAULT_TENANT_ID, type BrandCookie } from "./brand-shared";

export { BRAND_COOKIE };

export interface PublicTenant {
  id: string;
  displayName: string;
  status: "active" | "suspended";
  branding: { version: number; brandName: string; logoUrl: string | null; iconUrl?: string | null; primary: string; accent: string };
}

const GATEWAY = (process.env.API_GATEWAY_INTERNAL || process.env.NEXT_PUBLIC_API_GATEWAY || "http://localhost:8000").replace(/\/+$/, "");
const TTL = 60_000;
const STALE = 600_000;
const cache = new Map<string, { at: number; tenant: PublicTenant | null }>();

export function normaliseHost(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let h = raw.split(",")[0]!.trim().toLowerCase();
  if (h.endsWith(":80") || h.endsWith(":443")) h = h.slice(0, h.lastIndexOf(":"));
  return /^[a-z0-9.-]{1,253}(:[0-9]{1,5})?$/.test(h) ? h : null;
}

/** The institute for a host, or null for IIT-PULSE's default (unknown host, platform down, no platform yet). */
export async function tenantForHost(host: string | null): Promise<PublicTenant | null> {
  if (!host) return null;
  const hit = cache.get(host);
  const now = Date.now();
  if (hit && now - hit.at < TTL) return hit.tenant;
  try {
    const r = await fetch(`${GATEWAY}/platform/public/tenant?host=${encodeURIComponent(host)}`, { signal: AbortSignal.timeout(1500), cache: "no-store" });
    if (r.status === 404) {
      cache.set(host, { at: now, tenant: null });
      return null;
    }
    if (!r.ok) throw new Error(`platform ${r.status}`);
    const j = (await r.json()) as { tenant?: PublicTenant };
    const tenant = j.tenant && typeof j.tenant.id === "string" ? j.tenant : null;
    cache.set(host, { at: now, tenant });
    return tenant;
  } catch {
    if (hit && now - hit.at < STALE) return hit.tenant;
    return null;
  }
}

/** The theme for a tenant's colours, or null when they are IIT-PULSE's own. */
export function themeFor(t: PublicTenant): { css: string; isDefault: boolean } {
  try {
    const theme = deriveTenantTheme({ primary: t.branding.primary, accent: t.branding.accent });
    // :root:root wins over the design system's :root tokens whatever order the stylesheets load in
    return { css: theme.isDefault ? "" : tenantCss(theme, ":root:root"), isDefault: theme.isDefault };
  } catch {
    return { css: "", isDefault: true };
  }
}

/** The cookie value (JSON; Next URI-encodes it on the way out) for a host's brand, or null for IIT-PULSE's unchanged look (the cookie is then removed). */
export function brandCookieFor(t: PublicTenant | null, host: string): string | null {
  if (!t) return null;
  const whiteLabel = t.id !== DEFAULT_TENANT_ID;
  const { isDefault } = themeFor(t);
  const logo = t.branding.logoUrl ?? null;
  if (!whiteLabel && isDefault && !logo && t.status !== "suspended") return null;
  const c: BrandCookie = {
    t: t.id,
    v: t.branding.version,
    n: t.branding.brandName || t.displayName,
    l: logo,
    i: t.branding.iconUrl ?? null,
    s: t.status === "suspended" ? "suspended" : "active",
    c: isDefault ? null : `/brand-theme/${t.id}/${t.branding.version}.css`,
    w: whiteLabel,
    h: host,
  };
  return JSON.stringify(c); // Next encodes cookie values (encodeURIComponent); the boot script decodes
}
