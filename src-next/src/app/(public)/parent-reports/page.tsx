"use client";

// Parent-Reports (batch 9, owner approved v246; rule 9): the page a parent opens from one SMS for two or more children
// (`iitpulse.in/s/<code>` → this institute's student host `/parent-reports?t=<token1>.<token2>`). Public: no sign-in,
// no menu, no session, noindex, no-store; the institute's branding. Shows only the children the SMS named, each with
// score, rank and "Open report (PDF)". States: two or more children, one child, link expired (30 days), link invalid,
// loading, error. Phone first. Each report: GET /tests/public/parent-reports/:token (api-tests docs/batch8-api.md).
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Skel } from "@/components/student/common";
import { supportCode } from "@/components/student/states";
import { PublicTop } from "@/components/public/public-top";
import { initialsOf } from "@/components/shell/avatar";
import { useBrand } from "@/lib/brand";
import { API_GATEWAY, StudentApiError } from "@/lib/student-api";
import { dayMonth, dowDayMonth, ist } from "@/lib/time";

interface ParentReportLite {
  now?: string;
  expiresAt: string | null;
  testCopy?: boolean;
  student: { name: string; firstName: string; batch: string | null };
  test: { testId: string; name: string; shortName?: string | null; maxScore: number; publishedAt?: string | null };
  submission: { submittedAt: string; score: number; rank: number | null; of: number } | null;
  /** a short-lived signed PDF link (rule 9), when the API gives one */
  pdfUrl?: string | null;
  /** how to reach the institute for a new link, when the API gives it */
  contact?: { phone?: string | null; email?: string | null } | null;
}
type Loaded = { token: string; r: ParentReportLite };
type Failure = { kind: "expired" | "invalid" | "error"; error: unknown; contact?: ParentReportLite["contact"] };

async function fetchReport(token: string): Promise<ParentReportLite> {
  let res: Response;
  try {
    res = await fetch(`${API_GATEWAY}/tests/public/parent-reports/${encodeURIComponent(token)}`, { cache: "no-store", credentials: "omit", referrerPolicy: "no-referrer" });
  } catch {
    throw new StudentApiError(0, "You seem to be offline.");
  }
  const j = (await res.json().catch(() => null)) as { success?: boolean; data?: ParentReportLite; code?: string; message?: string; details?: Record<string, unknown> } | null;
  if (!res.ok || !j?.success || !j.data) throw new StudentApiError(res.status, j?.message || "", j?.code as never, j?.details);
  return j.data;
}

const failureOf = (e: unknown): Failure => {
  const x = e instanceof StudentApiError ? e : null;
  const contact = (x?.details?.contact as Failure["contact"]) ?? null;
  if (x?.status === 410 && x.code === "LINK_EXPIRED") return { kind: "expired", error: e, contact };
  if (x && (x.status === 404 || x.status === 400 || x.status === 410)) return { kind: "invalid", error: e, contact };
  return { kind: "error", error: e };
};

/** The institute's student host → its admin host, where the full printable report lives today (fallback for the PDF). */
function adminReportUrl(token: string): string {
  if (typeof window === "undefined") return "#";
  const { protocol, hostname, port } = window.location;
  let host = hostname;
  if (hostname === "localhost" || hostname === "127.0.0.1") return `${protocol}//${hostname}:${port === "3001" ? "3000" : port}/parent-report/${encodeURIComponent(token)}`;
  if (hostname === "tests.iitpulse.in") host = "app.iitpulse.in";
  else if (hostname === "staging-tests.iitpulse.in") host = "staging-app.iitpulse.in";
  else if (hostname.endsWith(".iitpulse.in")) host = hostname.replace(/\.iitpulse\.in$/, "-admin.iitpulse.in");
  return `${protocol}//${host}/parent-report/${encodeURIComponent(token)}`;
}

const names = (kids: Loaded[]) => {
  const f = kids.map((k) => k.r.student.firstName || k.r.student.name);
  return f.length <= 1 ? f.join("") : `${f.slice(0, -1).join(", ")} and ${f[f.length - 1]}`;
};

export default function ParentReportsPage() {
  return (
    <Suspense fallback={null}>
      <ParentReports />
    </Suspense>
  );
}

