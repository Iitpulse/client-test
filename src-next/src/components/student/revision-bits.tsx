"use client";

// Batch 7 on the result and review screens (canvas v180 Student-RedoRevision, Phone-Revision):
// - RedoCard: "Redo the ones you got wrong" → a dialog (desktop) / bottom sheet (phone): wrong only or wrong and
//   skipped, untimed or timed. Timed uses the test's own pace (duration ÷ questions × count) and marking comes from the
//   test's pattern (owner, 6 Nov 2026); the server computes both, the dialog shows the same numbers.
// - RevisionToggle: "Add to revision list" / "In revision list" on a reviewed question, with Undo.
// - AddAllWrong: bulk-add the wrong (and partly right) questions.
// Toasts use Kit-Feedback's .pf-tst. Score and rank never change.
import Link from "next/link";
import { useEffect, useState } from "react";
import { Sheet } from "./sheet";
import { StudentApiError } from "@/lib/student-api";
import { timedMinutes, useRedo, useRevisionLookup, useRevisionWrites } from "@/lib/batch7-api";
import type { PublishedResult, QuestionCell, StudentResult } from "@/types/m2-student";
import type { RedoInclude } from "@/types/batch7";

export type B7Toast = { msg: string; undo?: () => void; link?: { href: string; label: string }; err?: boolean } | null;

export function useB7Toast(): [B7Toast, (t: B7Toast) => void] {
  const [toast, setToast] = useState<B7Toast>(null);
  useEffect(() => {
    if (!toast || toast.err) return;
    const id = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(id);
  }, [toast]);
  return [toast, setToast];
}

export function B7ToastBar({ toast, onClose }: { toast: B7Toast; onClose: () => void }) {
  if (!toast) return null;
  return (
    <div className={toast.err ? "pf-tst err" : "pf-tst"} role={toast.err ? "alert" : "status"}>
      <span className="msg">
        <b>{toast.msg}</b>
      </span>
      {toast.undo && (
        <button type="button" className="act" onClick={() => { toast.undo?.(); onClose(); }}>
          Undo
        </button>
      )}
      {toast.link && (
        <Link href={toast.link.href} className="act">
          {toast.link.label}
        </Link>
      )}
      <button type="button" className="cls" aria-label="Close" onClick={onClose}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true" focusable="false">
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      </button>
    </div>
  );
}

const errText = (e: unknown, fallback: string) => (e instanceof StudentApiError && e.message ? e.message : fallback);

function RedoIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  );
}

/** Counts the redo choices offer: "wrong" = wrong + partly right; "wrongAndSkipped" adds skipped. */
export function redoCounts(r: PublishedResult) {
  const wrong = r.counts.wrong + r.counts.partial;
  return { wrong, skipped: r.counts.skipped, both: wrong + r.counts.skipped };
}

