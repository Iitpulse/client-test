"use client";

// Student-Revision / Phone-Revision (batch 7, canvas v180): the student's Revision list, its own navigation item
// (/revision). Filters: subject (segmented, with counts), chapter (searchable picker), a search box. Desktop: a table
// that fills the screen below the header (only the rows scroll; owner's table rule); phone: a list with check boxes and
// a sticky action bar. Select → Practise (a new practice set, timed or untimed) or Remove (Undo). "Practise all"
// practises the whole filter (newest 100). States: loading, error, empty, no match.
import Link from "next/link";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { InkUnderline } from "@iitpulse/ui";
import { batch7Api, b7Keys, useRevisionPractice, useRevisionWrites, type RevisionFilter } from "@/lib/batch7-api";
import { StudentApiError } from "@/lib/student-api";
import { dayMonth } from "@/lib/time";
import { PhoneTitleBar } from "@/components/shell/phone-title-bar";
import { Picker } from "@/components/onboarding/picker";
import type { RevisionItem, RevisionOutcome } from "@/types/batch7";
import { ErrorCard, Skel } from "./common";
import { B7ToastBar, useB7Toast } from "./revision-bits";

const PAGE = 50;
const OUTCOME: Record<RevisionOutcome, { label: string; dot: React.CSSProperties }> = {
  correct: { label: "Correct in the test", dot: { background: "#0E7A3D" } },
  partial: { label: "Partly right in the test", dot: { background: "#B26A00" } },
  wrong: { label: "Wrong in the test", dot: { background: "#C40000" } },
  skipped: { label: "Skipped in the test", dot: { background: "#fff", border: "1.5px dashed #8A90A8" } },
};

function useDebounced<T>(v: T, ms: number): T {
  const [d, setD] = useState(v);
  useEffect(() => {
    const id = setTimeout(() => setD(v), ms);
    return () => clearTimeout(id);
  }, [v, ms]);
  return d;
}

/**
 * Height that fills the window below the element (min 320px), so the page itself does not scroll. `reserve` is the
 * space the layout keeps under the table (main's bottom padding and the shell's, 88px on desktop); the shell is
 * min-height 100dvh, so the free space can't be measured from the page height.
 */
function useFill<T extends HTMLElement>(reserve = 88) {
  const ref = useRef<T>(null);
  const [h, setH] = useState<number | null>(null);
  useLayoutEffect(() => {
    const calc = () => {
      const el = ref.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top + window.scrollY;
      const next = Math.max(320, Math.floor(window.innerHeight - top - reserve));
      setH((cur) => (cur === next ? cur : next));
    };
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  });
  return [ref, h] as const;
}

