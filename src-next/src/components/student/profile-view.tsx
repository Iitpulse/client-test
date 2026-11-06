"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Doodle, InkUnderline } from "@iitpulse/ui";
import { m4Api, m4Keys } from "@/lib/m4-api";
import { request, StudentApiError } from "@/lib/student-api";
import { useIsDesktop } from "@/lib/use-media";
import { useOnline } from "@/lib/use-online";
import { useAuthStore } from "@/stores/auth.store";
import type { StudentPreferences, StudentProfile, StudentProfilePatch } from "@/types/m4";
import type { LocationsResponse } from "@/types/m6-locations";
import { Avatar } from "@/components/shell/avatar";
import { Spinner } from "@/components/shell/icons";
import { fxKey, loadFixture, OfflineStrip, Skel, useFixture } from "./common";
import { ChevronLeftIcon } from "./icons";
import { sentence } from "./labels";
import { Sheet } from "./sheet";
import { GuardianConsentCard } from "./guardian-consent";
import { istTime, PageError } from "./states";

/**
 * /profile: Student-Profile (desktop): the settings nav (Profile, Preferences, Password, Sign out) beside the
 * blueboard hero and the cards. Phone-Profile (opened from the header avatar, so a back header and no tab bar):
 * a compact hero, then Profile / Preferences / Password as tabs showing one card at a time, Sign out last.
 * GET / PATCH /users/student/me, POST /users/student/me/password. City is a 44px searchable picker over
 * GET /users/meta/locations (a list under the field on desktop, a bottom sheet on phones). Preferences save on
 * change: "Setting saved", or the switch goes back with "Couldn't save that setting. Try again". Batch 5 states:
 * default, saved, field-errors, too-many-attempts, weak-password, wrong password, pref-rollback, loading, error,
 * offline (`?fixture=<state>` on dev / staging shows each with fixture data, b5-fixtures.ts).
 * Sign out stays client-side (the token in localStorage) until auth v2.
 */

type Section = "details" | "prefs" | "password";
type MeResponse = { now: string; profile: StudentProfile };
type Toast = { kind: "ok"; msg: string } | { kind: "err"; msg: string; retry: () => void };

/** The profile calls, or their fixtures (pref-rollback: every setting fails after a moment). */
function useProfileApi(fx: string | null) {
  return useMemo(
    () =>
      fx
        ? {
            patchMe: async (patch: StudentProfilePatch): Promise<MeResponse> => {
              await new Promise((r) => setTimeout(r, 700));
              if (fx === "pref-rollback" && patch.preferences) throw new StudentApiError(0, "You seem to be offline. Check your connection and try again.");
              const cur = await loadFixture<MeResponse>(fx, "profile");
              const { preferences, ...rest } = patch;
              return { ...cur, profile: { ...cur.profile, ...(rest as Partial<StudentProfile>), preferences: { ...cur.profile.preferences, ...preferences } } };
            },
            password: async () => {
              await new Promise((r) => setTimeout(r, 500));
              return { now: new Date().toISOString(), changed: true as const };
            },
          }
        : { patchMe: m4Api.patchMe, password: m4Api.password },
    [fx]
  );
}

