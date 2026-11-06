"use client";

// Student-Signup board, views profile-1 / profile-1-error / profile-2 / profile-3: "Complete your profile" over Home.
// Desktop: a 560px dialog on a dimmed page; phone: a bottom sheet (Kit-Overlays). Three steps (About you, Studies,
// Parent); each Continue saves its step (PATCH …/onboarding { step }), "Save profile" completes it ({ complete: true }).
// "Skip for now" stores skippedAt and closes; the wizard asks again at the next sign-in. Esc = Skip for now.
import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useQueryClient } from "@tanstack/react-query";
import { ErrText, PhoneField, Steps } from "@/components/auth/form-bits";
import { Spinner } from "@/components/shell/icons";
import { StudentApiError } from "@/lib/student-api";
import { useProfile } from "@/lib/m4-api";
import { cn } from "@/lib/utils";
import type { OnboardingFields, OnboardingResponse, OnboardingSaveRequest } from "@/types/m6-auth";
import { GuardianEmailField, guardianEmailOk } from "@/components/student/guardian-consent";
import { batch7Api, b7Keys } from "@/lib/batch7-api";
import { onboardingApi } from "./onboarding-api";
import { Picker } from "./picker";

type Errors = Partial<Record<keyof OnboardingFields | "form", string>>;
const GENDERS = ["Male", "Female", "Other"] as const;

/** The only value when a list has one (City "Indore", State "Madhya Pradesh"), so the student doesn't have to pick it. */
const onlyOne = (list: string[]) => (list.length === 1 ? list[0] : null);

