/*
  The institute's theme stylesheet (M7b): /brand-theme/<tenantId>/<version>.css → `:root:root { --navy: …; … }` from
  @iitpulse/ui deriveTenantTheme (WCAG AA kept: too-light colours are darkened). Served for the page's own host only
  (a host shows only its own institute's theme). The current version is cached for a year (the version is in the URL);
  an old version answers the current theme, cached for a minute.
*/
import { normaliseHost, tenantForHost, themeFor } from "@/lib/brand-server";

export async function GET(request: Request, ctx: { params: Promise<{ tenant: string; file: string }> }) {
  const { tenant, file } = await ctx.params;
  const m = /^(\d{1,9})\.css$/.exec(file);
  const host = normaliseHost(request.headers.get("x-forwarded-host") ?? request.headers.get("host"));
  const t = m && /^tnt_[a-z0-9_]{2,59}$/.test(tenant) ? await tenantForHost(host) : null;
  if (!m || !t || t.id !== tenant) {
    return new Response("/* no theme */", { status: 404, headers: { "content-type": "text/css; charset=utf-8", "cache-control": "public, max-age=60" } });
  }
  const { css } = themeFor(t);
  const current = Number(m[1]) === t.branding.version;
  return new Response(css || "/* default theme */", {
    headers: {
      "content-type": "text/css; charset=utf-8",
      "cache-control": current ? "public, max-age=31536000, immutable" : "public, max-age=60",
      "x-content-type-options": "nosniff",
      vary: "host",
    },
  });
}