export function ProfileView() {
  const fx = useFixture();
  const q = useQuery({
    queryKey: fxKey(fx, m4Keys.me),
    queryFn: fx ? () => loadFixture<MeResponse>(fx, "profile") : ({ signal }) => m4Api.me(signal),
    staleTime: 5 * 60_000,
    retry: fx ? false : undefined,
  });
  const p = q.data?.profile;
  const online = useOnline();
  const offline = !online || fx === "offline";
  const [active, setActive] = useState<Section>("details");
  const fxTab: Section | null = fx === "pref-rollback" ? "prefs" : fx === "too-many-attempts" || fx === "weak-password" || fx === "wrong-password" ? "password" : null;
  const [tab, setTab] = useState<Section>("details"); // Phone-Profile's tabs
  const [toast, setToast] = useState<Toast | null>(null);
  const signOut = useSignOut();
  const router = useRouter();

  // Fixture states that open on a given tab or with a toast showing (set while rendering when the fixture is first read).
  const [fxSeen, setFxSeen] = useState<string | null>(null);
  if (fx !== fxSeen) {
    setFxSeen(fx);
    if (fxTab) setTab(fxTab);
    if (fx === "saved") setToast({ kind: "ok", msg: "Profile saved" });
    if (fx === "pref-rollback") setToast({ kind: "err", msg: "Couldn't save that setting.", retry: () => setToast(null) });
  }

  // "Saved" toasts leave by themselves; an error stays until Try again or ×.
  useEffect(() => {
    if (toast?.kind !== "ok") return;
    const id = setTimeout(() => setToast(null), toast.msg === "Profile saved" ? 4000 : 3000);
    return () => clearTimeout(id);
  }, [toast]);

  const phoneOnly = (s: Section) => (tab === s ? "" : "max-md:hidden");
  const go = (s: Section) => (e: React.MouseEvent) => {
    e.preventDefault();
    setActive(s);
    document.getElementById(s)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const asOf = q.dataUpdatedAt ? istTime(q.dataUpdatedAt) : null;

  return (
    <>
      <header className="sticky top-0 z-(--z-topbar) row box-content h-[60px] gap-1.5 border-b border-line bg-white/90 px-3 pt-[env(safe-area-inset-top)] backdrop-blur-md md:hidden">
        <button type="button" className="btn btn-ghost btn-icon size-11 flex-none" aria-label="Back" onClick={() => (window.history.length > 1 ? router.back() : router.push("/"))}>
          <ChevronLeftIcon />
        </button>
        <h1 className="h3 grow">Profile</h1>
      </header>
      {offline && p && <OfflineStrip className="md:hidden" desktop="" phone={`${asOf ? `Showing ${asOf}. ` : ""}Saving waits.`} />}
      <div className="flex flex-wrap gap-7 md:pt-1 max-md:gap-3 max-md:px-4 max-md:pt-3.5 max-md:pb-6">
        <Doodle name="atom" slot="gl" style={{ top: 420 }} />
        <Doodle name="integral" slot="gr" style={{ top: 760 }} />
        <nav className="col sticky top-24 flex-[1_1_220px] gap-1 self-start max-md:hidden" style={{ maxWidth: 240 }} aria-label="Settings">
          <a href="#details" className="navlink" aria-current={active === "details" ? "true" : undefined} onClick={go("details")}>
            Profile
          </a>
          <a href="#prefs" className="navlink" aria-current={active === "prefs" ? "true" : undefined} onClick={go("prefs")}>
            Preferences
          </a>
          <a href="#password" className="navlink" aria-current={active === "password" ? "true" : undefined} onClick={go("password")}>
            Password
          </a>
          <hr className="mx-3 my-2 h-px border-0 bg-line" />
          <button type="button" className="navlink" style={{ color: "var(--red-600)" }} onClick={signOut}>
            Sign out
          </button>
        </nav>
        <div className="col min-w-0 flex-[999_1_560px] gap-5 max-md:gap-3">
          {!p ? (
            q.isError ? (
              <>
                <PageError what="your profile" error={q.error} onRetry={() => q.refetch()} safe="Your tests and results are safe. Try again in a moment." className="max-md:hidden" />
                <PageError what="your profile" error={q.error} onRetry={() => q.refetch()} safe="Your tests and results are safe." className="md:hidden" />
              </>
            ) : (
              <ProfileSkeleton />
            )
          ) : (
            <>
              {offline && <OfflineStrip className="max-md:hidden" desktop={`${asOf ? `Showing your details from ${asOf}. ` : ""}Saving waits until you're back.`} phone="" />}
              <Hero p={p} />
              <div className="seg grid w-full grid-cols-3 md:hidden" role="tablist" aria-label="Settings">
                {(
                  [
                    ["details", "Profile"],
                    ["prefs", "Preferences"],
                    ["password", "Password"],
                  ] as const
                ).map(([k, l]) => (
                  <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? "tab on h-10 justify-center" : "tab h-10 justify-center"} onClick={() => setTab(k)}>
                    {l}
                  </button>
                ))}
              </div>
              <Details key={p.id} p={p} fx={fx} offline={offline} onSaved={() => setToast({ kind: "ok", msg: "Profile saved" })} className={phoneOnly("details")} />
              {!fx && <GuardianConsentCard className={phoneOnly("details")} />}
              <Preferences p={p} fx={fx} onToast={setToast} className={phoneOnly("prefs")} />
              <Password fx={fx} offline={offline} className={phoneOnly("password")} />
              <button type="button" className="btn btn-ghost btn-lg mt-1 self-start md:hidden" style={{ color: "var(--red-600)" }} onClick={signOut}>
                Sign out
              </button>
            </>
          )}
        </div>
      </div>
      {toast && <ToastBar toast={toast} onClose={() => setToast(null)} />}
    </>
  );
}