function Seg({ label, options, value, onChange }: { label: string; options: string[]; value: string | null; onChange: (v: string) => void }) {
  return (
    <div className="field">
      <span className="label" id={`seg-${label}`}>
        {label}
      </span>
      <div className="seg au-seg" role="radiogroup" aria-labelledby={`seg-${label}`}>
        {options.map((o) => (
          <button key={o} type="button" role="radio" aria-checked={value === o} className={cn("tab", value === o && "on")} onClick={() => onChange(o)}>
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

function errorsFrom(e: unknown): Errors {
  if (!(e instanceof StudentApiError)) return { form: "Couldn't save right now. Please try again." };
  if (e.status === 0) return { form: "You're offline. Connect to the internet and try again." };
  const fields = (e.details?.fields ?? {}) as Record<string, { message?: string } | string>;
  const out: Errors = {};
  for (const [k, v] of Object.entries(fields)) {
    const key = k === "parentDetails.contact" ? "parentPhone" : k === "parentDetails.name" ? "parentName" : k;
    out[key as keyof Errors] = typeof v === "string" ? v : (v?.message ?? "Check this");
  }
  if (!Object.keys(out).length) out.form = e.message;
  return out;
}

export function OnboardingWizard({ studentId, data, onClose }: { studentId: string; data: OnboardingResponse; onClose: () => void }) {
  const qc = useQueryClient();
  const profile = useProfile().data?.profile;
  const { options } = data;
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [v, setV] = useState<OnboardingFields>(() => ({
    ...data.values,
    city: data.values.city ?? onlyOne(options.cities),
    state: data.values.state ?? onlyOne(options.states),
  }));
  const [errors, setErrors] = useState<Errors>({});
  // Batch 7: under 18, the Parent step also asks for a parent or guardian's email (optional, never blocks)
  const [gEmail, setGEmail] = useState("");
  const [gErr, setGErr] = useState<string | undefined>();
  const [busy, setBusy] = useState<"next" | "skip" | null>(null);
  const set = <K extends keyof OnboardingFields>(k: K, val: OnboardingFields[K]) => {
    setV((s) => ({ ...s, [k]: val }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const addressError = (a: string | null) => (!a || a.trim().length < 8 ? "Add your house number and area" : undefined);
  const parentPhoneError = (p: string | null) => (p && p.length !== 10 ? "Phone numbers have 10 digits" : undefined);

  const bodyFor = (s: 1 | 2 | 3): OnboardingSaveRequest => {
    const pick = (keys: Array<keyof OnboardingFields>) => Object.fromEntries(keys.filter((k) => v[k] !== null && v[k] !== "").map((k) => [k, typeof v[k] === "string" ? (v[k] as string).trim() : v[k]]));
    if (s === 1) return { step: 1, ...pick(["gender", "address", "city", "state"]) };
    if (s === 2) return { step: 2, ...pick(["standard", "school", "stream", "medium"]) };
    return { step: 3, ...pick(["parentName", "parentPhone"]), complete: true };
  };

  const next = async () => {
    const local: Errors = step === 1 ? { address: addressError(v.address) } : step === 3 ? { parentPhone: parentPhoneError(v.parentPhone) } : {};
    if (Object.values(local).some(Boolean)) {
      setErrors(local);
      return;
    }
    if (step === 3 && !guardianEmailOk(gEmail)) {
      setGErr("Enter an email address like name@example.com.");
      return;
    }
    setBusy("next");
    setErrors({});
    setGErr(undefined);
    try {
      await onboardingApi.save(studentId, bodyFor(step));
      if (step === 3 && gEmail.trim()) {
        try {
          const st = await batch7Api.consentRequest({ guardianEmail: gEmail.trim(), guardianName: v.parentName?.trim() || null });
          qc.setQueryData(b7Keys.consent, st);
        } catch (e) {
          const f = (e instanceof StudentApiError ? (e.details?.fields ?? {}) : {}) as Record<string, { code?: string }>;
          setGErr(f.guardianEmail?.code === "SAME_AS_STUDENT" ? "Use your parent's or guardian's own email, not yours." : "Couldn't email them. Check the address, or skip and do it later from Profile.");
          return;
        }
      }
      if (step < 3) setStep((step + 1) as 2 | 3);
      else {
        qc.invalidateQueries({ queryKey: ["student"] });
        onClose();
      }
    } catch (e) {
      setErrors(errorsFrom(e));
    } finally {
      setBusy(null);
    }
  };

  const skip = async () => {
    if (busy) return;
    setBusy("skip");
    try {
      await onboardingApi.skip();
    } catch {
      // Skipping must never trap the student: close anyway; the wizard asks again at the next sign-in.
    }
    setBusy(null);
    onClose();
  };

  const firstName = profile?.firstName || "";
  const eyebrow = ["Welcome" + (firstName ? `, ${firstName}` : ""), profile?.batch?.name].filter(Boolean).join(" · ");

  return (
    <Dialog.Root open onOpenChange={(o) => !o && skip()}>
      <Dialog.Portal>
        <Dialog.Overlay className="wiz-scrim" />
        <Dialog.Content
          className="wiz fade"
          aria-describedby="wiz-desc"
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => {
            // Esc inside an open list closes only the list
            if ((e.target as HTMLElement | null)?.closest?.(".au-pop")) e.preventDefault();
          }}
        >
          <div className="col" style={{ gap: 6 }}>
            <span className="eyebrow">{eyebrow}</span>
            <Dialog.Title className="h1" style={{ margin: 0 }}>
              Complete your profile
            </Dialog.Title>
            <Dialog.Description id="wiz-desc" className="sm muted" style={{ margin: 0 }}>
              Your teachers use this to plan classes and reach your parents. Takes a minute.
            </Dialog.Description>
          </div>
          <Steps labels={["About you", "Studies", "Parent"]} current={step} label="Profile steps" onGo={(n) => setStep(n as 1 | 2 | 3)} />

          {step === 1 && (
            <div className="col fade" style={{ gap: 14 }}>
              <Seg label="Gender" options={[...GENDERS]} value={v.gender} onChange={(g) => set("gender", g as OnboardingFields["gender"])} />
              <div className="field">
                <label className="label" htmlFor="ob-address">
                  Address
                </label>
                <input
                  id="ob-address"
                  className={cn("input", errors.address && "e")}
                  value={v.address ?? ""}
                  onChange={(e) => set("address", e.target.value)}
                  onBlur={() => v.address && setErrors((er) => ({ ...er, address: addressError(v.address) }))}
                  autoComplete="street-address"
                  maxLength={500}
                  aria-invalid={!!errors.address || undefined}
                  aria-describedby={errors.address ? "ob-address-e" : undefined}
                />
                {errors.address && <ErrText id="ob-address-e">{errors.address}</ErrText>}
              </div>
              <div className="au-g2">
                <div className="field">
                  <label className="label" htmlFor="ob-city">
                    City
                  </label>
                  <Picker id="ob-city" label="City" value={v.city} options={options.cities} onChange={(c) => set("city", c)} placeholder="Pick a city" invalid={!!errors.city} describedBy={errors.city ? "ob-city-e" : undefined} />
                  {errors.city && <ErrText id="ob-city-e">{errors.city}</ErrText>}
                </div>
                <div className="field">
                  <label className="label" htmlFor="ob-state">
                    State
                  </label>
                  <Picker id="ob-state" label="State" value={v.state} options={options.states} onChange={(s) => set("state", s)} placeholder="Pick a state" invalid={!!errors.state} describedBy={errors.state ? "ob-state-e" : undefined} />
                  {errors.state && <ErrText id="ob-state-e">{errors.state}</ErrText>}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="col fade" style={{ gap: 14 }}>
              <div className="au-g2">
                <div className="field">
                  <label className="label" htmlFor="ob-class">
                    Class
                  </label>
                  <Picker id="ob-class" label="Class" value={v.standard} options={options.standards} onChange={(c) => set("standard", c)} placeholder="Pick a class" invalid={!!errors.standard} />
                  {errors.standard && <ErrText>{errors.standard}</ErrText>}
                </div>
                <div className="field">
                  <label className="label" htmlFor="ob-school">
                    School
                  </label>
                  <input id="ob-school" className={cn("input", errors.school && "e")} value={v.school ?? ""} onChange={(e) => set("school", e.target.value)} maxLength={200} autoComplete="organization" />
                  {errors.school && <ErrText>{errors.school}</ErrText>}
                </div>
              </div>
              <Seg label="Stream" options={options.streams} value={v.stream} onChange={(s) => set("stream", s)} />
              <Seg label="Medium" options={options.mediums} value={v.medium} onChange={(m) => set("medium", m)} />
            </div>
          )}

          {step === 3 && (
            <div className="col fade" style={{ gap: 14 }}>
              <div className="field">
                <label className="label" htmlFor="ob-pname">
                  Parent&apos;s name
                </label>
                <input id="ob-pname" className={cn("input", errors.parentName && "e")} value={v.parentName ?? ""} onChange={(e) => set("parentName", e.target.value)} maxLength={120} autoComplete="off" />
                {errors.parentName && <ErrText>{errors.parentName}</ErrText>}
              </div>
              <div className="field">
                <label className="label" htmlFor="ob-pphone">
                  Parent&apos;s phone
                </label>
                <PhoneField
                  id="ob-pphone"
                  value={v.parentPhone ?? ""}
                  onChange={(d) => set("parentPhone", d || null)}
                  onBlur={() => setErrors((er) => ({ ...er, parentPhone: parentPhoneError(v.parentPhone) }))}
                  invalid={!!errors.parentPhone}
                  describedBy={errors.parentPhone ? "ob-pphone-e ob-pphone-h" : "ob-pphone-h"}
                  autoComplete="off"
                />
                {errors.parentPhone && <ErrText id="ob-pphone-e">{errors.parentPhone}</ErrText>}
                <span id="ob-pphone-h" className="hint">
                  Used only by your institute, for results and fee reminders.
                </span>
              </div>
              <GuardianEmailField value={gEmail} onChange={(x) => { setGEmail(x); setGErr(undefined); }} error={gErr} />
            </div>
          )}

          {errors.form && <ErrText icon>{errors.form}</ErrText>}
          <div className="row between wrap" style={{ gap: 10 }}>
            <button type="button" className="btn btn-ghost" onClick={skip} disabled={!!busy}>
              {busy === "skip" && <Spinner size={16} />}
              Skip for now
            </button>
            <div className="row" style={{ gap: 8 }}>
              {step > 1 && (
                <button type="button" className="btn btn-secondary btn-lg" onClick={() => setStep((step - 1) as 1 | 2)} disabled={!!busy}>
                  Back
                </button>
              )}
              <button type="button" className="btn btn-primary btn-lg" onClick={next} disabled={!!busy}>
                {busy === "next" && <Spinner size={16} />}
                {step === 3 ? "Save profile" : "Continue"}
              </button>
            </div>
          </div>
          <span className="xs muted">Skip and we&apos;ll ask again next time you sign in. You can always edit this in Profile.</span>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