function ParentReports() {
  const sp = useSearchParams();
  const t = sp.get("t") ?? "";
  // the gateway sends an expired parent link as ?state=expired (api-users docs/sms-api.md §7 v1.1)
  const expiredLink = sp.get("state") === "expired";
  const tokens = t.split(".").map((s) => s.trim()).filter((s) => /^[A-Za-z0-9_-]{8,}$/.test(s)).slice(0, 6);
  const key = tokens.join(".");
  const brand = useBrand();
  const inst = brand.isDefault ? "IIT-PULSE Indore" : brand.name;
  const [state, setState] = useState<{ key: string; kids: Loaded[]; fail: Failure | null } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [stop, setStop] = useState<"ask" | "busy" | "done" | "failed" | null>(null);

  useEffect(() => {
    if (!key || expiredLink) return;
    let live = true;
    Promise.allSettled(key.split(".").map((tk) => fetchReport(tk).then((r) => ({ token: tk, r })))).then((res) => {
      if (!live) return;
      const kids = res.flatMap((x) => (x.status === "fulfilled" ? [x.value] : []));
      const firstFail = res.find((x) => x.status === "rejected") as PromiseRejectedResult | undefined;
      setState({ key, kids, fail: firstFail ? failureOf(firstFail.reason) : null });
    });
    return () => {
      live = false;
    };
  }, [key, attempt, expiredLink]);

  const loaded = state && state.key === key ? state : null;
  const view: "loading" | "list" | Failure["kind"] = expiredLink ? "expired" : !key ? "invalid" : !loaded ? "loading" : loaded.kids.length ? "list" : loaded.fail?.kind ?? "invalid";
  const kids = loaded?.kids ?? [];
  const first = kids[0]?.r;
  const sameTest = kids.every((k) => k.r.test.testId === first?.test.testId);
  const until = kids.map((k) => k.r.expiresAt).filter(Boolean).sort()[0] ?? null;
  const contact = loaded?.fail?.contact ?? kids.find((k) => k.r.contact)?.r.contact ?? null;
  const ask = contact?.phone ? `tel:${contact.phone.replace(/[^\d+]/g, "")}` : contact?.email ? `mailto:${contact.email}` : null;

  const stopAll = async () => {
    setStop("busy");
    const r = await Promise.allSettled(kids.map((k) => fetch(`${API_GATEWAY}/tests/public/parent-reports/${encodeURIComponent(k.token)}/stop`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}", credentials: "omit" }).then((x) => (x.ok ? x : Promise.reject(x)))));
    setStop(r.every((x) => x.status === "fulfilled") ? "done" : "failed");
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <PublicTop
        right={
          <>
            <span className="xs muted md:hidden">Result reports</span>
            <span className="sm muted max-md:hidden">Result reports for parents</span>
          </>
        }
      />
      <main className="col flex-1 items-center px-4 py-[18px] md:p-8">
        <div className="col w-full max-w-[640px] flex-1 gap-3.5 md:gap-4">
          {view === "list" && first && (
            <>
              <div className="col gap-1">
                <h1 className="h2 m-0 text-[22px] md:text-[30px]">{kids.length === 1 ? `${names(kids)}'s result` : `Results for ${names(kids)}`}</h1>
                {sameTest && (
                  <span className="sm muted">
                    {first.test.name}
                    {first.submission ? ` · written ${dowDayMonth(first.submission.submittedAt)}` : ""}
                    {first.test.publishedAt ? ` · results published ${dayMonth(first.test.publishedAt)}` : ""}
                  </span>
                )}
              </div>
              <div className="grid gap-3.5 md:[grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]">
                {kids.map((k, i) => (
                  <Kid key={k.token} k={k} i={i} showTest={!sameTest} />
                ))}
              </div>
              {loaded?.fail && <p className="xs muted m-0">One report on this link couldn&apos;t be opened. Ask {inst} to send it again.</p>}
              <p className="xs m-0 leading-normal" style={{ color: "#575C75" }}>
                {until ? `This link works until ${ist(until).dow} ${ist(until).day} ${ist(until).mon} ${ist(until).year}. ` : ""}Anyone with it can open these reports, so please don&apos;t forward it.{" "}
                {stop === null && (
                  <button type="button" className="au-inl" style={{ color: "var(--navy)", minHeight: 0, display: "inline" }} onClick={() => setStop("ask")}>
                    Stop result messages
                  </button>
                )}
              </p>
              {stop && stop !== "done" && (
                <div className="card pad col gap-2" role="group" aria-label="Stop result messages">
                  <span className="sm">
                    You&apos;ll stop getting test results about {names(kids)} from {inst}. This page keeps working until its link expires.
                  </span>
                  <div className="row wrap gap-2">
                    <button type="button" className="btn btn-primary btn-sm max-md:h-11 max-md:flex-1" onClick={stopAll} disabled={stop === "busy"}>
                      {stop === "busy" ? "Stopping…" : "Stop result messages"}
                    </button>
                    <button type="button" className="btn btn-ghost btn-sm max-md:h-11" onClick={() => setStop(null)} disabled={stop === "busy"}>
                      Keep getting them
                    </button>
                  </div>
                  {stop === "failed" && (
                    <span className="xs" role="alert" style={{ color: "var(--red-600)" }}>
                      That didn&apos;t save. Try again in a moment.
                    </span>
                  )}
                </div>
              )}
              {stop === "done" && (
                <p className="sm m-0" role="status">
                  Result messages stopped. This page keeps working until its link expires.
                </p>
              )}
            </>
          )}

          {view === "loading" && (
            <div className="col gap-3 md:gap-3.5" aria-busy="true" aria-label="Loading reports">
              <Skel className="h-[52px] rounded-[10px] md:h-[60px]" />
              <div className="grid gap-3 md:grid-cols-2 md:gap-3.5">
                <Skel className="h-[200px] rounded-2xl" />
                <Skel className="h-[200px] rounded-2xl" />
              </div>
            </div>
          )}

          {(view === "expired" || view === "invalid" || view === "error") && (
            <div className="pub-ctr flex-1 justify-center self-center px-2 md:flex-none md:max-w-[440px] md:pt-[120px]" role={view === "error" ? "alert" : "status"}>
              <span className={view === "error" ? "pub-ico red" : "pub-ico"} aria-hidden="true">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" focusable="false">
                  <circle cx="12" cy="12" r="9" />
                  <path d={view === "expired" ? "M12 7v5l3 2" : view === "invalid" ? "M9 9l6 6M15 9l-6 6" : "M12 7.5v5.5M12 16.5h.01"} />
                </svg>
              </span>
              <h1 className="h2 m-0 max-md:text-[22px]">{view === "expired" ? "This link has expired" : view === "invalid" ? "This link doesn't work" : "Couldn't load the reports"}</h1>
              <p className="sm muted m-0 md:text-base">
                {view === "expired"
                  ? `Report links work for 30 days. ${inst} can send you a new one.`
                  : view === "invalid"
                    ? `It may be cut short or mistyped. Open it again from the SMS, or ask ${inst} for a new one.`
                    : "Something failed on our side. The link still works; try again in a moment."}
              </p>
              {view === "error" ? (
                <>
                  <button type="button" className="btn btn-primary btn-lg max-md:w-full" onClick={() => setAttempt((a) => a + 1)}>
                    Try again
                  </button>
                  <span className="xs muted mono">Code {supportCode(loaded?.fail?.error)}</span>
                </>
              ) : ask ? (
                <a href={ask} className="btn btn-primary btn-lg max-md:w-full">
                  Ask {inst} for a new link
                </a>
              ) : (
                // no contact on file for the institute (backend gap): say it plainly, no button that does nothing
                <p className="sm m-0 font-semibold">Ask {inst} for a new link.</p>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function Kid({ k, i, showTest }: { k: Loaded; i: number; showTest: boolean }) {
  const r = k.r;
  const s = r.submission;
  const href = r.pdfUrl || adminReportUrl(k.token);
  const first = r.student.firstName || r.student.name;
  return (
    <article className="pr-kid" aria-label={r.student.name}>
      <div className="row gap-2.5">
        <span className="avatar" aria-hidden="true" data-initials={initialsOf(r.student.name)} style={i % 2 ? { background: "#E9F6EE", color: "#0B4D27" } : undefined} />
        <span className="col gap-px">
          <span className="h3">{r.student.name}</span>
          <span className="xs muted">{[showTest ? r.test.name : null, r.student.batch].filter(Boolean).join(" · ")}</span>
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="pr-stat">
          <span className="l">Score</span>
          <b>
            {s ? s.score : "–"}
            <span className="xs muted font-medium"> / {r.test.maxScore}</span>
          </b>
        </div>
        <div className="pr-stat">
          <span className="l">Rank</span>
          <b>
            {s?.rank ?? "–"}
            {s && <span className="xs muted font-medium"> of {s.of}</span>}
          </b>
        </div>
      </div>
      <a href={href} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" className="btn btn-primary w-full max-md:min-h-12" aria-label={`Open ${first}'s report, PDF`}>
        Open report (PDF)
      </a>
    </article>
  );
}