/** Student-Profile / Phone-Profile "loading". */
function ProfileSkeleton() {
  return (
    <div className="col gap-5 max-md:gap-3" aria-busy="true" aria-label="Loading your profile">
      <Skel className="h-32 rounded-[20px] max-md:h-[104px]" />
      <Skel className="h-11 rounded-xl md:hidden" />
      <div className="card pad-lg col gap-[18px] max-md:p-4 max-md:gap-3.5">
        <Skel className="h-[18px] w-[180px] max-md:hidden" />
        <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1 max-md:gap-3.5">
          {[0, 1, 2, 3].map((k) => (
            <Skel key={k} className="h-[66px] rounded-[10px]" />
          ))}
        </div>
      </div>
      <div className="card pad-lg col gap-3.5 max-md:hidden">
        <Skel className="h-[18px] w-[140px]" />
        <Skel className="h-3 w-[92%]" />
        <Skel className="h-3 w-[84%]" />
        <Skel className="h-3 w-[88%]" />
      </div>
    </div>
  );
}

/** Kit-Feedback toast: ink, no shadow; an error offers Try again and ×. */
function ToastBar({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const ok = toast.kind === "ok";
  return (
    <div className={ok ? "pf-tst" : "pf-tst err"} role={ok ? "status" : "alert"}>
      {ok ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7BE0A6" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FF9B9B" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true" focusable="false">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7.5v5.5M12 16.5h.01" />
        </svg>
      )}
      <span className="msg">
        <b>{toast.msg}</b>
      </span>
      {toast.kind === "err" && (
        <>
          <button type="button" className="act" onClick={toast.retry}>
            Try again
          </button>
          <button type="button" className="cls" aria-label="Close" onClick={onClose}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true" focusable="false">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </>
      )}
    </div>
  );
}

function useSignOut() {
  const logout = useAuthStore((s) => s.logout);
  return () => {
    logout();
    window.location.replace("/login"); // a full load: drop every cached query of this session
  };
}

