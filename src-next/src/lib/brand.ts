"use client";
/*
  Tenant branding in the browser (M7b; boards Student-Whitelabel, Admin-Branding; platform contract docs/m7a-api.md).

  proxy.ts resolves the page's host to its institute (platform `GET /public/tenant`) and leaves the result in the
  host-only cookie `iitp_brand`. The inline script from brandBootScript() runs in <head> before anything paints:
  it writes a <link> to the institute's theme CSS (/brand-theme/<tenant>/<version>.css, @iitpulse/ui deriveTenantTheme)
  so the first paint already has its colours, and marks <html data-brand> so the IIT-PULSE logo stays hidden until
  React swaps in the institute's. IIT-PULSE itself (the default brand) has no cookie: nothing changes for it.
  The frozen exam screens ((exam) layout) never load any of this.
*/
import { useSyncExternalStore } from "react";
import { API_GATEWAY } from "./student-api";
import { auth } from "./session";

import { BRAND_COOKIE, DEFAULT_TENANT_ID } from "./brand-shared";
export { BRAND_COOKIE, DEFAULT_TENANT_ID };
import type { BrandCookie } from "./brand-shared";
export type { BrandCookie };

export interface Brand {
  tenantId: string;
  version: number;
  name: string;
  logoUrl: string | null;
  iconUrl: string | null;
  suspended: boolean;
  whiteLabel: boolean;
  host: string | null;
  /** true for IIT-PULSE's own look (no cookie) */
  isDefault: boolean;
}

export const DEFAULT_BRAND: Brand = { tenantId: DEFAULT_TENANT_ID, version: 0, name: "IIT-PULSE", logoUrl: null, iconUrl: null, suspended: false, whiteLabel: false, host: null, isDefault: true };

const SAFE_URL = /^https?:\/\/[^\s"'<>]+$/;

export function brandFromCookie(raw: string | null | undefined): Brand {
  if (!raw) return DEFAULT_BRAND;
  try {
    const b = JSON.parse(decodeURIComponent(raw)) as Partial<BrandCookie>;
    if (!b || typeof b.t !== "string" || !/^tnt_[a-z0-9_]{2,59}$/.test(b.t)) return DEFAULT_BRAND;
    return {
      tenantId: b.t,
      version: typeof b.v === "number" ? b.v : 0,
      name: typeof b.n === "string" && b.n.trim() ? b.n.trim().slice(0, 80) : "IIT-PULSE",
      logoUrl: typeof b.l === "string" && SAFE_URL.test(b.l) ? b.l : null,
      iconUrl: typeof b.i === "string" && SAFE_URL.test(b.i) ? b.i : null,
      suspended: b.s === "suspended",
      whiteLabel: b.w === true,
      host: typeof b.h === "string" ? b.h.slice(0, 260) : null,
      isDefault: false,
    };
  } catch {
    return DEFAULT_BRAND;
  }
}

function readCookie(): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp(`(?:^|; )${BRAND_COOKIE}=([^;]*)`));
  return m ? m[1]! : null;
}

let cached: { raw: string | null; brand: Brand } | null = null;
function snapshot(): Brand {
  const raw = readCookie();
  if (!cached || cached.raw !== raw) cached = { raw, brand: brandFromCookie(raw) };
  return cached.brand;
}
const noop = () => () => {};

/** The page's brand. Server render and hydration use IIT-PULSE's; the institute's follows right after. */
export function useBrand(): Brand {
  return useSyncExternalStore(noop, snapshot, () => DEFAULT_BRAND);
}

/* ───────────────── institute state (banners; platform GET /tenant/state) ───────────────── */

export interface InstituteState {
  suspended: boolean;
  aiPaused: { features: string[]; labels: string[]; until: string | null } | null;
}

let stateCache: { at: number; token: string | null; p: Promise<InstituteState | null> } | null = null;

/** GET /platform/tenant/state for the signed-in student (cached 60 s; any failure = no notices). */
export function fetchInstituteState(): Promise<InstituteState | null> {
  const token = auth.getToken();
  if (!token) return Promise.resolve(null);
  if (stateCache && stateCache.token === token && Date.now() - stateCache.at < 60_000) return stateCache.p;
  const p = fetch(`${API_GATEWAY}/platform/tenant/state`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" })
    .then(async (r) => {
      const j = (await r.json().catch(() => null)) as { success?: boolean; code?: string; notices?: { suspended?: boolean; aiPaused?: InstituteState["aiPaused"] } } | null;
      if (r.status === 403 && j?.code === "TENANT_SUSPENDED") return { suspended: true, aiPaused: null };
      if (!r.ok || !j?.success) return null;
      return { suspended: !!j.notices?.suspended, aiPaused: j.notices?.aiPaused ?? null };
    })
    .catch(() => null);
  stateCache = { at: Date.now(), token, p };
  return p;
}
