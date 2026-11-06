"use client";

// Under-18 guardian consent (owner, 6 Nov 2026: "build, don't block"; Student-Legal under-18 state, canvas v180).
// Students under 18 give a parent or guardian's email; users emails that person a confirmation link. Nothing is ever
// blocked: tests, results and practice work whatever the status. Shown in Profile (GuardianConsentCard) and in the
// "Complete your profile" wizard's Parent step (GuardianEmailField).
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { batch7Api, b7Keys } from "@/lib/batch7-api";
import { StudentApiError } from "@/lib/student-api";
import { dayMonth } from "@/lib/time";
import type { GuardianConsentStatus } from "@/types/batch7";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function errMsg(e: unknown): string {
  if (!(e instanceof StudentApiError)) return "Couldn't send it right now. Try again.";
  const f = (e.details?.fields ?? {}) as Record<string, { code?: string; message?: string }>;
  if (f.guardianEmail?.code === "SAME_AS_STUDENT") return "Use your parent's or guardian's own email, not yours.";
  if (f.guardianEmail) return "Check the email address.";
  if (e.code === "TOO_MANY_ATTEMPTS") return "You've sent this a few times. Try again a little later.";
  if (e.code === "DOB_REQUIRED") return "Add your date of birth first.";
  return e.message || "Couldn't send it right now. Try again.";
}

export function useGuardianConsent(enabled = true) {
  return useQuery({ queryKey: b7Keys.consent, queryFn: ({ signal }) => batch7Api.consent(signal), enabled, staleTime: 60_000 });
}

/** Profile: the parent or guardian's confirmation, for students under 18 only. */
export function GuardianConsentCard({ className }: { className?: string }) {
  const q = useGuardianConsent();
  const s = q.data;
  if (!s || s.status === "notRequired") return null;
  return (
    <section className={`card pad-lg col gap-3 max-md:p-4 ${className ?? ""}`} aria-labelledby="gc-h">
      <div className="row between wrap gap-2">
        <h2 id="gc-h" className="h3 m-0">
          Parent or guardian
        </h2>
        <StatusBadge s={s} />
      </div>
      <ConsentBody s={s} />
    </section>
  );
}

function StatusBadge({ s }: { s: GuardianConsentStatus }) {
  const map: Record<string, [string, string]> = {
    confirmed: ["b-green", "Confirmed"],
    waiting: ["b-amber", "Waiting for them"],
    expired: ["b-wrong", "Link expired"],
    missing: ["b-grey", "Not asked yet"],
    needsDob: ["b-grey", "Add your date of birth"],
  };
  const [cls, label] = map[s.status] ?? ["b-grey", s.status];
  return <span className={`badge ${cls}`}>{label}</span>;
}

function ConsentBody({ s }: { s: GuardianConsentStatus }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const resend = useMutation({ mutationFn: batch7Api.consentResend, onSuccess: (d) => qc.setQueryData(b7Keys.consent, d) });
  if (s.status === "needsDob")
    return <p className="sm muted m-0">Add your date of birth in your details above. If you&apos;re under 18, we&apos;ll ask a parent or guardian to agree to how IIT-PULSE uses your data.</p>;
  if (s.status === "confirmed")
    return (
      <p className="sm m-0">
        {s.guardian?.name || "Your parent or guardian"} ({s.guardian?.emailMasked}) agreed{s.confirmedAt ? ` on ${dayMonth(s.confirmedAt)}` : ""}. Thank you.
      </p>
    );
  if (s.status === "missing" || editing)
    return (
      <>
        <p className="sm muted m-0">
          You&apos;re under 18, so we ask a parent or guardian to agree to how IIT-PULSE uses your data. We&apos;ll email them a link. You can keep writing tests while we wait.
        </p>
        <GuardianForm initialName={s.guardian?.name ?? ""} onDone={() => setEditing(false)} onCancel={s.status === "missing" ? undefined : () => setEditing(false)} />
      </>
    );
  const canResend = !s.resendAvailableAt || Date.parse(s.resendAvailableAt) <= Date.parse(s.now);
  return (
    <>
      <p className="sm m-0">
        {s.status === "expired"
          ? `The link we sent to ${s.guardian?.emailMasked} has expired. Send a new one.`
          : `We emailed ${s.guardian?.name ? `${s.guardian.name} at ` : ""}${s.guardian?.emailMasked}${s.lastSentAt ? ` on ${dayMonth(s.lastSentAt)}` : ""}. Ask them to open the link and agree.`}{" "}
        You can keep writing tests while we wait.
      </p>
      <div className="row wrap gap-2">
        <button type="button" className="btn btn-secondary" disabled={resend.isPending || !canResend} onClick={() => resend.mutate()}>
          {resend.isPending ? "Sending…" : "Send again"}
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => setEditing(true)}>
          Use another email
        </button>
      </div>
      {!canResend && s.resendAvailableAt && <span className="xs muted">You can send it again after {new Date(s.resendAvailableAt).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}.</span>}
      {resend.isSuccess && <span className="xs" role="status">Sent. It may take a minute to arrive.</span>}
      {resend.error ? <span className="xs" role="alert" style={{ color: "#B00000" }}>{errMsg(resend.error)}</span> : null}
    </>
  );
}

