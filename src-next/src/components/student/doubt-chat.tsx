"use client";

import Link from "next/link";
import { useLayoutEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AiMark, Doodle, MathText, TypingDots } from "@iitpulse/ui";
import { useDoubt, type ChatProblem } from "@/lib/use-doubt";
import { qk, studentApi } from "@/lib/student-api";
import { relativeDayTime, resetsAt } from "@/lib/time";
import type { DoubtChip, DoubtMessage, PracticeQuestion } from "@/types/m4";
import { ChevronLeftIcon, LockIcon } from "./icons";
import { sentence } from "./labels";
import { Skel } from "./common";

/**
 * The doubt chat (AI tutor) about one question of a submitted test: the inline card in Student-Result's question
 * pane (desktop) and Phone-Doubt (/results/[testId]/q/[n]/doubt). Answers stream in (lib/use-doubt.ts) and are drawn
 * on exercise-book lines with KaTeX; a half-written equation stays plain text until its closing delimiter arrives.
 * Chips: "Similar question" (a real bank question, answerable in the chat), "हिन्दी में समझाएं" and follow-ups.
 * `n` is the paper number (the M2 / M3 routes' key); `label` is the number the student saw (shownAs).
 */

const HINDI = /[ऀ-ॿ]/;
const MAX = 600;

function Bubble({ m }: { m: DoubtMessage }) {
  if (m.role === "student") return <div className="bubble-me rise">{m.text}</div>;
  if (m.kind === "question" && m.question) return <QuestionMessage m={m} q={m.question} />;
  return (
    <div className="bubble-ai ans rise" lang={HINDI.test(m.text) ? "hi" : undefined}>
      <MathText text={m.text} streaming={m.finish === null} />
    </div>
  );
}

