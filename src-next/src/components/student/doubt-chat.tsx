"use client";

import Link from "next/link";
import { useLayoutEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AiMark, Doodle, MathText, TypingDots } from "@iitpulse/ui";
import { useDoubt, type ChatProblem } from "@/lib/use-doubt";
import { qk, StudentApiError, studentApi } from "@/lib/student-api";
import { relativeDayTime, resetsAt } from "@/lib/time";
import type { DoubtChip, DoubtMessage, DoubtThreadSummary, PracticeQuestion } from "@/types/m4";
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

/** Desktop (Student-Result, Student-Doubts): .bubble-me / .bubble-ai. Phone-Doubt: .me / .bot, answers on ruled lines (.ans). */
function Bubble({ m, phone }: { m: DoubtMessage; phone?: boolean }) {
  if (m.role === "student") return <div className={phone ? "me rise" : "bubble-me sm rise"}>{m.text}</div>;
  if (m.kind === "question" && m.question) return <QuestionMessage q={m.question} />;
  return (
    <div className={phone ? "bot ans rise" : "bubble-ai sm rise"} lang={HINDI.test(m.text) ? "hi" : undefined}>
      <MathText text={m.text} streaming={m.finish === null} />
    </div>
  );
}

/** The similar-question chip's answer (Student-Doubts .qmsg): a real bank question; the student replies with an answer. */
function QuestionMessage({ q }: { q: PracticeQuestion }) {
  return (
    <div className="qmsg rise">
      <span className="row gap-2">
        <span className="badge b-grey">Similar question</span>
        <span className="xs muted">From the question bank</span>
      </span>
      <MathText html as="div" className="q-stem text-[16px]" text={q.stem.en} />
      {q.options.length > 0 && (
        <div className="grid grid-cols-2 gap-2 max-md:grid-cols-1" role="list" aria-label="Options">
          {q.options.map((o) => (
            <div key={o.id} role="listitem" className="opt">
              <span className="key">{o.key}</span>
              <MathText html as="div" className="q-stem min-w-0 text-[16px]" text={o.en} />
            </div>
          ))}
        </div>
      )}
      <span className="xs muted">Reply with your answer and the tutor checks it against the key.</span>
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
function Log({ d, empty, top, className, phone }: { d: Doubt; empty: React.ReactNode; top?: React.ReactNode; className?: string; phone?: boolean }) {
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
  return (
    <div ref={box} onScroll={onScroll} className={className} aria-live="polite" aria-busy={d.busy || undefined}>
      {top}
      {d.messages.length === 0 && d.draft === null && !d.thinking && empty}
      {d.messages.map((m) => (
        <Bubble key={m.id} m={m} phone={phone} />
      ))}
      {d.thinking && (
        <div className={phone ? "bot fade" : "bubble-ai fade"}>
          <TypingDots label="The tutor is writing" />
        </div>
      )}
      {d.draft !== null && (
        <div className={phone ? "bot ans" : "bubble-ai sm"} lang={HINDI.test(d.draft) ? "hi" : undefined}>
          <MathText text={d.draft} streaming />
        </div>
      )}
    </div>
  );
}

function Composer({ d, label, phone, held, placeholder }: { d: Doubt; label: number; phone?: boolean; held?: ChatProblem | null; placeholder?: string }) {
  const [text, setText] = useState("");
  const problem = held ?? d.problem;
  const blocked = d.daily || d.full || problem?.kind === "locked";
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
          placeholder={placeholder ?? (phone ? "Ask about this question…" : "Type your doubt…")}
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
        {problem ? "" : d.busy ? "The tutor is answering" : ""}
      </span>
      {/* the strip under the input is reserved for one line, so a problem appearing never shifts the chat */}
      {problem && <ProblemLine p={problem} label={label} now={d.now} onNew={d.startNew} />}
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
  // Answers for this test aren't open yet (the M2 review says so): no chat until they are.
  const ie = itemQ.error instanceof StudentApiError ? itemQ.error : null;
  const held: ChatProblem | null =
    !d.thread && (ie?.code === "REVIEW_NOT_AVAILABLE_YET" || ie?.code === "RESULT_NOT_AVAILABLE")
      ? { kind: "locked", message: ie.message, at: typeof ie.details?.availableAt === "string" ? ie.details.availableAt : null }
      : null;

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
        phone
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
        <Composer d={d} label={label} phone held={held} />
        {q && <span className="sr-only">{q}</span>}
      </footer>
      {d.loadError != null && !held && (
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

/**
 * Student-Doubts' right pane: one thread (from the list on the left), "Open in review", the question, the chat,
 * and the composer, or "You've used today's 20 questions" once the day's quota is gone.
 */
export function ThreadPane({ t }: { t: DoubtThreadSummary }) {
  const d = useDoubt({ testId: t.testId, n: t.n, threadId: t.id });
  const left = d.thread?.quota.leftInThread ?? null;
  return (
    <article className="card col fade min-w-0 flex-[999_1_560px] overflow-hidden" aria-label={`Doubt about ${t.testShortName} question ${t.shownAs}`}>
      <div className="row between pad gap-3 border-b border-line-2">
        <div className="col gap-0.5">
          <h2 className="h3">
            Doubt · {t.testShortName}, Q{t.shownAs}
          </h2>
          <span className="xs muted">
            {t.testName}
            {left !== null ? ` · ${left} ${left === 1 ? "turn" : "turns"} left in this thread` : ""}
          </span>
        </div>
        <Link href={`/results/${encodeURIComponent(t.testId)}/q/${t.n}`} className="btn btn-ghost btn-sm">
          Open in review
          <svg className="arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" focusable="false">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </Link>
      </div>
      <Log
        d={d}
        className="chat-log col max-h-[640px] min-h-[420px] gap-3 overflow-y-auto bg-[#FAFBFE] p-5"
        top={
          <div className="ai col gap-1 rounded-xl px-3.5 py-3">
            <span className="xs muted font-semibold">
              {t.testShortName} · Q{t.shownAs}
            </span>
            <MathText className="q-stem text-[16px] leading-normal" text={`“${t.questionPreview}”`} />
          </div>
        }
        empty={d.loading ? <Skel className="h-10 w-2/3 self-center rounded-xl" /> : null}
      />
      {d.daily ? (
        <div className="row gap-3 border-t border-line-2 px-5 py-[18px]">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#575C75" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true" focusable="false" className="flex-none">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </svg>
          <span className="col gap-0.5">
            <span className="sm font-semibold">You&apos;ve used today&apos;s 20 questions</span>
            <span className="xs muted">You can ask again after midnight. Your chats stay here.</span>
          </span>
        </div>
      ) : (
        <div className="col gap-2.5 border-t border-line-2 px-5 pt-3.5 pb-5">
          <Composer d={d} label={t.shownAs} placeholder="Ask about this question…" />
        </div>
      )}
    </article>
  );
}