function Hero({ p }: { p: StudentProfile }) {
  const name = `${p.firstName} ${p.lastName}`.trim();
  const badges = [p.targetLabel && p.batch?.name ? `${p.targetLabel} · ${p.batch.name}` : (p.targetLabel ?? p.batch?.name), p.institute?.name].filter(Boolean) as string[];
  return (
    <section className="hero cl-board row wrap rise gap-5 p-7 max-md:flex-nowrap max-md:gap-3.5 max-md:rounded-[20px] max-md:p-[18px]">
      <span className="cl-smudge" aria-hidden="true" style={{ right: -60, top: 10 }} />
      <span className="flex-none [&_.avatar]:bg-white">
        <Avatar name={name} email={p.email} size={36} className="!size-[72px] !text-[24px] max-md:!size-14 max-md:!text-[19px]" />
      </span>
      <div className="col min-w-0 gap-1 max-md:gap-[3px]">
        <h2 className="h1 mb-1.5 text-white max-md:mb-0.5 max-md:text-[20px] max-md:leading-tight">
          <InkUnderline delay={450}>{p.firstName || name || "You"}</InkUnderline>
          {p.lastName ? ` ${p.lastName}` : ""}
        </h2>
        <span className="sm break-words max-md:truncate max-md:text-xs" style={{ color: "#D6D8FA" }}>
          {p.email}
        </span>
        {badges.length > 0 && (
          <div className="row wrap mt-1.5 gap-2 max-md:mt-1 max-md:gap-1.5">
            {badges.map((b) => (
              <span key={b} className="badge text-white" style={{ background: "rgba(255,255,255,.14)" }}>
                {b}
              </span>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

/** "+919826012345" -> "+91 98260 12345" for the input (as the boards show it) */
function localPhone(v: string | null): string {
  if (!v) return "";
  const d = v.replace(/\D/g, "").replace(/^91(?=\d{10}$)/, "");
  return d.length === 10 ? `+91 ${d.slice(0, 5)} ${d.slice(5)}` : v;
}
/** An Indian mobile in any common spelling -> its 10 digits, or null when it is not one */
function tenDigits(v: string): string | null {
  const d = v.replace(/\D/g, "").replace(/^(91|0)(?=\d{10}$)/, "");
  return /^[6-9]\d{9}$/.test(d) ? d : null;
}

const initOf = (p: StudentProfile) => ({ firstName: p.firstName, lastName: p.lastName, phone: localPhone(p.phone), parentPhone: localPhone(p.parentPhone), city: p.city ?? "" });

type FieldKey = "firstName" | "lastName" | "phone" | "parentPhone" | "city";
type FieldErrors = Partial<Record<FieldKey, string>>;
const FIELD_LABEL: Record<FieldKey, string> = { firstName: "First name", lastName: "Last name", phone: "Phone", parentPhone: "Parent's phone", city: "City" };
const FIELD_ID: Record<FieldKey, string> = { firstName: "pf-first", lastName: "pf-last", phone: "pf-phone", parentPhone: "pf-parent", city: "pf-city" };
const CITY_ERR = "Pick a city from your institute's list";
const PHONE_ERR = "Phone numbers have 10 digits";

/** Field messages from a 400 (details: { field: [message] }), or the error's own sentence for its field. */
function fieldErrors(err: unknown): { fields: FieldErrors; general: string | null } {
  const e = err instanceof StudentApiError ? err : null;
  if (!e) return { fields: {}, general: "Couldn't save. Please try again." };
  const fields: FieldErrors = {};
  for (const k of ["firstName", "lastName", "phone", "parentPhone", "city"] as const) {
    const v = e.details?.[k];
    const msg = Array.isArray(v) ? v[0] : typeof v === "string" ? v : null;
    if (typeof msg === "string") fields[k] = k === "city" ? CITY_ERR : sentence(msg);
  }
  if (e.code === "INVALID_CITY") fields.city = CITY_ERR;
  const general = Object.keys(fields).length ? null : sentence(e.message || "Couldn't save. Please try again");
  return { fields, general };
}

const ErrIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" focusable="false" className="flex-none">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7.5v5.5M12 16.5h.01" />
  </svg>
);

/** Kit-Forms top summary: "2 fields need a fix" with a link to each. */
function Summary({ errs, refEl }: { errs: FieldErrors; refEl: React.RefObject<HTMLDivElement | null> }) {
  const keys = (Object.keys(FIELD_ID) as FieldKey[]).filter((k) => errs[k]);
  if (!keys.length) return null;
  return (
    <div ref={refEl} className="pf-sum" role="alert" tabIndex={-1}>
      <span className="text-[#C40000]">
        <ErrIcon size={16} />
      </span>
      <span className="col gap-1 max-md:gap-0">
        <span className="sm font-semibold">
          {keys.length} {keys.length === 1 ? "field needs" : "fields need"} a fix
        </span>
        <span className="sm">
          {keys.map((k, i) => (
            <span key={k}>
              {i > 0 && " · "}
              <a
                href={`#${FIELD_ID[k]}`}
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById(FIELD_ID[k])?.focus();
                }}
              >
                {FIELD_LABEL[k]}
              </a>
            </span>
          ))}
        </span>
      </span>
    </div>
  );
}

function Details({ p, fx, offline, onSaved, className }: { p: StudentProfile; fx: string | null; offline: boolean; onSaved: () => void; className?: string }) {
  const client = useQueryClient();
  const api = useProfileApi(fx);
  const init = initOf(p);
  const fieldErrFx = fx === "field-errors";
  const [f, setF] = useState(fieldErrFx ? { ...init, phone: "+91 98260 1234", city: "Indor" } : init);
  const [local, setLocal] = useState<FieldErrors>(fieldErrFx ? { phone: PHONE_ERR, city: CITY_ERR } : {});
  const sumRef = useRef<HTMLDivElement>(null);
  const locations = useLocations(fx);
  const cities = locations.data?.cities ?? p.cityOptions;
  const save = useMutation({
    mutationFn: (patch: StudentProfilePatch) => api.patchMe(patch),
    onSuccess: (res) => {
      client.setQueryData(fxKey(fx, m4Keys.me), res);
      if (!fx) useAuthStore.getState().setUserName(`${res.profile.firstName} ${res.profile.lastName}`.trim());
      setF(initOf(res.profile));
      onSaved();
    },
  });
  const server = save.isError ? fieldErrors(save.error) : { fields: {} as FieldErrors, general: null };
  const err: FieldErrors = { ...server.fields, ...local };
  const dirty = (Object.keys(init) as Array<keyof typeof init>).some((k) => f[k] !== init[k]);
  const setValue = (k: FieldKey, value: string) => {
    setF((x) => ({ ...x, [k]: value }));
    setLocal((x) => ({ ...x, [k]: undefined }));
    if (save.isError) save.reset();
  };

  // A failed save moves focus to the summary (Kit-Forms).
  const failedKeys = Object.keys(server.fields).length;
  useEffect(() => {
    if (failedKeys) sumRef.current?.focus();
  }, [failedKeys]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (offline) return;
    const errs: FieldErrors = {};
    if (!f.firstName.trim()) errs.firstName = "Enter your first name.";
    const phone = f.phone.trim() ? tenDigits(f.phone) : null;
    if (!f.phone.trim()) errs.phone = "Enter your phone number.";
    else if (!phone) errs.phone = PHONE_ERR;
    const parent = f.parentPhone.trim() ? tenDigits(f.parentPhone) : null;
    if (f.parentPhone.trim() && !parent) errs.parentPhone = PHONE_ERR;
    if (f.city && !cities.includes(f.city)) errs.city = CITY_ERR;
    setLocal(errs);
    if (Object.keys(errs).length) {
      requestAnimationFrame(() => sumRef.current?.focus());
      return;
    }
    const patch: StudentProfilePatch = {};
    if (f.firstName !== init.firstName) patch.firstName = f.firstName.trim();
    if (f.lastName !== init.lastName) patch.lastName = f.lastName.trim();
    if (f.phone !== init.phone) patch.phone = `+91${phone}`;
    if (f.parentPhone !== init.parentPhone) patch.parentPhone = parent ? `+91${parent}` : null;
    if (f.city !== init.city) patch.city = f.city || null;
    if (Object.keys(patch).length) save.mutate(patch);
  };

  const input = (k: FieldKey, extra: React.InputHTMLAttributes<HTMLInputElement> = {}, hint?: React.ReactNode, cls?: string) => {
    const id = FIELD_ID[k];
    return (
      <div className={cls ? `field ${cls}` : "field"}>
        <label className="label" htmlFor={id}>
          {FIELD_LABEL[k]}
        </label>
        <input
          id={id}
          className={err[k] ? "input e" : "input"}
          value={f[k]}
          onChange={(e) => setValue(k, e.target.value)}
          aria-invalid={err[k] ? true : undefined}
          aria-describedby={err[k] ? `${id}-err` : hint ? `${id}-hint` : undefined}
          {...extra}
        />
        {err[k] ? (
          <span id={`${id}-err`} className="pf-err">
            <ErrIcon />
            {err[k]}
          </span>
        ) : hint ? (
          <span id={`${id}-hint`} className="hint">
            {hint}
          </span>
        ) : null}
      </div>
    );
  };

  const btn = "max-md:h-12 max-md:flex-1 max-md:rounded-xl max-md:text-[15px]";
  return (
    <form id="details" className={`card pad-lg col rise scroll-mt-24 gap-[18px] max-md:gap-3.5 max-md:p-4 ${className ?? ""}`} style={{ "--i": 1 } as React.CSSProperties} onSubmit={submit} noValidate role="tabpanel" aria-label="Profile">
      <h2 className="h3 max-md:hidden">Personal details</h2>
      <Summary errs={err} refEl={sumRef} />
      {/* desktop order (board): first, last, phone, city, parent's phone; phone: first, last, phone, parent's phone, city, email */}
      <div className="grid grid-cols-2 items-start gap-4 max-md:gap-3">
        {input("firstName", { autoComplete: "given-name", maxLength: 60 })}
        {input("lastName", { autoComplete: "family-name", maxLength: 60 })}
        {input("phone", { type: "tel", inputMode: "tel", autoComplete: "tel-national", placeholder: "+91 98260 12345", maxLength: 16 }, <span className="md:hidden">Used to sign in, so it can&apos;t be left empty</span>, "max-md:col-span-2")}
        <div className="field relative max-md:order-5 max-md:col-span-2">
          <label className="label" htmlFor={FIELD_ID.city}>
            City
          </label>
          <CityPicker
            id={FIELD_ID.city}
            value={f.city}
            cities={cities}
            states={locations.data?.states ?? []}
            group={p.institute?.name ?? null}
            invalid={!!err.city}
            describedBy={err.city ? `${FIELD_ID.city}-err` : undefined}
            onChange={(v) => setValue("city", v)}
          />
          {err.city && (
            <span id={`${FIELD_ID.city}-err`} className="pf-err">
              <ErrIcon />
              {err.city}
            </span>
          )}
        </div>
        {input("parentPhone", { type: "tel", inputMode: "tel", placeholder: "Optional", maxLength: 16 }, "Optional. Kept with your details for your institute.", "max-md:order-4 max-md:col-span-2")}
        <div className="col order-6 col-span-2 gap-0.5 md:hidden">
          <span className="label">Email</span>
          <span className="sm muted break-all">{p.email}</span>
          <span className="hint">Set by your institute</span>
        </div>
      </div>
      <div className="row wrap justify-end gap-2">
        {server.general && (
          <span className="sm mr-auto" role="alert" style={{ color: "var(--red-600)" }}>
            {server.general}
          </span>
        )}
        <button
          type="button"
          className={`btn btn-ghost ${btn}`}
          disabled={(!dirty && !Object.keys(local).some((k) => local[k as FieldKey])) || save.isPending}
          onClick={() => {
            setF(init);
            setLocal({});
            save.reset();
          }}
        >
          Cancel
        </button>
        {offline ? (
          <button type="button" className={`btn btn-primary pf-off ${btn}`} disabled>
            <span className="max-md:hidden">Offline · Save waits</span>
            <span className="md:hidden">Offline · waits</span>
          </button>
        ) : (
          <button type="submit" className={`btn btn-primary ${btn}`} disabled={(!dirty && !fieldErrFx) || save.isPending}>
            {save.isPending && <Spinner size={16} />}
            Save changes
          </button>
        )}
      </div>
    </form>
  );
}

/** GET /users/meta/locations (public, constant per tenant). */
function useLocations(fx: string | null) {
  return useQuery({
    queryKey: fxKey(fx, ["meta", "locations"] as const),
    queryFn: fx ? () => loadFixture<LocationsResponse>(fx, "locations") : ({ signal }) => request<LocationsResponse>("users", "/meta/locations", undefined, signal),
    staleTime: 60 * 60_000,
    retry: 1,
  });
}

function Highlight({ text, q }: { text: string; q: string }) {
  const i = q ? text.toLowerCase().indexOf(q.toLowerCase()) : -1;
  if (i < 0) return <span>{text}</span>;
  return (
    <span>
      {text.slice(0, i)}
      <b>{text.slice(i, i + q.length)}</b>
      {text.slice(i + q.length)}
    </span>
  );
}
const SearchIco = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" focusable="false" className="flex-none text-muted">
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
);
const Chevron = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    <path d="m6 9 6 6 6-6" />
  </svg>
);
const Tick = () => (
  <svg className="tick" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
);

/**
 * City (Kit-Pickers K01, 44px): desktop opens a search box in the field's place with the list under it, grouped under
 * the institute, each city with its state; phones open a bottom sheet. Typing filters (matched letters bold), the first
 * match is focused so Enter picks it; picking closes the list and returns focus to the field.
 */
function CityPicker({
  id,
  value,
  cities,
  states,
  group,
  invalid,
  describedBy,
  onChange,
}: {
  id: string;
  value: string;
  cities: string[];
  states: string[];
  group: string | null;
  invalid: boolean;
  describedBy?: string;
  onChange: (v: string) => void;
}) {
  const desktop = useIsDesktop() !== false;
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [focus, setFocus] = useState(0);
  const listId = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const shown = useMemo(() => cities.filter((c) => c.toLowerCase().includes(q.trim().toLowerCase())), [cities, q]);
  const stateOf = (c: string) => (states.length === cities.length ? states[cities.indexOf(c)] : states.length === 1 ? states[0] : undefined);

  const close = (refocus = true) => {
    setOpen(false);
    setQ("");
    if (refocus) requestAnimationFrame(() => trigger.current?.focus());
  };
  const pick = (c: string) => {
    onChange(c);
    close();
  };

  useEffect(() => {
    if (!open || !desktop) return;
    const onDown = (e: PointerEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) close(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open, desktop]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocus((x) => Math.min(x + 1, shown.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocus((x) => Math.max(x - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (shown[focus]) pick(shown[focus]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      close();
    } else if (e.key === "Tab") close(false);
  };

  const search = (
    <div className="au-cb open">
      <SearchIco />
      <input
        id={desktop ? id : undefined}
        autoFocus
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setFocus(0);
        }}
        onKeyDown={onKey}
        role="combobox"
        aria-expanded="true"
        aria-controls={listId}
        aria-activedescendant={shown[focus] ? `${listId}-${focus}` : undefined}
        aria-label="Search cities"
        placeholder="Search cities"
        autoComplete="off"
      />
    </div>
  );
  const list = (
    <ul id={listId} className="au-list" role="listbox" aria-label="Your institute's cities">
      {group && (
        <li className="pf-grp" role="presentation">
          {group}
        </li>
      )}
      {shown.length === 0 ? (
        <li className="au-li none" role="presentation">
          No city called &quot;{q.trim()}&quot;
        </li>
      ) : (
        shown.map((c, i) => (
          <li key={c} id={`${listId}-${i}`} role="option" aria-selected={c === value}>
            <button type="button" tabIndex={-1} className={i === focus ? "au-li focus" : "au-li"} onMouseEnter={() => setFocus(i)} onClick={() => pick(c)}>
              <Highlight text={c} q={q.trim()} />
              {stateOf(c) && <span className="pf-end">{stateOf(c)}</span>}
              {c === value && <Tick />}
            </button>
          </li>
        ))
      )}
    </ul>
  );

  return (
    <div ref={wrap} className="relative">
      {open && desktop ? (
        <>
          {search}
          <div className="au-pop pf-pop">{list}</div>
        </>
      ) : (
        <button
          ref={trigger}
          id={id}
          type="button"
          className={invalid ? "au-cb e" : "au-cb"}
          aria-haspopup={desktop ? "listbox" : "dialog"}
          aria-expanded={open}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          onClick={() => {
            setFocus(Math.max(0, cities.indexOf(value)));
            setOpen(true);
          }}
        >
          <span className={value ? "v" : "v ph"}>{value || "Choose your city"}</span>
          <Chevron />
        </button>
      )}
      {!desktop && (
        <Sheet open={open} onOpenChange={(o) => (o ? setOpen(true) : close())} title="City">
          {search}
          {list}
        </Sheet>
      )}
    </div>
  );
}

function Preferences({ p, fx, onToast, className }: { p: StudentProfile; fx: string | null; onToast: (t: Toast | null) => void; className?: string }) {
  const client = useQueryClient();
  const api = useProfileApi(fx);
  const key = fxKey(fx, m4Keys.me);
  const m = useMutation({
    mutationFn: (prefs: Partial<StudentPreferences>) => api.patchMe({ preferences: prefs }),
    onMutate: (prefs) => {
      onToast(null);
      const before = client.getQueryData<MeResponse>(key);
      if (before) client.setQueryData(key, { ...before, profile: { ...before.profile, preferences: { ...before.profile.preferences, ...prefs } } });
      return { before };
    },
    onError: (_e, prefs, ctx) => {
      if (ctx?.before) client.setQueryData(key, ctx.before);
      onToast({ kind: "err", msg: "Couldn't save that setting.", retry: () => m.mutate(prefs) });
    },
    onSuccess: (res) => {
      client.setQueryData(key, res);
      onToast({ kind: "ok", msg: "Setting saved" });
    },
  });
  const pr = p.preferences;
  const toggle = (k: "emailResults" | "testReminders" | "testPublished" | "rebuildPlanAfterResult", id: string, label: string, hint?: string, on = pr[k] !== false) => (
    <div className="row between pref">
      <span className="col gap-0.5">
        <span id={id} className="sm font-semibold">
          {label}
        </span>
        {hint && <span className="xs muted">{hint}</span>}
      </span>
      <button type="button" className="swhit" role="switch" aria-checked={on} aria-labelledby={id} onClick={() => m.mutate({ [k]: !on })}>
        <span className={on ? "sw on" : "sw off"} aria-hidden="true" />
      </button>
    </div>
  );
  return (
    <section id="prefs" className={`card pad-lg col rise scroll-mt-24 gap-1 max-md:gap-0 max-md:px-4 max-md:py-1.5 ${className ?? ""}`} style={{ "--i": 2 } as React.CSSProperties} aria-labelledby="prefs-h" role="tabpanel">
      <h2 id="prefs-h" className="h3 mb-2 max-md:sr-only">
        Preferences
      </h2>
      <div className="row between pref max-md:flex-col max-md:items-start">
        <span className="col gap-0.5">
          <span id="pref-lang" className="sm font-semibold">
            Question language
          </span>
          <span className="xs muted">Used for practice questions; you can switch per question</span>
        </span>
        <span className="seg" role="radiogroup" aria-labelledby="pref-lang">
          {(["en", "hi"] as const).map((l) => (
            <button key={l} type="button" role="radio" aria-checked={pr.questionLanguage === l} className={pr.questionLanguage === l ? "tab on" : "tab"} lang={l === "hi" ? "hi" : undefined} onClick={() => pr.questionLanguage !== l && m.mutate({ questionLanguage: l })}>
              {l === "en" ? "English" : "हिन्दी"}
            </button>
          ))}
        </span>
      </div>
      {toggle("emailResults", "pref-2", "Email me when results are out")}
      {toggle("testReminders", "pref-3", "Remind me 1 hour before a test")}
      {toggle("testPublished", "pref-5", "Email me when a new test is published")}
      {toggle("rebuildPlanAfterResult", "pref-4", "AI study plan", "Rebuild my plan after every result")}
    </section>
  );
}

/** "Too many wrong passwords. Try again later (15 min)" -> the time the block lifts (15 min when the API says nothing). */
function lockedUntilOf(e: StudentApiError): number {
  const m = /(\d+)\s*min/.exec(e.message);
  return Date.now() + (m ? Number(m[1]) : 15) * 60_000;
}

function Password({ fx, offline, className }: { fx: string | null; offline: boolean; className?: string }) {
  const api = useProfileApi(fx);
  const filled = fx === "weak-password" ? { current: "xxxxxxxxx", next: "pulse26", confirm: "pulse26" } : fx === "wrong-password" ? { current: "xxxxxxxxx", next: "pulse-2026!", confirm: "pulse-2026!" } : null;
  const [f, setF] = useState(filled ?? { current: "", next: "", confirm: "" });
  const [local, setLocal] = useState<{ current?: string; next?: string; confirm?: string }>(
    fx === "weak-password" ? { next: "Too short. Use at least 8 characters." } : fx === "wrong-password" ? { current: "That's not your current password." } : {}
  );
  const [lockedUntil, setLockedUntil] = useState<number | null>(() => (fx === "too-many-attempts" ? Date.now() + 15 * 60_000 : null));
  const [done, setDone] = useState(false);
  const m = useMutation({
    mutationFn: () => api.password({ currentPassword: f.current, newPassword: f.next }),
    onSuccess: () => {
      setF({ current: "", next: "", confirm: "" });
      setDone(true);
    },
    onError: (e) => {
      if (e instanceof StudentApiError && (e.code === "TOO_MANY_ATTEMPTS" || e.status === 429)) setLockedUntil(lockedUntilOf(e));
    },
  });
  // The block lifts by itself at its time.
  useEffect(() => {
    if (!lockedUntil) return;
    const id = setTimeout(() => setLockedUntil(null), Math.max(0, lockedUntil - Date.now()));
    return () => clearTimeout(id);
  }, [lockedUntil]);
  const locked = !!lockedUntil;
  const e = m.error instanceof StudentApiError ? m.error : null;
  const errs = {
    current: local.current ?? (e?.code === "WRONG_PASSWORD" ? "That's not your current password." : undefined),
    next: local.next ?? (e?.code === "WEAK_PASSWORD" ? sentence(e.message || "Too short. Use at least 8 characters") : undefined),
    confirm: local.confirm,
  };
  const general = m.isError && !locked && !errs.current && !errs.next ? sentence(e?.message || "Couldn't change the password. Please try again") : null;

  const set = (k: keyof typeof f) => (ev: React.ChangeEvent<HTMLInputElement>) => {
    setF((x) => ({ ...x, [k]: ev.target.value }));
    setLocal((x) => ({ ...x, [k]: undefined }));
    setDone(false);
    if (m.isError || m.isSuccess) m.reset();
  };
  const submit = (ev: React.FormEvent) => {
    ev.preventDefault();
    if (locked || offline) return;
    const l: typeof local = {};
    if (!f.current) l.current = "Enter your current password.";
    if (f.next.length < 8) l.next = "Too short. Use at least 8 characters.";
    else if (f.next === f.current) l.next = "Pick a new password, not your current one.";
    if (f.confirm !== f.next) l.confirm = "The two new passwords don't match.";
    setLocal(l);
    if (!Object.keys(l).length) m.mutate();
  };
  const field = (id: string, k: keyof typeof f, label: string, auto: string, hint?: string) => (
    <div className="field">
      <label className="label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        type="password"
        className={errs[k] ? "input e" : "input"}
        autoComplete={auto}
        value={locked ? "" : f[k]}
        onChange={set(k)}
        disabled={locked}
        aria-invalid={errs[k] ? true : undefined}
        aria-describedby={errs[k] ? `${id}-err` : undefined}
      />
      {!locked && errs[k] ? (
        <span id={`${id}-err`} className="pf-err" role="alert">
          <ErrIcon />
          {errs[k]}
        </span>
      ) : !locked && hint ? (
        <span className="hint">{hint}</span>
      ) : null}
    </div>
  );
  const btn = "max-md:h-12 max-md:w-full max-md:rounded-xl max-md:text-[15px]";
  return (
    <form id="password" className={`card pad-lg col rise scroll-mt-24 gap-[18px] max-md:gap-3.5 max-md:p-4 ${className ?? ""}`} style={{ "--i": 3 } as React.CSSProperties} onSubmit={submit} noValidate role="tabpanel" aria-label="Password">
      <h2 className="h3 max-md:hidden">Password</h2>
      <div className="col max-w-[420px] gap-4 max-md:max-w-none max-md:gap-3.5">
        {locked && (
          <div className="pf-sum" role="alert">
            <span className="text-[#C40000]">
              <ErrIcon size={16} />
            </span>
            <span className="col gap-0.5">
              <span className="sm font-semibold">Too many tries. Try again at {istTime(lockedUntil!)}.</span>
              <span className="xs">Forgot your current password? Sign out, then use Forgot password.</span>
            </span>
          </div>
        )}
        {field("pw-current", "current", "Current password", "current-password")}
        {field("pw-new", "next", "New password", "new-password", "At least 8 characters")}
        {field("pw-confirm", "confirm", "Confirm new password", "new-password")}
      </div>
      <div className="row wrap justify-end gap-2">
        {general && (
          <span className="sm mr-auto" role="alert" style={{ color: "var(--red-600)" }}>
            {general}
          </span>
        )}
        {done && (
          <span className="sm muted mr-auto" role="status">
            Password changed.
          </span>
        )}
        {offline ? (
          <button type="button" className={`btn btn-primary pf-off ${btn}`} disabled>
            Offline · waits
          </button>
        ) : (
          <button type="submit" className={`btn btn-primary ${locked ? "pf-off" : ""} ${btn}`} disabled={m.isPending || locked}>
            {m.isPending && <Spinner size={16} />}
            Change password
          </button>
        )}
      </div>
    </form>
  );
}