export function RevisionView() {
  const [subject, setSubjectRaw] = useState("");
  const [chapter, setChapterRaw] = useState("");
  const [draft, setDraft] = useState("");
  const q = useDebounced(draft.trim().slice(0, 80), 300);
  const [pageRaw, setPageRaw] = useState({ page: 1, q: "" });
  const [selRaw, setSel] = useState<{ ids: string[]; key: string }>({ ids: [], key: "" });
  // A new filter starts on page 1 with nothing selected (the search box applies after its debounce)
  const page = pageRaw.q === q ? pageRaw.page : 1;
  const setPage = (n: number) => setPageRaw({ page: n, q });
  const selKey = `${subject}|${chapter}|${q}|${page}`;
  const sel = selRaw.key === selKey ? selRaw.ids : [];
  const setSelIds = (ids: string[]) => setSel({ ids, key: selKey });
  const setSubject = (v: string) => {
    setSubjectRaw(v);
    setPageRaw({ page: 1, q });
  };
  const setChapter = (v: string) => {
    setChapterRaw(v);
    setPageRaw({ page: 1, q });
  };
  const [timed, setTimed] = useState(false);
  const [toast, setToast] = useB7Toast();
  const filter: RevisionFilter = { subject: subject || undefined, chapter: chapter || undefined, q: q || undefined, page, pageSize: PAGE };
  const listQ = useQuery({
    queryKey: b7Keys.revision(filter),
    queryFn: ({ signal }) => batch7Api.revision(filter, signal),
    placeholderData: keepPreviousData,
  });
  // The facets of the whole list (no filter), for the subject counts and the chapter picker
  const allQ = useQuery({ queryKey: b7Keys.revision({ pageSize: 1 }), queryFn: ({ signal }) => batch7Api.revision({ pageSize: 1 }, signal) });
  const { add, removeMany } = useRevisionWrites();
  const practise = useRevisionPractice();


  const data = listQ.data;
  const items = data?.items ?? [];
  const facets = allQ.data?.facets ?? data?.facets;
  const total = allQ.data?.total ?? 0;
  const chapters = useMemo(
    () => (facets?.chapters ?? []).filter((c) => !subject || c.subject === subject).map((c) => c.chapter),
    [facets, subject]
  );
  const filtered = !!(subject || chapter || q);
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  const removeIds = (ids: string[]) => {
    const gone = items.filter((i) => ids.includes(i.id));
    removeMany.mutate(ids, {
      onSuccess: () => {
        setSelIds([]);
        setToast({
          msg: `Removed ${ids.length} ${ids.length === 1 ? "question" : "questions"}.`,
          undo: () => add.mutate(gone.map((g) => ({ testId: g.testId, questionId: g.questionId, note: g.note }))),
        });
      },
      onError: (e) => setToast({ msg: e instanceof StudentApiError ? e.message : "Couldn't remove them. Try again.", err: true }),
    });
  };
  const start = (body: { ids?: string[]; subject?: string; chapter?: string }) =>
    practise.mutate({ ...body, timed }, { onError: (e) => setToast({ msg: e instanceof StudentApiError ? e.message : "Couldn't start practice. Try again.", err: true }) });

  const empty = !!allQ.data && allQ.data.total === 0;
  const sub = empty ? "Saved questions" : `${total} saved ${total === 1 ? "question" : "questions"}`;

  return (
    <>
      <PhoneTitleBar title="Revision list" doodle="integral">
        <span className="xs muted">{sub}</span>
      </PhoneTitleBar>
      <main className="col gap-[18px] pb-6 max-md:gap-3 max-md:px-4 max-md:pt-3 md:pt-2">
        <header className="row between wrap items-end gap-4 max-md:hidden">
          <div className="col gap-1.5">
            <h1 className="h1 m-0">
              <InkUnderline delay={300}>Revision list</InkUnderline>
            </h1>
            <span className="sm muted">{sub}</span>
          </div>
          {!empty && total > 0 && (
            <div className="row gap-2">
              <TimedSeg timed={timed} onChange={setTimed} />
              <button type="button" className="btn btn-primary btn-lg" disabled={practise.isPending} onClick={() => start({ subject: subject || undefined, chapter: chapter || undefined })}>
                {filtered ? `Practise these ${Math.min(100, data?.total ?? 0)}` : `Practise all ${Math.min(100, total)}`}
              </button>
            </div>
          )}
        </header>

        {listQ.isError && !data ? (
          <ErrorCard error={listQ.error} onRetry={() => listQ.refetch()} />
        ) : empty ? (
          <EmptyState />
        ) : (
          <>
            <div className="row wrap gap-2.5">
              <div className="seg max-md:w-full max-md:overflow-x-auto" role="radiogroup" aria-label="Subject">
                {[{ subject: "", count: total }, ...(facets?.subjects ?? [])].map((f) => (
                  <button key={f.subject || "all"} type="button" role="radio" aria-checked={subject === f.subject} className={subject === f.subject ? "tab on" : "tab"} onClick={() => { setSubject(f.subject); setChapter(""); }}>
                    {f.subject || "All"} <span className="count">{f.count}</span>
                  </button>
                ))}
              </div>
              <div className="w-[240px] max-md:w-full">
                <Picker
                  id="rv-chapter"
                  label="Chapter"
                  ariaLabel="Chapter"
                  value={chapter || "All chapters"}
                  options={["All chapters", ...chapters]}
                  onChange={(v) => setChapter(v === "All chapters" ? "" : v)}
                />
              </div>
              <input
                type="search"
                className="input w-[240px] max-md:w-full"
                placeholder="Search saved questions"
                aria-label="Search saved questions"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
              />
              <span className="grow" />
              <div className="md:hidden w-full">
                <TimedSeg timed={timed} onChange={setTimed} />
              </div>
            </div>

            {!data && listQ.isPending ? (
              <div className="col gap-2" aria-busy="true" aria-label="Loading your revision list">
                {[0, 1, 2, 3, 4].map((k) => (
                  <Skel key={k} className="h-14 w-full rounded-xl" />
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="card pad col items-center gap-2 text-center">
                <span className="h3">No saved questions match</span>
                <span className="sm muted">Try another subject or chapter, or clear the search.</span>
                <button type="button" className="btn btn-secondary" onClick={() => { setSubject(""); setChapter(""); setDraft(""); }}>
                  Show all
                </button>
              </div>
            ) : (
              <>
                <DesktopTable items={items} sel={sel} setSel={setSelIds} page={page} pages={pages} total={data?.total ?? 0} setPage={setPage} onRemove={removeIds} onPractise={(ids) => start({ ids })} busy={practise.isPending || removeMany.isPending} />
                <PhoneList items={items} sel={sel} setSel={setSelIds} page={page} pages={pages} setPage={setPage} />
              </>
            )}
          </>
        )}
      </main>
      {/* Phone: the sticky action bar above the tab bar */}
      {!empty && items.length > 0 && (
        <div className="sticky bottom-[calc(64px+env(safe-area-inset-bottom))] z-10 row gap-2 border-t border-line bg-white/95 px-4 py-3 backdrop-blur-md md:hidden">
          {sel.length ? (
            <>
              <button type="button" className="btn btn-secondary" disabled={removeMany.isPending} onClick={() => removeIds(sel)}>
                Remove {sel.length}
              </button>
              <button type="button" className="btn btn-primary grow" disabled={practise.isPending} onClick={() => start({ ids: sel })}>
                Practise {sel.length}
              </button>
            </>
          ) : (
            <button type="button" className="btn btn-primary grow" disabled={practise.isPending} onClick={() => start({ subject: subject || undefined, chapter: chapter || undefined })}>
              {filtered ? `Practise these ${Math.min(100, data?.total ?? 0)}` : `Practise all ${Math.min(100, total)}`}
            </button>
          )}
        </div>
      )}
      <B7ToastBar toast={toast} onClose={() => setToast(null)} />
    </>
  );
}

function TimedSeg({ timed, onChange }: { timed: boolean; onChange: (t: boolean) => void }) {
  return (
    <div className="seg" role="radiogroup" aria-label="Timing" title="Timed uses each question's time from its test">
      <button type="button" role="radio" aria-checked={!timed} className={!timed ? "tab on" : "tab"} onClick={() => onChange(false)}>
        Untimed
      </button>
      <button type="button" role="radio" aria-checked={timed} className={timed ? "tab on" : "tab"} onClick={() => onChange(true)}>
        Timed
      </button>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="card pad-lg col items-center gap-3 py-12 text-center">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--navy)" strokeWidth="1.6" strokeLinejoin="round" aria-hidden="true">
        <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z" />
      </svg>
      <span className="h3">Nothing saved yet</span>
      <span className="body muted max-w-[460px]">
        When you review a result, tap “Add to revision list” on a question you want to see again before the exam. It shows up here with its solution.
      </span>
      <Link href="/tests?tab=completed" className="btn btn-primary">
        Open my results
      </Link>
    </div>
  );
}

function where(i: RevisionItem) {
  return [i.subject, i.chapter].filter(Boolean).join(" · ");
}

function DesktopTable({
  items,
  sel,
  setSel,
  page,
  pages,
  total,
  setPage,
  onRemove,
  onPractise,
  busy,
}: {
  items: RevisionItem[];
  sel: string[];
  setSel: (s: string[]) => void;
  page: number;
  pages: number;
  total: number;
  setPage: (p: number) => void;
  onRemove: (ids: string[]) => void;
  onPractise: (ids: string[]) => void;
  busy: boolean;
}) {
  const [ref, h] = useFill<HTMLDivElement>();
  const all = items.length > 0 && items.every((i) => sel.includes(i.id));
  const toggle = (id: string) => setSel(sel.includes(id) ? sel.filter((x) => x !== id) : [...sel, id]);
  return (
    <div ref={ref} className="rv-table max-md:hidden" style={h ? { height: h } : undefined}>
      {sel.length > 0 && (
        <div className="row gap-3 border-b border-line bg-[#F7F7FD] px-3 py-2">
          <span className="sm font-semibold">{sel.length} selected</span>
          <span className="grow" />
          <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => onRemove(sel)}>
            Remove
          </button>
          <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => onPractise(sel)}>
            Practise {sel.length}
          </button>
        </div>
      )}
      <div className="rv-scroll">
        <table>
          <thead>
            <tr>
              <th style={{ width: 40 }}>
                <input type="checkbox" aria-label="Select all on this page" checked={all} onChange={() => setSel(all ? [] : items.map((i) => i.id))} />
              </th>
              <th>Question</th>
              <th>From test</th>
              <th>In the test</th>
              <th>Saved</th>
              <th style={{ width: 90 }} aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {items.map((i) => {
              const on = sel.includes(i.id);
              const o = OUTCOME[i.outcome];
              return (
                <tr key={i.id} className={on ? "on" : undefined}>
                  <td>
                    <input type="checkbox" aria-label={`Select Q${i.n} from ${i.test.name}`} checked={on} onChange={() => toggle(i.id)} />
                  </td>
                  <td className="min-w-0">
                    <div className="col gap-0.5">
                      <span className="line-clamp-2">{i.stemPreview || `Question ${i.n}`}</span>
                      <span className="xs muted">{where(i) || "—"}</span>
                    </div>
                  </td>
                  <td>
                    <Link href={`/results/${encodeURIComponent(i.testId)}/q/${i.n}`} className="sm font-semibold">
                      {i.test.name} · Q{i.n}
                    </Link>
                  </td>
                  <td>
                    <span className="row items-start gap-2 sm">
                      <span className="rv-dot" style={o.dot} aria-hidden="true" />
                      {o.label}
                    </span>
                  </td>
                  <td className="sm muted whitespace-nowrap">{dayMonth(i.addedAt)}</td>
                  <td>
                    <button type="button" className="btn btn-ghost btn-sm" aria-label={`Remove Q${i.n} from ${i.test.name}`} disabled={busy} onClick={() => onRemove([i.id])}>
                      Remove
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="rv-foot">
        <span>
          {total} {total === 1 ? "question" : "questions"}
        </span>
        <Pager page={page} pages={pages} setPage={setPage} />
      </div>
    </div>
  );
}

function Pager({ page, pages, setPage }: { page: number; pages: number; setPage: (p: number) => void }) {
  if (pages <= 1) return <span />;
  return (
    <span className="row gap-2">
      <button type="button" className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
        Previous
      </button>
      <span className="num">
        {page} of {pages}
      </span>
      <button type="button" className="btn btn-ghost btn-sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>
        Next
      </button>
    </span>
  );
}

function PhoneList({ items, sel, setSel, page, pages, setPage }: { items: RevisionItem[]; sel: string[]; setSel: (s: string[]) => void; page: number; pages: number; setPage: (p: number) => void }) {
  const toggle = (id: string) => setSel(sel.includes(id) ? sel.filter((x) => x !== id) : [...sel, id]);
  return (
    <div className="card col overflow-hidden p-0 md:hidden">
      {items.map((i) => {
        const o = OUTCOME[i.outcome];
        return (
          <label key={i.id} className="rv-card cursor-pointer">
            <input type="checkbox" className="mt-1 size-5" aria-label={`Select Q${i.n} from ${i.test.name}`} checked={sel.includes(i.id)} onChange={() => toggle(i.id)} />
            <span className="col min-w-0 gap-1">
              <span className="sm line-clamp-2">{i.stemPreview || `Question ${i.n}`}</span>
              <span className="row items-start gap-1.5 xs muted">
                <span className="rv-dot" style={{ ...o.dot, marginTop: 3 }} aria-hidden="true" />
                {i.test.shortName || i.test.name} · Q{i.n}
                {where(i) ? ` · ${where(i)}` : ""}
              </span>
            </span>
          </label>
        );
      })}
      {pages > 1 && (
        <div className="row between px-3 py-2">
          <Pager page={page} pages={pages} setPage={setPage} />
        </div>
      )}
    </div>
  );
}
