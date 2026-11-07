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
const cache = new Map<string, { at: number; tenant: PublicTenant | null; unknown: boolean }>();

export function normaliseHost(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let h = raw.split(",")[0]!.trim().toLowerCase();
  if (h.endsWith(":80") || h.endsWith(":443")) h = h.slice(0, h.lastIndexOf(":"));
  return /^[a-z0-9.-]{1,253}(:[0-9]{1,5})?$/.test(h) ? h : null;
}

/**
 * Hosts only an institute can own (`<slug>.iitpulse.in` behind the wildcard DNS record, `<slug>.localhost` in dev). When
 * the platform says no institute uses one (unregistered, or the institute is archived), the app shows a plain
 * "Institute not found" page instead of IIT-PULSE's default. Other hosts (localhost, IPs, health checks) keep the default.
 * Override with INSTITUTE_HOST_SUFFIXES (runtime, comma list).
 */
const INSTITUTE_SUFFIXES = (process.env.INSTITUTE_HOST_SUFFIXES ?? ".iitpulse.in,.localhost")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter((s) => s.startsWith("."));

export function isInstituteHost(host: string): boolean {
  const name = host.replace(/:[0-9]+$/, "");
  return INSTITUTE_SUFFIXES.some((s) => name.endsWith(s) && name.length > s.length);
}

/**
 * The host's institute, or null for IIT-PULSE's default (platform down, no platform yet). `unknown` is true only when
 * the platform answered 404 TENANT_NOT_FOUND (no institute uses this address).
 */
export async function lookupHost(host: string | null): Promise<{ tenant: PublicTenant | null; unknown: boolean }> {
  if (!host) return { tenant: null, unknown: false };
  const hit = cache.get(host);
  const now = Date.now();
  if (hit && now - hit.at < TTL) return { tenant: hit.tenant, unknown: hit.unknown };
  try {
    const r = await fetch(`${GATEWAY}/platform/public/tenant?host=${encodeURIComponent(host)}`, { signal: AbortSignal.timeout(1500), cache: "no-store" });
    if (r.status === 404) {
      const j = (await r.json().catch(() => null)) as { code?: string } | null;
      // only the platform's own answer means "no institute here" (an old gateway without /platform also says 404)
      const unknown = j?.code === "TENANT_NOT_FOUND";
      cache.set(host, { at: now, tenant: null, unknown });
      return { tenant: null, unknown };
    }
    if (!r.ok) throw new Error(`platform ${r.status}`);
    const j = (await r.json()) as { tenant?: PublicTenant };
    const tenant = j.tenant && typeof j.tenant.id === "string" ? j.tenant : null;
    cache.set(host, { at: now, tenant, unknown: false });
    return { tenant, unknown: false };
  } catch {
    if (hit && now - hit.at < STALE) return { tenant: hit.tenant, unknown: hit.unknown };
    return { tenant: null, unknown: false };
  }
}

/** The institute for a host, or null for IIT-PULSE's default (unknown host, platform down, no platform yet). */
export async function tenantForHost(host: string | null): Promise<PublicTenant | null> {
  return (await lookupHost(host)).tenant;
}

/** Without a request: true when the last answer for this host (within the stale window) was "no institute here" */
export function knownUnknown(host: string): boolean {
  const hit = cache.get(host);
  return !!hit && hit.unknown && Date.now() - hit.at < STALE;
}

/** The plain page for an address no institute uses: no app, no sign-in, no brand, not indexed */
export function instituteNotFoundResponse(): Response {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, nofollow"><title>Institute not found</title><style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;background:#f6f6f8;color:#1f2330}main{max-width:420px;padding:24px 16px;text-align:center}h1{font-size:22px;margin:0 0 8px}p{margin:0;color:#5a5f70;line-height:1.5}@media (prefers-color-scheme:dark){body{background:#14151b;color:#e8e9ee}p{color:#a3a7b5}}</style></head><body><main><h1>Institute not found</h1><p>No institute uses this address. Check the link you were given.</p></main></body></html>`;
  return new Response(html, {
    status: 404,
    headers: { "content-type": "text/html; charset=utf-8", "x-robots-tag": "noindex, nofollow", "cache-control": "no-store", "set-cookie": `${BRAND_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax` },
  });
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