/** The similar-question chip's answer: a real question card. Tapping an option answers it in the chat. */
function QuestionMessage({ m, q, onAnswer }: { m: DoubtMessage; q: PracticeQuestion; onAnswer?: (key: string) => void }) {
  return (
    <div className="bubble-ai bubble-q rise col gap-2.5">
      {m.text && <MathText className="sm" text={m.text} />}
      <MathText html as="div" className="q-stem text-[16px]" text={q.stem.en} />
      {q.options.length > 0 && (
        <div className="col gap-2" role="list" aria-label="Options">
          {q.options.map((o) => (
            <div key={o.id} role="listitem" className="opt items-center px-3 py-2">
              <span className="key">{o.key}</span>
              <MathText html as="div" className="q-stem grow min-w-0 text-[16px]" text={o.en} />
              {onAnswer && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => onAnswer(o.key)} aria-label={`Answer ${o.key}`}>
                  Pick
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      <span className="xs muted">{q.options.length ? "Pick an option or type your answer below; the tutor checks it." : "Type your answer below; the tutor checks it."}</span>
    </div>
  );
}

function ProblemLine({ p, label, now, onNew }: { p: ChatProblem; label: number; now: number; onNew: () => void }) {
  const when = (at: string) => (Number.isNaN(now) ? "soon" : relativeDayTime(now, at));
  const again = (at: string) => (Number.isNaN(now) ? "tomorrow" : resetsAt(now, at));
  if (p.kind === "locked")
    return (
      <span className="row gap-3 rounded-xl bg-[var(--line-2)] p-3.5">
        <span className="text-muted">
          <LockIcon size={18} />
        </span>
        <span className="sm">
          <b>Answers aren&apos;t open yet.</b> {sentence(p.message || "The tutor can help once the test has closed for everyone")}
          {p.at ? ` They open ${when(p.at)}.` : ""}
        </span>
      </span>
    );
  if (p.kind === "down") return <span className="sm muted">{sentence(p.message)}</span>;
  if (p.kind === "full")
    return (
      <span className="row wrap gap-2">
        <span className="sm">This chat is full (15 questions). Start a new one to keep going.</span>
        <button type="button" className="btn btn-secondary btn-sm" onClick={onNew}>
          New chat about Q{label}
        </button>
      </span>
    );
  if (p.kind === "daily") return <span className="sm">That&apos;s today&apos;s 20 questions. You can ask again {p.at ? again(p.at) : "tomorrow"}.</span>;
  return <span className="sm muted">{sentence(p.message)}</span>;
}

type Doubt = ReturnType<typeof useDoubt>;

/** The messages, the typing dots and the answer being streamed. Keeps itself scrolled to the newest line. */
function Log({ d, empty, top, className }: { d: Doubt; empty: React.ReactNode; top?: React.ReactNode; className?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  useLayoutEffect(() => {
    const el = box.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [d.messages.length, d.draft, d.thinking]);
  const onScroll = () => {
    const el = box.current;
    if (el) stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };
  const answer = (key: string) => d.send({ text: `My answer is ${key}` }, `My answer is ${key}`);
  return (
    <div ref={box} onScroll={onScroll} className={className} aria-live="polite" aria-busy={d.busy || undefined}>
      {top}
      {d.messages.length === 0 && d.draft === null && !d.thinking && empty}
      {d.messages.map((m, i) =>
        m.role === "tutor" && m.kind === "question" && m.question ? (
          <QuestionMessage key={m.id} m={m} q={m.question} onAnswer={i === d.messages.length - 1 && !d.busy && !d.daily && !d.full ? answer : undefined} />
        ) : (
          <Bubble key={m.id} m={m} />
        )
      )}
      {d.thinking && (
        <div className="bubble-ai fade">
          <TypingDots label="The tutor is writing" />
        </div>
      )}
      {d.draft !== null && (
        <div className="bubble-ai ans" lang={HINDI.test(d.draft) ? "hi" : undefined}>
          <MathText text={d.draft} streaming />
        </div>
      )}
    </div>
  );
}

function Composer({ d, label, phone }: { d: Doubt; label: number; phone?: boolean }) {
  const [text, setText] = useState("");
  const blocked = d.daily || d.full || d.problem?.kind === "locked";
  const disabled = d.busy || blocked;
  const go = () => {
    const t = text.trim();
    if (!t || disabled) return;
    setText("");
    d.send({ text: t.slice(0, MAX) }, t.slice(0, MAX)).then((back) => {
      if (back !== null) setText((cur) => cur || back);
    });
  };
  const chip = (c: DoubtChip) => {
    if (disabled) return;
    if (c.kind === "followUp") d.send({ text: c.label }, c.label);
    else d.send({ chip: c.kind }, c.label);
  };
  const hasAnswer = d.messages.some((m) => m.role === "tutor" && m.kind === "text" && m.finish === "stop");
  const chips = d.chips.filter((c) => c.kind !== "hindi" || hasAnswer || d.messages.length === 0);
  return (
    <>
      {!blocked && (
        <div className={phone ? "row sugg" : "row wrap gap-2"} role="group" aria-label="Suggestions">
          {chips.map((c) => (
            <button key={`${c.kind}-${c.label}`} type="button" className="chip" disabled={disabled} onClick={() => chip(c)} lang={c.kind === "hindi" ? "hi" : undefined}>
              {c.label}
            </button>
          ))}
        </div>
      )}
      <form
        className="row gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          go();
        }}
      >
        <label htmlFor={phone ? "doubt-phone" : "doubt"} className="sr-only">
          Your doubt
        </label>
        <input
          id={phone ? "doubt-phone" : "doubt"}
          name="doubt"
          className={phone ? "input rounded-full" : "input"}
          placeholder={phone ? "Ask about this question…" : "Type your doubt…"}
          value={text}
          maxLength={MAX}
          disabled={blocked}
          autoComplete="off"
          enterKeyHint="send"
          onChange={(e) => setText(e.target.value)}
        />
        <button type="submit" className="btn btn-primary btn-icon size-11 flex-none" style={phone ? { borderRadius: "50%" } : undefined} aria-label="Send" disabled={disabled || !text.trim()}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
            {phone ? <path d="M12 19V5M6 11l6-6 6 6" /> : <path d="M5 12h14M13 6l6 6-6 6" />}
          </svg>
        </button>
      </form>
      {text.length > MAX - 60 && <span className="xs muted">{MAX - text.length} characters left</span>}
      <span className="sr-only" role="status">
        {d.problem ? "" : d.busy ? "The tutor is answering" : ""}
      </span>
      {/* the strip under the input is reserved for one line, so a problem appearing never shifts the chat */}
      {d.problem && <ProblemLine p={d.problem} label={label} now={d.now} onNew={d.startNew} />}
    </>
  );
}

function quotaLine(d: Doubt): string | null {
  if (!d.quota) return null;
  return `${d.quota.leftToday} of ${d.quota.perDay} questions left today`;
}

/** Student-Result's question pane: "Ask a doubt about Q12". */
export function InlineDoubtCard({ testId, n, label }: { testId: string; n: number; label: number }) {
  const d = useDoubt({ testId, n });
  const q = quotaLine(d);
  return (
    <article className="card col fade overflow-hidden" aria-label={`Ask a doubt about question ${label}`}>
      <div className="row between pad gap-3 border-b border-line-2">
        <div className="col gap-0.5">
          <h3 className="h3">Ask a doubt about Q{label}</h3>
          <span className="xs muted">Available because this test has ended{q ? ` · ${q}` : ""}</span>
        </div>
        <AiMark iconSize={13}>AI tutor</AiMark>
      </div>
      <Log
        d={d}
        className="chat-log col max-h-[520px] min-h-[180px] gap-3 overflow-y-auto bg-[#FAFBFE] p-5"
        empty={
          d.loading ? (
            <Skel className="h-10 w-2/3 self-center rounded-xl" />
          ) : (
            <span className="sm muted py-6 text-center">Ask anything about Q{label}: why an option is wrong, a quicker method, or the idea in Hindi.</span>
          )
        }
      />
      <div className="col gap-2.5 border-t border-line-2 px-5 pt-3.5 pb-5">
        <Composer d={d} label={label} />
      </div>
    </article>
  );
}

/** Phone-Doubt: /results/[testId]/q/[n]/doubt (?thread= opens that thread, from the Doubts tab). */
export function PhoneDoubtView({ testId, n, threadId }: { testId: string; n: number; threadId: string | null }) {
  const d = useDoubt({ testId, n, threadId });
  const resultQ = useQuery({ queryKey: qk.result(testId), queryFn: ({ signal }) => studentApi.result(testId, signal), enabled: !d.thread });
  const itemQ = useQuery({
    queryKey: qk.reviewItem(testId, n, "all"),
    queryFn: ({ signal }) => studentApi.reviewItem(testId, n, "all", signal),
    enabled: !d.thread,
    staleTime: 10 * 60_000,
    retry: false,
  });
  const s = d.thread?.summary;
  const shortName = s?.testShortName ?? resultQ.data?.test.shortName ?? "";
  const label = s?.shownAs ?? itemQ.data?.item.shownAs ?? resultQ.data?.result?.questions.find((c) => c.n === n)?.shownAs ?? n;
  const preview = s?.questionPreview ?? (itemQ.data ? plain(itemQ.data.item.stem.en) : null);
  const q = quotaLine(d);
  const back = `/results/${encodeURIComponent(testId)}/q/${n}`;

  return (
    <div className="col mx-auto h-dvh w-full max-w-[760px] md:h-auto md:gap-4">
      <header className="sticky top-0 z-(--z-topbar) row relative h-[60px] flex-none gap-1.5 border-b border-line bg-white/90 px-3 pt-[env(safe-area-inset-top)] backdrop-blur-md box-content md:static md:rounded-card md:border">
        <Doodle name="pendulum" className="md:hidden [&_svg]:size-12" style={{ right: 18, top: 6 }} />
        <Link href={back} className="btn btn-ghost btn-icon size-11 flex-none" aria-label="Back to the question">
          <ChevronLeftIcon />
        </Link>
        <span className="col grow min-w-0 gap-px">
          <h1 className="h3 truncate">
            Doubt{shortName ? ` · ${shortName}` : ""}, Q{label}
          </h1>
          <span className="xs muted">AI tutor{d.quota ? ` · ${d.quota.leftToday} questions left today` : ""}</span>
        </span>
      </header>
      <Log
        d={d}
        className="chat-log col min-h-0 flex-1 gap-2.5 overflow-y-auto px-4 pt-4 pb-3 md:max-h-[60vh] md:flex-none md:rounded-card md:border md:border-line md:bg-white"
        top={
          <div className="ai fade col mt-auto gap-1 rounded-xl px-3 py-2.5">
            <span className="xs muted font-semibold">
              Q{label}
              {shortName ? ` · ${shortName}` : ""}
            </span>
            {preview ? <MathText className="sm line-clamp-3 font-serif" text={preview} /> : <Skel className="h-4 w-4/5" />}
          </div>
        }
        empty={d.loading ? <Skel className="h-10 w-2/3 self-center rounded-xl" /> : <span className="sm muted py-4 text-center">Ask anything about this question: why an option is wrong, a quicker method, or the idea in Hindi.</span>}
      />
      <footer className="col flex-none gap-2.5 border-t border-line bg-white px-3 pt-2.5 pb-[max(26px,env(safe-area-inset-bottom))] md:rounded-card md:border md:px-4 md:pb-4">
        <Composer d={d} label={label} phone />
        {q && <span className="sr-only">{q}</span>}
      </footer>
      {d.loadError != null && (
        <div className="px-4 pb-4">
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => d.retryLoad()}>
            Couldn&apos;t load this chat. Try again
          </button>
        </div>
      )}
    </div>
  );
}

/** HTML stem -> plain text with its LaTeX kept (for a two-line preview). */
function plain(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\s+/g, " ").trim();
}
