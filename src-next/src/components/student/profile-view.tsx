"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Doodle, InkUnderline } from "@iitpulse/ui";
import { m4Api, m4Keys, useProfile } from "@/lib/m4-api";
import { StudentApiError } from "@/lib/student-api";
import { useAuthStore } from "@/stores/auth.store";
import type { StudentPreferences, StudentProfile, StudentProfilePatch } from "@/types/m4";
import { Avatar } from "@/components/shell/avatar";
import { Spinner } from "@/components/shell/icons";
import { ErrorCard, Skel } from "./common";
import { sentence } from "./labels";

/**
 * /profile: Student-Profile. Desktop: the settings nav (Profile, Preferences, Password, Sign out) beside the
 * blueboard hero and the cards. Phone (opened from the header avatar): the same cards in one column, Sign out last.
 * GET / PATCH /users/student/me, POST /users/student/me/password. City is a select from cityOptions (data).
 * Preferences save on change. Sign out stays client-side (the token in localStorage) until auth v2.
 */

type Section = "details" | "prefs" | "password";

export function ProfileView() {
  const q = useProfile();
  const p = q.data?.profile;
  const [active, setActive] = useState<Section>("details");
  const signOut = useSignOut();

  const go = (s: Section) => (e: React.MouseEvent) => {
    e.preventDefault();
    setActive(s);
    document.getElementById(s)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="flex flex-wrap gap-7 md:pt-1 max-md:gap-4">
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
            <ErrorCard error={q.error} onRetry={() => q.refetch()} />
          ) : (
            <div className="col gap-5" aria-busy="true" aria-label="Loading your profile">
              <Skel className="h-[150px] rounded-[22px]" />
              <Skel className="h-[260px] rounded-card" />
              <Skel className="h-[240px] rounded-card" />
            </div>
          )
        ) : (
          <>
            <Hero p={p} />
            <Details key={p.id} p={p} />
            <Preferences p={p} />
            <Password />
            <button type="button" className="btn btn-secondary self-start md:hidden" style={{ color: "var(--red-600)" }} onClick={signOut}>
              Sign out
            </button>
          </>
        )}
      </div>
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
    <section className="hero cl-board row wrap rise gap-5 p-7 max-md:gap-4 max-md:p-5">
      <span className="cl-smudge" aria-hidden="true" style={{ right: -60, top: 10 }} />
      <span className="flex-none [&_.avatar]:bg-white">
        <Avatar name={name} email={p.email} size={36} className="!size-[72px] !text-[24px]" />
      </span>
      <div className="col min-w-0 gap-1">
        <h1 className="h1 mb-1.5 text-white max-md:text-[24px]">
          <InkUnderline delay={450}>{p.firstName || name || "You"}</InkUnderline>
          {p.lastName ? ` ${p.lastName}` : ""}
        </h1>
        <span className="sm break-words" style={{ color: "#D6D8FA" }}>
          {p.email}
          {p.rollNo ? ` · Roll no. ${p.rollNo}` : ""}
        </span>
        {badges.length > 0 && (
          <div className="row wrap mt-1.5 gap-2">
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

/** "+919826012345" -> "98260 12345" for the input */
function localPhone(v: string | null): string {
  if (!v) return "";
  const d = v.replace(/\D/g, "").replace(/^91(?=\d{10}$)/, "");
  return d.length === 10 ? `${d.slice(0, 5)} ${d.slice(5)}` : v;
}
/** An Indian mobile in any common spelling -> its 10 digits, or null when it is not one */
function tenDigits(v: string): string | null {
  const d = v.replace(/\D/g, "").replace(/^(91|0)(?=\d{10}$)/, "");
  return /^[6-9]\d{9}$/.test(d) ? d : null;
}

const initOf = (p: StudentProfile) => ({ firstName: p.firstName, lastName: p.lastName, phone: localPhone(p.phone), parentPhone: localPhone(p.parentPhone), city: p.city ?? "" });

type FieldErrors = Partial<Record<"firstName" | "lastName" | "phone" | "parentPhone" | "city", string>>;

/** Field messages from a 400 (details: { field: [message] }), or the error's own sentence for its field. */
function fieldErrors(err: unknown): { fields: FieldErrors; general: string | null } {
  const e = err instanceof StudentApiError ? err : null;
  if (!e) return { fields: {}, general: "Couldn't save. Please try again." };
  const fields: FieldErrors = {};
  for (const k of ["firstName", "lastName", "phone", "parentPhone", "city"] as const) {
    const v = e.details?.[k];
    const msg = Array.isArray(v) ? v[0] : typeof v === "string" ? v : null;
    if (typeof msg === "string") fields[k] = k === "city" && e.code === "INVALID_CITY" ? sentence(e.message) : sentence(msg);
  }
  if (e.code === "INVALID_CITY" && !fields.city) fields.city = sentence(e.message || "Pick a city from the list");
  const general = Object.keys(fields).length ? null : sentence(e.message || "Couldn't save. Please try again");
  return { fields, general };
}

function Details({ p }: { p: StudentProfile }) {
  const client = useQueryClient();
  const init = initOf(p);
  const [f, setF] = useState(init);
  const [local, setLocal] = useState<FieldErrors>({});
  const [saved, setSaved] = useState(false);
  const save = useMutation({
    mutationFn: (patch: StudentProfilePatch) => m4Api.patchMe(patch),
    onSuccess: (res) => {
      client.setQueryData(m4Keys.me, res);
      useAuthStore.getState().setUserName(`${res.profile.firstName} ${res.profile.lastName}`.trim());
      setF(initOf(res.profile));
      setSaved(true);
    },
  });
  const server = save.isError ? fieldErrors(save.error) : { fields: {} as FieldErrors, general: null };
  const err = { ...server.fields, ...local };
  const dirty = (Object.keys(init) as Array<keyof typeof init>).some((k) => f[k] !== init[k]);
  const set = (k: keyof typeof init) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setF((x) => ({ ...x, [k]: e.target.value }));
    setLocal((x) => ({ ...x, [k]: undefined }));
    setSaved(false);
    if (save.isError) save.reset();
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: FieldErrors = {};
    if (!f.firstName.trim()) errs.firstName = "Enter your first name.";
    const phone = f.phone.trim() ? tenDigits(f.phone) : null;
    if (!f.phone.trim()) errs.phone = "Enter your phone number.";
    else if (!phone) errs.phone = "Enter a 10-digit Indian mobile number.";
    const parent = f.parentPhone.trim() ? tenDigits(f.parentPhone) : null;
    if (f.parentPhone.trim() && !parent) errs.parentPhone = "Enter a 10-digit Indian mobile number.";
    setLocal(errs);
    if (Object.keys(errs).length) return;
    const patch: StudentProfilePatch = {};
    if (f.firstName !== init.firstName) patch.firstName = f.firstName.trim();
    if (f.lastName !== init.lastName) patch.lastName = f.lastName.trim();
    if (f.phone !== init.phone) patch.phone = `+91${phone}`;
    if (f.parentPhone !== init.parentPhone) patch.parentPhone = parent ? `+91${parent}` : null;
    if (f.city !== init.city) patch.city = f.city || null;
    if (Object.keys(patch).length) save.mutate(patch);
  };

  const input = (id: string, k: keyof typeof init, label: string, extra: React.InputHTMLAttributes<HTMLInputElement> = {}, hint?: string) => (
    <div className="field">
      <label className="label" htmlFor={id}>
        {label}
      </label>
      <input id={id} className="input" value={f[k]} onChange={set(k)} aria-invalid={err[k] ? true : undefined} aria-describedby={err[k] ? `${id}-err` : hint ? `${id}-hint` : undefined} {...extra} />
      {err[k] ? (
        <span id={`${id}-err`} className="field-err">
          {err[k]}
        </span>
      ) : hint ? (
        <span id={`${id}-hint`} className="hint">
          {hint}
        </span>
      ) : null}
    </div>
  );

  return (
    <form id="details" className="card pad-lg col rise scroll-mt-24 gap-[18px]" style={{ "--i": 1 } as React.CSSProperties} onSubmit={submit} noValidate>
      <h2 className="h3">Personal details</h2>
      <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1">
        {input("pf-first", "firstName", "First name", { autoComplete: "given-name", maxLength: 60 })}
        {input("pf-last", "lastName", "Last name", { autoComplete: "family-name", maxLength: 60 })}
        {input("pf-phone", "phone", "Phone", { type: "tel", inputMode: "tel", autoComplete: "tel-national", placeholder: "98260 12345", maxLength: 16 })}
        {input("pf-parent", "parentPhone", "Parent's phone", { type: "tel", inputMode: "tel", placeholder: "Optional", maxLength: 16 }, "Optional. Kept with your details for your institute.")}
        <div className="field">
          <label className="label" htmlFor="pf-city">
            City
          </label>
          <select id="pf-city" className="input" value={f.city} onChange={set("city")} aria-invalid={err.city ? true : undefined}>
            <option value="">Choose your city</option>
            {p.cityOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          {err.city && <span className="field-err">{err.city}</span>}
        </div>
        <div className="field">
          <span className="label">Email</span>
          <span className="sm muted flex min-h-11 items-center break-all">{p.email}</span>
        </div>
      </div>
      <div className="row wrap justify-end gap-2">
        {server.general && (
          <span className="sm mr-auto" role="alert" style={{ color: "var(--red-600)" }}>
            {server.general}
          </span>
        )}
        {saved && !dirty && (
          <span className="sm muted mr-auto" role="status">
            Saved.
          </span>
        )}
        <button
          type="button"
          className="btn btn-ghost"
          disabled={!dirty || save.isPending}
          onClick={() => {
            setF(init);
            setLocal({});
            save.reset();
          }}
        >
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={!dirty || save.isPending}>
          {save.isPending && <Spinner size={16} />}
          Save changes
        </button>
      </div>
    </form>
  );
}

function Preferences({ p }: { p: StudentProfile }) {
  const client = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const m = useMutation({
    mutationFn: (prefs: Partial<StudentPreferences>) => m4Api.patchMe({ preferences: prefs }),
    onMutate: (prefs) => {
      setError(null);
      const before = client.getQueryData<{ now: string; profile: StudentProfile }>(m4Keys.me);
      if (before) client.setQueryData(m4Keys.me, { ...before, profile: { ...before.profile, preferences: { ...before.profile.preferences, ...prefs } } });
      return { before };
    },
    onError: (e, _v, ctx) => {
      if (ctx?.before) client.setQueryData(m4Keys.me, ctx.before);
      setError(sentence((e instanceof StudentApiError && e.message) || "Couldn't save that. Please try again"));
    },
    onSuccess: (res) => client.setQueryData(m4Keys.me, res),
  });
  const pr = p.preferences;
  const toggle = (k: "emailResults" | "testReminders" | "rebuildPlanAfterResult", id: string, label: string, hint?: string) => (
    <div className="row between pref">
      <span className="col gap-0.5">
        <span id={id} className="sm font-semibold">
          {label}
        </span>
        {hint && <span className="xs muted">{hint}</span>}
      </span>
      <button type="button" className="sw" role="switch" aria-checked={pr[k]} aria-labelledby={id} onClick={() => m.mutate({ [k]: !pr[k] })} />
    </div>
  );
  return (
    <section id="prefs" className="card pad-lg col rise scroll-mt-24 gap-1" style={{ "--i": 2 } as React.CSSProperties} aria-labelledby="prefs-h">
      <h2 id="prefs-h" className="h3 mb-2">
        Preferences
      </h2>
      <div className="row between wrap pref">
        <span className="col gap-0.5">
          <span id="pref-lang" className="sm font-semibold">
            Question language
          </span>
          <span className="xs muted">Practice questions open in it when a translation exists</span>
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
      {toggle("rebuildPlanAfterResult", "pref-4", "AI study plan", "Rebuild my plan after every result")}
      {error && (
        <span className="sm" role="alert" style={{ color: "var(--red-600)" }}>
          {error}
        </span>
      )}
    </section>
  );
}

function Password() {
  const [f, setF] = useState({ current: "", next: "", confirm: "" });
  const [local, setLocal] = useState<{ current?: string; next?: string; confirm?: string }>({});
  const m = useMutation({
    mutationFn: () => m4Api.password({ currentPassword: f.current, newPassword: f.next }),
    onSuccess: () => setF({ current: "", next: "", confirm: "" }),
  });
  const e = m.error instanceof StudentApiError ? m.error : null;
  const errs = {
    current: local.current ?? (e?.code === "WRONG_PASSWORD" || e?.code === "TOO_MANY_ATTEMPTS" ? sentence(e.message || "Your current password is not right") : undefined),
    next: local.next ?? (e?.code === "WEAK_PASSWORD" ? sentence(e.message || "Use at least 8 characters") : undefined),
    confirm: local.confirm,
  };
  const general = m.isError && !errs.current && !errs.next ? sentence(e?.message || "Couldn't change the password. Please try again") : null;

  const set = (k: keyof typeof f) => (ev: React.ChangeEvent<HTMLInputElement>) => {
    setF((x) => ({ ...x, [k]: ev.target.value }));
    setLocal((x) => ({ ...x, [k]: undefined }));
    if (m.isError || m.isSuccess) m.reset();
  };
  const submit = (ev: React.FormEvent) => {
    ev.preventDefault();
    const l: typeof local = {};
    if (!f.current) l.current = "Enter your current password.";
    if (f.next.length < 8) l.next = "Use at least 8 characters.";
    else if (f.next === f.current) l.next = "Pick a new password, not your current one.";
    if (f.confirm !== f.next) l.confirm = "The two new passwords don't match.";
    setLocal(l);
    if (!Object.keys(l).length) m.mutate();
  };
  const field = (id: string, k: keyof typeof f, label: string, auto: string) => (
    <div className="field">
      <label className="label" htmlFor={id}>
        {label}
      </label>
      <input id={id} type="password" className="input" autoComplete={auto} value={f[k]} onChange={set(k)} aria-invalid={errs[k] ? true : undefined} aria-describedby={errs[k] ? `${id}-err` : undefined} />
      {errs[k] && (
        <span id={`${id}-err`} className="field-err">
          {errs[k]}
        </span>
      )}
    </div>
  );
  return (
    <form id="password" className="card pad-lg col rise scroll-mt-24 gap-[18px]" style={{ "--i": 3 } as React.CSSProperties} onSubmit={submit} noValidate>
      <div className="col gap-0.5">
        <h2 className="h3">Password</h2>
        <span className="xs muted">At least 8 characters.</span>
      </div>
      <div className="grid grid-cols-3 gap-4 max-lg:grid-cols-1">
        {field("pw-current", "current", "Current password", "current-password")}
        {field("pw-new", "next", "New password", "new-password")}
        {field("pw-confirm", "confirm", "Repeat new password", "new-password")}
      </div>
      <div className="row wrap justify-end gap-2">
        {general && (
          <span className="sm mr-auto" role="alert" style={{ color: "var(--red-600)" }}>
            {general}
          </span>
        )}
        {m.isSuccess && (
          <span className="sm muted mr-auto" role="status">
            Password changed.
          </span>
        )}
        <button type="submit" className="btn btn-primary" disabled={m.isPending}>
          {m.isPending && <Spinner size={16} />}
          Change password
        </button>
      </div>
    </form>
  );
}
