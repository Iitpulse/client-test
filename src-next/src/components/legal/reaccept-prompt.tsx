"use client";

// Student-Legal, "re-accept": mounted in the signed-in student shell. After sign-in it reads `legal` from
// GET /users/student/me; when needsAcceptance it opens "We've updated our terms" (Accept and continue / Sign out).
// It never reaches the frozen exam screens: those live in their own root layout ((exam)), so a test in progress is
// never interrupted and the dialog shows on the next shell page after submit. Failures (Mongo stacks, offline) show
// nothing.
import { useEffect, useState } from "react";
import { Sheet } from "@/components/student/sheet";
import { useAuthHydrated, useAuthStore } from "@/stores/auth.store";
import { LEGAL_CHANGES, legalApi, markLegalSettled, type LegalStatus } from "@/lib/legal-api";
import { StudentApiError } from "@/lib/student-api";

export function ReacceptPrompt() {
  const hydrated = useAuthHydrated();
  const user = useAuthStore((s) => s.currentUser);
  const logout = useAuthStore((s) => s.logout);
  const [legal, setLegal] = useState<LegalStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!hydrated) return;
    if (!user || user.userType !== "student") return markLegalSettled();
    const ctl = new AbortController();
    legalApi
      .status(ctl.signal)
      .then((l) => {
        if (l?.needsAcceptance) setLegal(l);
        else markLegalSettled();
      })
      .catch((e) => {
        if ((e as Error)?.name !== "AbortError") markLegalSettled();
      });
    return () => ctl.abort();
  }, [hydrated, user]);

  if (!legal) return null;
  const changes = LEGAL_CHANGES[legal.current.terms] ?? [];
  const updated = !!legal.accepted;

  const accept = async () => {
    setBusy(true);
    setErr(null);
    try {
      await legalApi.accept(legal.current);
      setLegal(null);
      markLegalSettled();
    } catch (e) {
      const ex = e as StudentApiError;
      if (ex.code === "LEGAL_VERSION_CHANGED") {
        const current = (ex.details as { current?: LegalStatus["current"] } | undefined)?.current;
        if (current) setLegal({ ...legal, current });
        setErr("The terms changed a moment ago. Read the new ones, then accept.");
      } else setErr(ex.message || "Couldn’t save that. Try again.");
    } finally {
      setBusy(false);
    }
  };
  const signOut = () => {
    logout();
    window.location.replace("/login");
  };

  return (
    <Sheet
      open
      onOpenChange={() => {}}
      dismissible={false}
      title={updated ? "We’ve updated our terms" : "Our terms and privacy policy"}
      description={
        updated
          ? changes.length
            ? "The new Terms of Use and Privacy Policy apply now. Here’s what changed:"
            : "We’ve published new versions of the Terms of Use and the Privacy Policy."
          : "Please read the Terms of Use and the Privacy Policy and accept them to keep using IIT-PULSE."
      }
      footer={
        <>
          <button type="button" className="btn btn-ghost btn-lg" onClick={signOut} disabled={busy}>
            Sign out
          </button>
          <button type="button" className="btn btn-primary btn-lg" onClick={accept} disabled={busy} aria-busy={busy || undefined}>
            {busy ? "Saving…" : "Accept and continue"}
          </button>
        </>
      }
    >
      <div className="col" style={{ gap: 12 }}>
        {changes.length > 0 && (
          <ul className="sm" style={{ margin: 0, padding: "12px 14px 12px 32px", borderRadius: 12, background: "var(--cl-navy-50, #F7F7FD)", border: "1px solid #E1E3F8" }}>
            {changes.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        )}
        <span className="sm">
          Read them in full:{" "}
          <a href="/terms" target="_blank" rel="noopener">
            Terms of Use
          </a>{" "}
          ·{" "}
          <a href="/privacy" target="_blank" rel="noopener">
            Privacy Policy
          </a>
        </span>
        {err && (
          <span className="sm" role="alert" style={{ color: "#C40000", fontWeight: 600 }}>
            {err}
          </span>
        )}
        <span className="xs muted">You need to accept to keep using IIT-PULSE. A test you’ve already started is never interrupted: this shows after you submit.</span>
      </div>
    </Sheet>
  );
}
