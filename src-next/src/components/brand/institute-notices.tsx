"use client";

import { useEffect, useState } from "react";
import { fetchInstituteState, useBrand, type InstituteState } from "@/lib/brand";

/** The institute's state for the signed-in student: paused (suspended) and AI paused (board Student-InstituteStates). */
export function useInstituteState(): InstituteState {
  const brand = useBrand();
  const [state, setState] = useState<InstituteState | null>(null);
  useEffect(() => {
    let live = true;
    fetchInstituteState().then((s) => {
      if (live) setState(s);
    });
    return () => {
      live = false;
    };
  }, []);
  return { suspended: brand.suspended || !!state?.suspended, aiPaused: state?.aiPaused ?? null };
}

const fmtDay = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" });

/**
 * Board Student-InstituteStates: the amber "New tests can't start right now" bar when the institute's account is
 * paused, and the AI bar when AI review / doubt chat are switched off. Nothing for an institute in good standing.
 */
export function InstituteNotices({ ai = false }: { ai?: boolean }) {
  const { suspended, aiPaused } = useInstituteState();
  if (!suspended && !(ai && aiPaused)) return null;
  return (
    <div className="col mb-4 gap-2.5" data-testid="institute-notices">
      {suspended && (
        <div className="inst-notice warn" role="status">
          <span className="inst-dot" aria-hidden="true" />
          <span>
            <b>New tests can&apos;t start right now.</b> <span className="max-md:hidden">Your institute&apos;s account is paused. Your results, reviews and practice are still here. Ask your institute when tests will be back.</span>
            <span className="md:hidden">Your institute&apos;s account is paused. Results and practice still work.</span>
          </span>
        </div>
      )}
      {ai && aiPaused && (
        <div className="inst-notice ai" role="status">
          <span className="inst-dot" aria-hidden="true" />
          <span>
            <b>{aiPaused.labels.length ? `${joinLabels(aiPaused.labels)} ${aiPaused.labels.length > 1 ? "are" : "is"} taking a break.` : "AI features are taking a break."}</b>{" "}
            {aiPaused.until ? `They'll be back by ${fmtDay(aiPaused.until)}. ` : ""}Your scores, solutions and practice work as usual.
          </span>
        </div>
      )}
    </div>
  );
}

function joinLabels(l: string[]): string {
  const s = l.length > 1 ? `${l.slice(0, -1).join(", ")} and ${l[l.length - 1]!.toLowerCase()}` : l[0]!;
  return s.charAt(0).toUpperCase() + s.slice(1);
}