function GuardianForm({ initialName, onDone, onCancel }: { initialName: string; onDone: () => void; onCancel?: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const send = useMutation({
    mutationFn: () => batch7Api.consentRequest({ guardianEmail: email.trim(), guardianName: name.trim() || null }),
    onSuccess: (d) => {
      qc.setQueryData(b7Keys.consent, d);
      onDone();
    },
    onError: (e) => setErr(errMsg(e)),
  });
  return (
    <form
      className="col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!EMAIL.test(email.trim())) return setErr("Enter an email address like name@example.com.");
        setErr(null);
        send.mutate();
      }}
    >
      <div className="grid grid-cols-2 gap-3 max-md:grid-cols-1">
        <div className="field">
          <label className="label" htmlFor="gc-name">
            Their name
          </label>
          <input id="gc-name" className="input" value={name} maxLength={120} autoComplete="off" onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <label className="label" htmlFor="gc-email">
            Their email
          </label>
          <input id="gc-email" type="email" className={err ? "input e" : "input"} value={email} autoComplete="off" onChange={(e) => setEmail(e.target.value)} aria-invalid={!!err || undefined} aria-describedby={err ? "gc-err" : undefined} />
        </div>
      </div>
      {err && (
        <span id="gc-err" className="xs" role="alert" style={{ color: "#B00000" }}>
          {err}
        </span>
      )}
      <div className="row gap-2">
        <button type="submit" className="btn btn-primary" disabled={send.isPending}>
          {send.isPending ? "Sending…" : "Email them the link"}
        </button>
        {onCancel && (
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

/**
 * The wizard's Parent step: the guardian's email for students under 18 (the status route says whether it applies).
 * Optional; the wizard sends it after saving the step and never blocks on it.
 */
export function GuardianEmailField({ value, onChange, error }: { value: string; onChange: (v: string) => void; error?: string }) {
  const q = useGuardianConsent();
  const s = q.data;
  if (!s || (s.status !== "missing" && s.status !== "expired")) return null;
  return (
    <div className="field">
      <label className="label" htmlFor="ob-pemail">
        Parent or guardian&apos;s email
      </label>
      <input id="ob-pemail" type="email" className={error ? "input e" : "input"} value={value} onChange={(e) => onChange(e.target.value)} autoComplete="off" aria-describedby="ob-pemail-h" />
      {error && <span className="xs" role="alert" style={{ color: "#B00000" }}>{error}</span>}
      <span id="ob-pemail-h" className="hint">
        You&apos;re under 18, so we&apos;ll email them a link to agree to how IIT-PULSE uses your data. You can keep writing tests while we wait.
      </span>
    </div>
  );
}

export const guardianEmailOk = (v: string) => !v.trim() || EMAIL.test(v.trim());
