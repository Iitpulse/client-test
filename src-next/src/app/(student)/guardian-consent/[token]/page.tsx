"use client";

// Under-18 guardian consent, the parent's side (batch 7; public, no sign-in): the link in the guardianConsent email.
// Shows who asked, links the Terms and the Privacy Policy, and records "I agree" (time, IP, user agent and the
// versions, on the server). States: loading, pending, confirmed, invalid link, expired link, error.
import Link from "next/link";
import { use, useEffect, useState } from "react";
import { LogoMark } from "@iitpulse/ui";
import { batch7Api } from "@/lib/batch7-api";
import { StudentApiError } from "@/lib/student-api";
import { dayMonth } from "@/lib/time";
import type { GuardianConsentPublic } from "@/types/batch7";

type State = { kind: "loading" } | { kind: "ok"; data: GuardianConsentPublic } | { kind: "invalid" } | { kind: "expired" } | { kind: "error"; msg: string };

export default function GuardianConsentPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [st, setSt] = useState<State>({ kind: "loading" });
  const [agree, setAgree] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    batch7Api
      .consentPublic(token, ac.signal)
      .then((data) => {
        setSt({ kind: "ok", data });
        setName(data.guardian.name ?? "");
      })
      .catch((e) => {
        if ((e as Error)?.name === "AbortError") return;
        if (e instanceof StudentApiError && e.code === "CONSENT_LINK_EXPIRED") setSt({ kind: "expired" });
        else if (e instanceof StudentApiError && (e.code === "CONSENT_LINK_INVALID" || e.status === 404)) setSt({ kind: "invalid" });
        else setSt({ kind: "error", msg: e instanceof StudentApiError ? e.message : "Something went wrong." });
      });
    return () => ac.abort();
  }, [token]);

  const confirm = async () => {
    if (!agree) return setErr("Tick the box to agree.");
    setBusy(true);
    setErr(null);
    try {
      const data = await batch7Api.consentConfirm(token, name.trim() || null);
      setSt({ kind: "ok", data });
    } catch (e) {
      if (e instanceof StudentApiError && e.code === "CONSENT_ALREADY_CONFIRMED") {
        const data = await batch7Api.consentPublic(token).catch(() => null);
        if (data) setSt({ kind: "ok", data });
      } else setErr(e instanceof StudentApiError ? e.message : "Couldn't save that. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col items-center gap-6 px-4 py-10">
      <LogoMark size="lg" />
      <section className="card pad-lg col w-full max-w-[520px] gap-4 max-md:p-5" aria-live="polite">
        {st.kind === "loading" && <p className="sm muted m-0">Loading…</p>}
        {st.kind === "invalid" && (
          <>
            <h1 className="h2 m-0">This link doesn&apos;t work</h1>
            <p className="sm muted m-0">It may have been replaced by a newer email. Ask your child to send it again from their IIT-PULSE profile.</p>
          </>
        )}
        {st.kind === "expired" && (
          <>
            <h1 className="h2 m-0">This link has expired</h1>
            <p className="sm muted m-0">Links work for 7 days. Ask your child to send a new one from their IIT-PULSE profile.</p>
          </>
        )}
        {st.kind === "error" && (
          <>
            <h1 className="h2 m-0">Something went wrong</h1>
            <p className="sm muted m-0">{st.msg} Try opening the link again in a few minutes.</p>
          </>
        )}
        {st.kind === "ok" && st.data.status === "confirmed" && (
          <>
            <h1 className="h2 m-0">Thank you</h1>
            <p className="body m-0">
              You agreed{st.data.confirmedAt ? ` on ${dayMonth(st.data.confirmedAt)}` : ""} to {st.data.institute.name}&apos;s Terms of Use and Privacy Policy for {st.data.student.firstName}. You can close this page.
            </p>
          </>
        )}
        {st.kind === "ok" && st.data.status === "pending" && (
          <>
            <span className="eyebrow">{st.data.institute.name}</span>
            <h1 className="h2 m-0">Agree for {st.data.student.firstName}</h1>
            <p className="body m-0">
              {st.data.student.firstName} is under 18 and uses IIT-PULSE for mock tests, results and study help. Please read the{" "}
              <Link href="/terms" target="_blank">
                Terms of Use
              </Link>{" "}
              and the{" "}
              <Link href="/privacy" target="_blank">
                Privacy Policy
              </Link>
              , which say what we collect and how we use it, then agree below. {st.data.student.firstName} can keep writing tests either way.
            </p>
            <div className="field">
              <label className="label" htmlFor="gp-name">
                Your name
              </label>
              <input id="gp-name" className="input" value={name} maxLength={120} autoComplete="name" onChange={(e) => setName(e.target.value)} />
            </div>
            <label className="row sm items-start gap-2.5" style={{ cursor: "pointer" }}>
              <input type="checkbox" checked={agree} onChange={(e) => { setAgree(e.target.checked); setErr(null); }} style={{ width: 18, height: 18, accentColor: "var(--navy)", margin: "1px 0 0", flex: "none" }} />
              <span>
                I am {st.data.student.firstName}&apos;s parent or guardian ({st.data.guardian.emailMasked}), and I agree to the Terms of Use and the Privacy Policy for them.
              </span>
            </label>
            {err && (
              <span className="xs" role="alert" style={{ color: "#B00000" }}>
                {err}
              </span>
            )}
            <button type="button" className="btn btn-primary btn-lg" disabled={busy} onClick={confirm}>
              {busy ? "Saving…" : "I agree"}
            </button>
            <span className="xs muted">This link works until {dayMonth(st.data.expiresAt)}. Versions: terms {st.data.versions.terms}, privacy {st.data.versions.privacy}.</span>
          </>
        )}
      </section>
      <p className="xs muted m-0">
        <Link href="/terms">Terms of Use</Link> · <Link href="/privacy">Privacy Policy</Link>
      </p>
    </div>
  );
}
