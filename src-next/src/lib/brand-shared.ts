/* Shared by lib/brand.ts (browser) and lib/brand-server.ts (proxy.ts, /brand-theme). */
export const BRAND_COOKIE = "iitp_brand";
export const DEFAULT_TENANT_ID = "tnt_iitpulse";

/** Compact cookie shape (short keys: it rides on every request to the app host). */
export interface BrandCookie {
  /** tenant id */
  t: string;
  /** published branding version (0 = default) */
  v: number;
  /** brand name ("Sankalp Academy") */
  n: string;
  /** logo URL (absolute) or null */
  l: string | null;
  /** square icon URL or null */
  i: string | null;
  /** tenant status */
  s: "active" | "suspended";
  /** theme stylesheet path, null when the colours are IIT-PULSE's */
  c: string | null;
  /** white-labelled: another institute than IIT-PULSE */
  w: boolean;
  /** the host it was resolved for (sign-in footer: "sankalp.iitpulse.in · Powered by IIT-PULSE") */
  h: string;
}


const THEME_PATH = /^\/brand-theme\/tnt_[a-z0-9_]{2,59}\/\d{1,9}\.css$/;

/**
 * The <head> script (runs before the first paint; see the header comment). Self-contained and defensive: a bad
 * cookie changes nothing. The paths it may load are checked against THEME_PATH.
 */
export function brandBootScript(): string {
  return `(function(){try{var m=document.cookie.match(/(?:^|; )${BRAND_COOKIE}=([^;]*)/);if(!m)return;var b=JSON.parse(decodeURIComponent(m[1]));if(!b||typeof b.t!=="string")return;var h=document.documentElement;if(b.w||b.l)h.setAttribute("data-brand",b.t);if(typeof b.c==="string"&&${THEME_PATH.toString()}.test(b.c))document.write('<link rel="stylesheet" href="'+b.c+'" data-iitp-brand="">');}catch(e){}})();`;
}