export function RedoCard({ data, r, compact }: { data: StudentResult; r: PublishedResult; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const c = redoCounts(r);
  if (!data.review.available) return null;
  if (c.both === 0) {
    return (
      <section className="b7-redo rise" aria-label="Redo">
        <span className="ico ok" aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
        </span>
        <div className="col grow gap-0.5" style={{ minWidth: compact ? 0 : 240 }}>
          <span className="h3">Nothing to redo</span>
          <span className="sm muted">You answered every question in this test correctly. Practise your weak topics from Progress instead.</span>
        </div>
        <Link href="/progress" className="btn btn-secondary">
          Go to Progress
        </Link>
      </section>
    );
  }
  const lead = [c.wrong ? `${c.wrong} wrong` : "", c.skipped ? `${c.skipped} skipped` : ""].filter(Boolean).join(" and ");
  return (
    <>
      <section className="b7-redo rise" aria-label="Redo">
        <span className="ico" aria-hidden="true">
          <RedoIcon />
        </span>
        <div className="col grow gap-0.5" style={{ minWidth: compact ? 0 : 240 }}>
          <span className="h3">Redo the ones you got wrong</span>
          <span className="sm muted">{lead} in this test. Practise them again; it doesn&apos;t change your score or rank.</span>
        </div>
        <button type="button" className={compact ? "btn btn-primary w-full" : "btn btn-primary"} onClick={() => setOpen(true)}>
          {c.wrong ? `Redo ${c.wrong} wrong` : `Redo ${c.skipped} skipped`}
        </button>
      </section>
      <RedoDialog open={open} onOpenChange={setOpen} data={data} r={r} />
    </>
  );
}

function RedoDialog({ open, onOpenChange, data, r }: { open: boolean; onOpenChange: (o: boolean) => void; data: StudentResult; r: PublishedResult }) {
  const c = redoCounts(r);
  const [include, setInclude] = useState<RedoInclude>(c.wrong ? "wrong" : "wrongAndSkipped");
  const [timed, setTimed] = useState(false);
  const redo = useRedo(data.test.id);
  const count = include === "wrong" ? c.wrong : c.both;
  const total = data.test.totalQuestions || r.counts.total;
  const minutes = timedMinutes(data.submission.durationMinutes, total, count);
  const err = redo.error;
  return (
    <Sheet
      open={open}
      onOpenChange={(o) => { if (!o) redo.reset(); onOpenChange(o); }}
      title={`Redo questions from ${data.test.name}`}
      description="A practice set with fresh answer sheets. Your score, rank and result stay as they are."
      footer={
        <>
          <button type="button" className="btn btn-ghost btn-lg max-md:hidden" onClick={() => onOpenChange(false)}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary btn-lg" disabled={redo.isPending || count === 0} onClick={() => redo.mutate({ include, timed })}>
            {redo.isPending ? "Starting…" : `Start ${count} ${count === 1 ? "question" : "questions"}`}
          </button>
        </>
      }
    >
      <div className="col gap-4">
        <div className="col gap-2">
          <span id="rd-w" className="label">Which questions</span>
          <div className="b7-choice" role="radiogroup" aria-labelledby="rd-w">
            <button type="button" role="radio" aria-checked={include === "wrong"} disabled={!c.wrong} onClick={() => setInclude("wrong")}>
              <b className="font-semibold">Wrong only</b>
              <small>{c.wrong} {c.wrong === 1 ? "question" : "questions"}</small>
            </button>
            <button type="button" role="radio" aria-checked={include === "wrongAndSkipped"} onClick={() => setInclude("wrongAndSkipped")}>
              <b className="font-semibold">Wrong and skipped</b>
              <small>{c.both} questions</small>
            </button>
          </div>
        </div>
        <div className="col gap-2">
          <span id="rd-tm" className="label">Timing</span>
          <div className="b7-choice" role="radiogroup" aria-labelledby="rd-tm">
            <button type="button" role="radio" aria-checked={!timed} onClick={() => setTimed(false)}>
              <b className="font-semibold">Untimed</b>
              <small>check each answer as you go</small>
            </button>
            <button type="button" role="radio" aria-checked={timed} onClick={() => setTimed(true)}>
              <b className="font-semibold">Timed</b>
              <small>{minutes} min, answers at the end</small>
            </button>
          </div>
          <span className="xs muted">
            {timed
              ? `Same pace as the test (${data.submission.durationMinutes} min for ${total} questions). Marking as in the test.`
              : "No clock. See if you were right after each question. Marking as in the test."}
          </span>
        </div>
        {err ? (
          <span className="sm" role="alert" style={{ color: "#B00000" }}>
            {err instanceof StudentApiError && err.code === "NOTHING_TO_REDO"
              ? "There's nothing to redo here: those questions have no answer key now."
              : errText(err, "Couldn't start the practice set. Try again.")}
          </span>
        ) : null}
      </div>
    </Sheet>
  );
}

/** The bookmark button on a reviewed question. */
export function RevisionToggle({ testId, cell, onToast, phone }: { testId: string; cell: QuestionCell; onToast: (t: B7Toast) => void; phone?: boolean }) {
  const lookup = useRevisionLookup(testId);
  const { add, remove } = useRevisionWrites();
  const itemId = lookup.data?.get(cell.questionId) ?? null;
  const inList = !!itemId;
  const busy = add.isPending || remove.isPending || lookup.isPending;
  const label = `Q${cell.shownAs}`;
  const doAdd = () =>
    add.mutate([{ testId, questionId: cell.questionId }], {
      onSuccess: (res) =>
        onToast(
          res.added
            ? { msg: `Added ${label} to your revision list.`, undo: () => { const id = res.items[0]?.id; if (id) remove.mutate(id); }, link: { href: "/revision", label: "Open list" } }
            : { msg: `${label} is already in your revision list.`, link: { href: "/revision", label: "Open list" } }
        ),
      onError: (e) => onToast({ msg: errText(e, "Couldn't add it. Try again."), err: true }),
    });
  const doRemove = () =>
    itemId &&
    remove.mutate(itemId, {
      onSuccess: () => onToast({ msg: `Removed ${label} from your revision list.`, undo: () => add.mutate([{ testId, questionId: cell.questionId }]) }),
      onError: (e) => onToast({ msg: errText(e, "Couldn't remove it. Try again."), err: true }),
    });
  return (
    <button
      type="button"
      className={`btn btn-secondary btn-sm b7-mark${inList ? " on" : ""}`}
      aria-pressed={inList}
      disabled={busy && !lookup.data}
      onClick={() => (inList ? doRemove() : doAdd())}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill={inList ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
        <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z" />
      </svg>
      {phone ? (inList ? "Saved" : "Save") : inList ? "In revision list" : "Add to revision list"}
    </button>
  );
}

/** "Add all N wrong to revision list" (wrong + partly right). */
export function AddAllWrong({ testId, cells, onToast }: { testId: string; cells: QuestionCell[]; onToast: (t: B7Toast) => void }) {
  const lookup = useRevisionLookup(testId);
  const { add, removeMany } = useRevisionWrites();
  const wrong = cells.filter((c) => c.outcome === "wrong" || c.outcome === "partial");
  if (!wrong.length) return null;
  const allIn = !!lookup.data && wrong.every((c) => lookup.data!.has(c.questionId));
  return (
    <button
      type="button"
      className="btn btn-secondary"
      disabled={allIn || add.isPending || !lookup.data}
      onClick={() =>
        add.mutate(
          wrong.filter((c) => !lookup.data?.has(c.questionId)).map((c) => ({ testId, questionId: c.questionId })),
          {
            onSuccess: (res) =>
              onToast({
                msg: `Added ${res.added} wrong ${res.added === 1 ? "question" : "questions"} to your revision list.`,
                undo: res.items.length ? () => removeMany.mutate(res.items.map((i) => i.id)) : undefined,
                link: { href: "/revision", label: "Open list" },
              }),
            onError: (e) => onToast({ msg: errText(e, "Couldn't add them. Try again."), err: true }),
          }
        )
      }
    >
      {allIn ? `All ${wrong.length} wrong are in your list` : `Add all ${wrong.length} wrong to revision list`}
    </button>
  );
}
