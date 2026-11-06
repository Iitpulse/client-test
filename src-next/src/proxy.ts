/*
  M7b tenant theming (Next 16 proxy). For page navigations: resolve the host to its institute (lib/brand-server, cached)
  and keep the host-only `iitp_brand` cookie in step, so the <head> boot script (lib/brand-shared brandBootScript) can
  theme the very first paint. IIT-PULSE's own look has no cookie (it is removed if present). Never on static files,
  the theme stylesheet or the frozen exam screens (/instructions, /test, /preview): those stay exactly as they are.
*/
import { NextResponse, type NextRequest } from "next/server";
import { BRAND_COOKIE, brandCookieFor, normaliseHost, tenantForHost } from "@/lib/brand-server";

export async function proxy(request: NextRequest) {
  const res = NextResponse.next();
  const path = request.nextUrl.pathname;
  if (path === "/test" || path.startsWith("/test/") || path.startsWith("/instructions") || path.startsWith("/preview/")) return res;
  if (request.method !== "GET" || request.headers.get("purpose") === "prefetch" || request.headers.get("next-router-prefetch")) return res;
  const host = normaliseHost(request.headers.get("x-forwarded-host") ?? request.headers.get("host"));
  if (!host) return res;
  const tenant = await tenantForHost(host);
  const value = brandCookieFor(tenant, host);
  const current = request.cookies.get(BRAND_COOKIE)?.value ?? null;
  if (value === current) return res;
  if (value) {
    // host-only (no Domain), readable by the boot script; a day long, refreshed on every page load
    res.cookies.set(BRAND_COOKIE, value, { path: "/", maxAge: 86_400, sameSite: "lax", secure: request.nextUrl.protocol === "https:", httpOnly: false });
  } else if (current !== null) {
    res.cookies.delete(BRAND_COOKIE);
  }
  return res;
}

export const config = {
  // pages only: not _next assets, files with an extension or the theme route (the exam screens return early above)
  matcher: ["/((?!_next/|brand-theme/|.*\\.[A-Za-z0-9]+$).*)"],
};
