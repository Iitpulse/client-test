"use client";

import Link from "next/link";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AiMark, Doodle, MathText, TypingDots } from "@iitpulse/ui";
import { useDoubt, type ChatProblem } from "@/lib/use-doubt";
import { asDoubtFxState, doubtFixture, FIXED_ENDING, type DoubtFx } from "@/lib/doubt-fixtures";
import { useOnline } from "@/lib/use-online";
import { qk, StudentApiError, studentApi } from "@/lib/student-api";
import { relativeDayTime, resetsAt } from "@/lib/time";
import type { DoubtChip, DoubtMessage, DoubtThreadSummary, PracticeQuestion } from "@/types/m4";
import { ChevronLeftIcon } from "./icons";
import { sentence } from "./labels";
import { Skel, useFixtureAfterHydration } from "./common";
import { istTime, OfflineBanner, StateIco, supportCode } from "./states";
import { StateIcon } from "./state-icons";

/**
 * The doubt chat (AI tutor) about one question of a submitted test: the inline card in Student-Result's question
 * pane (desktop), Student-Doubts' right pane and Phone-Doubt (/results/[testId]/q/[n]/doubt). Answers stream in
 * (lib/use-doubt.ts) and are drawn on exercise-book lines on the phone, with KaTeX; a half-written equation stays plain
 * text until its closing delimiter arrives. Chips: "Similar question" (a real bank question, answerable in the chat),
 * "हिन्दी में समझाएं" and follow-ups. `n` is the paper number (the M2 / M3 routes' key); `label` is the number the
 * student saw (shownAs).
 *
 * Batch 5 states (Student-Doubts `view`, Phone-Doubt `state`): loading, load failed (Code E-…), offline (banner, the
 * draft stays, Send reads "Offline"), locked (opens when the test closes), refused and failed answers ("Not counted in
 * today's 20": ai refunds both), a dropped stream (getting the rest / try again), thread full, daily limit, too many
 * tries (DOUBT_DAILY_LIMIT reason "attempts"), near and over 600 characters.
 */

const HINDI = /[ऀ-ॿ]/;
const MAX = 600;
/** The count line appears from here (the board: over 540 characters). */
const COUNT_FROM = 540;

type Doubt = ReturnType<typeof useDoubt>;

/** The `?fixture=` doubt state (dev and staging only): undefined until the URL is read (after hydration). */
export function useDoubtFixture(): DoubtFx | null | undefined {
  const name = useFixtureAfterHydration();
  const [at] = useState(() => Date.now());
  return useMemo(() => {
    if (name === undefined) return undefined;
    const s = asDoubtFxState(name);
    return s ? doubtFixture(s, at) : null;
  }, [name, at]);
}

/** The fixed ending api-ai puts on a refused / failed answer; what comes before it is the answer's own text. */
function withoutEnding(text: string): string {
  return text.replace(FIXED_ENDING, "").trim();
}

const NOT_COUNTED = "Not counted in today's 20";

/** Desktop (Student-Result, Student-Doubts): .bubble-me / .bubble-ai. Phone-Doubt: .me / .bot, answers on ruled lines (.ans). */
function Bubble({ m, phone, d }: { m: DoubtMessage; phone?: boolean; d: Doubt }) {
  if (m.role === "student") return <div className={phone ? "me rise" : "bubble-me sm rise"}>{m.text}</div>;
  if (m.kind === "question" && m.question) return <QuestionMessage q={m.question} />;
  const box = phone ? "bot x rise" : "bubble-ai sm rise col gap-2";
  if (m.finish === "refused") {
    // The safety reply (self-harm) is shown alone, with no "didn't count" line (owner, 5 Nov).
    if (!m.text.includes(FIXED_ENDING)) return <Plain m={m} phone={phone} />;
    return (
      <div className={box}>
        <span>I can only help with this question and its subject. Try asking about the steps or the idea behind it.</span>
        <span className="xs muted">{NOT_COUNTED}</span>
      </div>
    );
  }
  if (m.finish === "failed") {
    const own = withoutEnding(m.text);
    // "No similar question left" is a failed answer with its own sentence: show it, with the not-counted line.
    if (own && /^I couldn't find another question/.test(own))
      return (
        <div className={box}>
          <MathText text={own} />
          <span className="xs muted">{NOT_COUNTED}</span>
        </div>
      );
    return (
      <div className={box} role="alert">
        <span className="col gap-0.5">
          <b>Couldn&apos;t answer just now</b>
          <span className="muted">The tutor didn&apos;t reply this time. Try again in a moment.</span>
        </span>
        <span className="row between d-cut gap-3">
          <span className="xs muted">{NOT_COUNTED}</span>
          <button type="button" className="btn btn-secondary btn-sm min-h-11 flex-none" disabled={d.busy} onClick={() => d.retryFailed(m.id)}>
            Retry
          </button>
        </span>
      </div>
    );
  }
  if (m.finish === null) return <DropBubble text={m.text} phone={phone} d={d} />;
  return <Plain m={m} phone={phone} />;
}

function Plain({ m, phone }: { m: DoubtMessage; phone?: boolean }) {
  return (
    <div className={phone ? "bot ans rise" : "bubble-ai sm rise"} lang={HINDI.test(m.text) ? "hi" : undefined}>
      <MathText text={m.text} streaming={m.finish === null} />
    </div>
  );
}

/** A dropped answer: the part that arrived, then "Getting the rest…" or "Couldn't get the rest" + Try again. */
function DropBubble({ text, phone, d }: { text: string; phone?: boolean; d: Doubt }) {
  const retry = d.dropped?.phase === "retry";
  return (
    <div className={phone ? "bot ans x" : "bubble-ai sm col gap-2"} lang={HINDI.test(text) ? "hi" : undefined}>
      {text && (
        <span className="whitespace-pre-line">
          <MathText text={text} streaming />
        </span>
      )}
      {retry ? (
        phone ? (
          <span className="col d-cut gap-2" role="status">
            <span className="xs muted">Connection dropped. Couldn&apos;t get the rest of this answer.</span>
            <button type="button" className="btn btn-secondary btn-sm min-h-11 self-start" onClick={() => void d.retryDrop()}>
              Try again
            </button>
          </span>
        ) : (
          <span className="row between d-cut gap-3" role="status">
            <span className="xs muted">Connection dropped. Couldn&apos;t get the rest of this answer.</span>
            <button type="button" className="btn btn-secondary btn-sm min-h-11 flex-none" onClick={() => void d.retryDrop()}>
              Try again
            </button>
          </span>
        )
      ) : (
        <span className="row xs muted d-cut gap-2.5" role="status">
          <TypingDots label="Getting the rest of the answer" />
          Connection dropped. Getting the rest…
        </span>
      )}
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

/** "9:00 PM" when the test closes today, else "Mon 2 Nov, 9:00 PM". */
function opensAt(p: ChatProblem & { kind: "locked" }, now: number): string | null {
  if (!p.at) return null;
  if (Number.isNaN(now)) return istTime(p.at);
  const rel = relativeDayTime(now, p.at);
  return rel.startsWith("today, ") ? rel.slice(7) : rel;
}

/** Problems that keep the composer and get one line under it (the board's states have their own places). */
function ProblemLine({ p, now }: { p: ChatProblem; now: number }) {
  const again = (at: string) => (Number.isNaN(now) ? "tomorrow" : resetsAt(now, at));
  if (p.kind === "down") return <span className="sm muted">{sentence(p.message)}</span>;
  if (p.kind === "daily" || p.kind === "attempts") return <span className="sm">You can ask again {p.at ? again(p.at) : "tomorrow"}.</span>;
  if (p.kind === "error") return <span className="sm muted">{sentence(p.message)}</span>;
  return null;
}

/** The chat's centred state (Phone-Doubt / Student-Doubts .ctr): locked or load failed. */
function Centre({ d, phone, testName, held }: { d: Doubt; phone?: boolean; testName: string | null; held: ChatProblem | null }) {
  const p = held ?? d.problem;
  if (d.loadError != null && !held)
    return (
      <div className="d-ctr" role="alert">
        <StateIco tone="red" icon="warn" className="st-ico-sm" />
        <span className="h3">Couldn&apos;t load this chat</span>
        <span className="sm muted">Your questions and answers are safe. Try again in a moment.</span>
        <button type="button" className="btn btn-primary min-h-11 px-6" onClick={() => void d.retryLoad()}>
          Try again
        </button>
        <span className="xs muted mono">
          {phone ? "" : "Code "}
          {supportCode(d.loadError)}
        </span>
      </div>
    );
  if (p?.kind === "locked") {
    const at = opensAt(p, d.now);
    return (
      <div className="d-ctr" role="status">
        <StateIco tone="grey" icon="lock" className="st-ico-sm" />
        <span className="h3">{at ? `Doubt chat opens when the test closes at ${at}` : "Doubt chat opens when the test closes for everyone"}</span>
        <span className="sm muted" style={{ textWrap: "pretty" }}>
          Some students are still writing {testName || "this test"}. You can ask about any question after it closes for everyone.
        </span>
      </div>
    );
  }
  return null;
}

/** The board's loading bubbles (Student-Doubts / Phone-Doubt "Loading"). */
function ChatSkeleton({ phone }: { phone?: boolean }) {
  const me = phone ? "18px 18px 4px 18px" : "16px 16px 4px 16px";
  const ai = phone ? "18px 18px 18px 4px" : "16px 16px 16px 4px";
  const rows: Array<[number, string, string, boolean]> = phone
    ? [
        [56, "100%", "12px", false],
        [40, "62%", me, true],
        [84, "84%", ai, false],
        [40, "48%", me, true],
        [112, "88%", ai, false],
      ]
    : [
        [64, "72%", "12px", false],
        [40, "44%", me, true],
        [76, "70%", ai, false],
        [40, "36%", me, true],
        [100, "80%", ai, false],
      ];
  return (
    <div className={phone ? "col gap-2.5" : "col gap-3"}>
      {rows.map(([h, w, r, right], i) => (
        <Skel key={i} style={{ height: h, width: w, borderRadius: r, alignSelf: right ? "flex-end" : undefined }} />
      ))}
      <span className="sr-only" role="status">
        Loading this chat
      </span>
    </div>
  );
}

/** The messages, the typing dots and the answer being streamed. Keeps itself scrolled to the newest line. */
function Log({ d, empty, top, className, phone, testName, held }: { d: Doubt; empty: React.ReactNode; top?: React.ReactNode; className?: string; phone?: boolean; testName?: string | null; held?: ChatProblem | null }) {
  const box = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  useLayoutEffect(() => {
    const el = box.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [d.messages.length, d.draft, d.thinking, d.dropped]);
  const onScroll = () => {
    const el = box.current;
    if (el) stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };
  const p = held ?? d.problem;
  const failed = d.loadError != null && !held;
  const locked = p?.kind === "locked";
  // A drop whose message isn't in the thread (the refetch failed): draw what arrived from local state.
  const orphanDrop = d.dropped && !d.pendingOnServer ? d.dropped : null;
  return (
    <div ref={box} onScroll={onScroll} className={className} aria-live="polite" aria-busy={d.loading || d.busy || undefined}>
      {d.loading ? (
        <ChatSkeleton phone={phone} />
      ) : failed ? (
        <Centre d={d} phone={phone} testName={testName ?? null} held={held ?? null} />
      ) : (
        <>
          {top}
          {locked ? (
            <Centre d={d} phone={phone} testName={testName ?? null} held={held ?? null} />
          ) : (
            <>
              {d.messages.length === 0 && d.draft === null && !d.thinking && empty}
              {d.messages.map((m) => (
                <Bubble key={m.id} m={m} phone={phone} d={d} />
              ))}
              {orphanDrop && <DropBubble text={orphanDrop.text} phone={phone} d={d} />}
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
            </>
          )}
        </>
      )}
    </div>
  );
}

function SendIcon({ phone }: { phone?: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {phone ? <path d="M12 19V5M6 11l6-6 6 6" /> : <path d="M5 12h14M13 6l6 6-6 6" />}
    </svg>
  );
}

function Composer({ d, phone, held, placeholder, offline }: { d: Doubt; label: number; phone?: boolean; held?: ChatProblem | null; placeholder?: string; offline: boolean }) {
  const [text, setText] = useState(d.fixture?.draft ?? "");
  const problem = held ?? d.problem;
  const locked = problem?.kind === "locked";
  const blocked = d.full || locked || d.loading;
  const over = text.length > MAX;
  const streaming = d.busy && !d.pendingOnServer;
  const sendOff = blocked || over || offline || d.busy || !text.trim();
  const go = () => {
    const t = text.trim();
    if (!t || sendOff) return;
    setText("");
    d.send({ text: t }, t).then((back) => {
      if (back !== null) setText((cur) => cur || back);
    });
  };
  const chip = (c: DoubtChip) => {
    if (blocked || offline || d.busy) return;
    if (c.kind === "followUp") d.send({ text: c.label }, c.label);
    else d.send({ chip: c.kind }, c.label);
  };
  const hasAnswer = d.messages.some((m) => m.role === "tutor" && m.kind === "text" && m.finish === "stop");
  const chips = d.chips.filter((c) => c.kind !== "hindi" || hasAnswer || d.messages.length === 0);
  const at = locked ? opensAt(problem, d.now) : null;
  const ph = d.full ? "This chat is full" : locked ? (at ? `Opens at ${at}` : "Opens when the test closes") : (placeholder ?? "Ask about this question…");
  const id = phone ? "doubt-phone" : "doubt";
  return (
    <>
      {!blocked && (
        <div className={phone ? "row sugg" : "row wrap gap-2"} role="group" aria-label="Suggestions">
          {chips.map((c) => (
            <button
              key={`${c.kind}-${c.label}`}
              type="button"
              className={offline ? "chip off" : "chip"}
              aria-disabled={offline || d.busy || undefined}
              disabled={streaming}
              onClick={() => chip(c)}
              lang={c.kind === "hindi" ? "hi" : undefined}
            >
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
        <label htmlFor={id} className="sr-only">
          {phone ? "Your doubt" : "Your question"}
        </label>
        <input
          id={id}
          name="doubt"
          className={`input${phone ? " rounded-full" : ""}${blocked ? " off" : over ? " over" : ""}`}
          placeholder={ph}
          value={blocked ? "" : text}
          disabled={blocked}
          aria-disabled={blocked || undefined}
          aria-invalid={over || undefined}
          aria-describedby={text.length > COUNT_FROM ? `${id}-count` : undefined}
          autoComplete="off"
          enterKeyHint="send"
          onChange={(e) => setText(e.target.value.slice(0, MAX * 4))}
        />
        {offline ? (
          <button type="button" className={phone ? "btn off h-11 flex-none rounded-full px-3.5" : "btn off h-11 flex-none gap-1.5 px-4"} aria-disabled="true">
            {!phone && <StateIcon name="wifi" size={16} />}
            Offline
          </button>
        ) : (
          <button
            type="submit"
            className={`btn btn-primary btn-icon size-11 flex-none${blocked || over ? " off" : ""}`}
            style={phone ? { borderRadius: "50%" } : undefined}
            aria-label="Send"
            aria-disabled={sendOff || undefined}
            disabled={streaming || blocked}
          >
            <SendIcon phone={phone} />
          </button>
        )}
      </form>
      {!blocked && text.length > COUNT_FROM && (
        <div id={`${id}-count`} className={phone ? "row between xs gap-3 px-1.5" : "row between xs gap-3"} role="status">
          <span className={over ? "t-red" : "muted"}>{over ? (phone ? "Too long to send. Keep it under 600." : "Too long to send. Keep it under 600 characters.") : ""}</span>
          <span className={`mono flex-none ${over ? "t-red" : "muted"}`}>
            {text.length} / {MAX}
          </span>
        </div>
      )}
      {d.full &&
        (phone ? (
          <div className="col gap-2" role="status">
            <span className="sm px-1">This chat is full (15 questions). Start a new one to keep going.</span>
            <button type="button" className="btn btn-secondary min-h-11 w-full" onClick={() => void d.startNew()}>
              Start a new chat
            </button>
          </div>
        ) : (
          <div className="row between wrap gap-3 rounded-xl bg-[#F5F6FA] px-3.5 py-3" role="status">
            <span className="sm">This chat is full (15 questions). Start a new one to keep going.</span>
            <button type="button" className="btn btn-secondary min-h-11 flex-none" onClick={() => void d.startNew()}>
              Start a new chat
            </button>
          </div>
        ))}
      <span className="sr-only" role="status">
        {problem ? "" : streaming ? "The tutor is answering" : ""}
      </span>
      {problem && !locked && problem.kind !== "full" && <ProblemLine p={problem} now={d.now} />}
    </>
  );
}

/** The daily 20 used, or too many tries today: replaces the composer (Student-Doubts / Phone-Doubt). */
function LimitRow({ d, phone }: { d: Doubt; phone?: boolean }) {
  const title = d.attempts ? "Let's take a break for today" : phone ? "That's today's 20 questions" : "You've used today's 20 questions";
  const sub = d.attempts ? "You've sent a lot of messages today. You can ask again after midnight. Your chats stay here." : "You can ask again after midnight. Your chats stay here.";
  return (
    <div className={phone ? "row gap-3 px-1 py-2" : "row gap-3 border-t border-line-2 px-5 py-[18px]"} role="status">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#575C75" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true" focusable="false" className="flex-none">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
      <span className="col gap-0.5">
        <span className="sm font-semibold">{title}</span>
        <span className="xs muted">{sub}</span>
      </span>
    </div>
  );
}

function atLimit(d: Doubt): boolean {
  return d.daily || d.attempts;
}

/** Student-Result's question pane: "Ask a doubt about Q12". */
export function InlineDoubtCard({ testId, n, label }: { testId: string; n: number; label: number }) {
  const d = useDoubt({ testId, n });
  const online = useOnline();
  const q = d.quota ? `${d.quota.leftToday} of ${d.quota.perDay} questions left today` : null;
  return (
    <article className="card col fade overflow-hidden" aria-label={`Ask a doubt about question ${label}`}>
      <div className="row between pad gap-3 border-b border-line-2">
        <div className="col gap-0.5">
          <h3 className="h3">Ask a doubt about Q{label}</h3>
          <span className="xs muted">Available because this test has ended{q ? ` · ${q}` : ""}</span>
        </div>
        <AiMark iconSize={13}>AI tutor</AiMark>
      </div>
      {!online && (
        <OfflineBanner className="bnr-flush">Your chat is saved. Your question sends when you&apos;re back.</OfflineBanner>
      )}
      <Log
        d={d}
        className="chat-log col max-h-[520px] min-h-[180px] gap-3 overflow-y-auto bg-[#FAFBFE] p-5"
        empty={<span className="sm muted py-6 text-center">Ask anything about Q{label}: why an option is wrong, a quicker method, or the idea in Hindi.</span>}
      />
      {atLimit(d) ? (
        <LimitRow d={d} />
      ) : d.loadError == null ? (
        <div className="dcomp col gap-2.5 border-t border-line-2 px-5 pt-3.5 pb-5">
          <Composer d={d} label={label} placeholder="Type your doubt…" offline={!online} />
        </div>
      ) : null}
    </article>
  );
}

/** Phone-Doubt: /results/[testId]/q/[n]/doubt (?thread= opens that thread, from the Doubts tab). */
export function PhoneDoubtView({ testId, n, threadId }: { testId: string; n: number; threadId: string | null }) {
  const fx = useDoubtFixture();
  if (fx === undefined) return <PhoneDoubtFrame />;
  return <PhoneDoubtInner key={fx?.state ?? "live"} testId={testId} n={n} threadId={threadId} fx={fx} />;
}

/** The first paint before the fixture flag is read: the header and the loading bubbles. */
function PhoneDoubtFrame() {
  return (
    <div className="col mx-auto h-dvh w-full max-w-[760px] md:h-auto md:gap-4">
      <header className="row h-[60px] flex-none border-b border-line bg-white/90 px-3 md:rounded-card md:border" />
      <div className="chat-log col flex-1 px-4 pt-4">
        <ChatSkeleton phone />
      </div>
    </div>
  );
}

function PhoneDoubtInner({ testId, n, threadId, fx }: { testId: string; n: number; threadId: string | null; fx: DoubtFx | null }) {
  const d = useDoubt({ testId, n, threadId, fx });
  const online = useOnline() && !fx?.offline;
  const live = !fx;
  const resultQ = useQuery({ queryKey: qk.result(testId), queryFn: ({ signal }) => studentApi.result(testId, signal), enabled: live && !d.thread });
  const itemQ = useQuery({
    queryKey: qk.reviewItem(testId, n, "all"),
    queryFn: ({ signal }) => studentApi.reviewItem(testId, n, "all", signal),
    enabled: live && !d.thread,
    staleTime: 10 * 60_000,
    retry: false,
  });
  const s = d.thread?.summary;
  const shortName = s?.testShortName ?? resultQ.data?.test.shortName ?? "";
  const testName = s?.testName ?? resultQ.data?.test.name ?? null;
  const label = s?.shownAs ?? itemQ.data?.item.shownAs ?? resultQ.data?.result?.questions.find((c) => c.n === n)?.shownAs ?? n;
  const preview = s?.questionPreview ?? (itemQ.data ? plain(itemQ.data.item.stem.en) : null);
  const back = `/results/${encodeURIComponent(testId)}/q/${n}`;
  // Answers for this test aren't open yet (the M2 review says so): no chat until they are.
  const ie = itemQ.error instanceof StudentApiError ? itemQ.error : null;
  const held: ChatProblem | null =
    !d.thread && (ie?.code === "REVIEW_NOT_AVAILABLE_YET" || ie?.code === "RESULT_NOT_AVAILABLE")
      ? { kind: "locked", message: ie.message, at: typeof ie.details?.availableAt === "string" ? ie.details.availableAt : null }
      : null;
  const p = held ?? d.problem;
  const at = p?.kind === "locked" ? opensAt(p, d.now) : null;
  const sub = p?.kind === "locked" ? (at ? `opens at ${at}` : "opens when the test closes") : d.quota ? `${d.quota.leftToday} questions left today` : null;
  const failed = d.loadError != null && !held;

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
          <span className="xs muted">AI tutor{sub ? ` · ${sub}` : ""}</span>
        </span>
      </header>
      {!online && <OfflineBanner className="bnr-flush">Your question sends when you&apos;re back.</OfflineBanner>}
      <Log
        d={d}
        phone
        testName={testName}
        held={held}
        className="chat-log col min-h-0 flex-1 gap-2.5 overflow-y-auto px-4 pt-4 pb-3 md:max-h-[60vh] md:flex-none md:rounded-card md:border md:border-line md:bg-white"
        top={
          <div className="ai fade col mt-auto gap-1 rounded-xl px-3 py-2.5">
            <span className="xs muted font-semibold">
              Q{label}
              {shortName ? ` · ${shortName}` : ""}
            </span>
            {preview ? <MathText className="sm line-clamp-3 font-serif" text={`“${preview}”`} /> : <Skel className="h-4 w-4/5" />}
          </div>
        }
        empty={<span className="sm muted py-4 text-center">Ask anything about this question: why an option is wrong, a quicker method, or the idea in Hindi.</span>}
      />
      <footer className="dcomp col flex-none gap-2.5 border-t border-line bg-white px-3 pt-2.5 pb-[max(26px,env(safe-area-inset-bottom))] md:rounded-card md:border md:px-4 md:pb-4">
        {atLimit(d) ? <LimitRow d={d} phone /> : !failed && <Composer d={d} label={label} phone held={held} offline={!online} />}
        {d.quota && <span className="sr-only">{`${d.quota.leftToday} of ${d.quota.perDay} questions left today`}</span>}
      </footer>
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
export function ThreadPane({ t, fx }: { t: DoubtThreadSummary; fx?: DoubtFx | null }) {
  const d = useDoubt({ testId: t.testId, n: t.n, threadId: t.id, fx });
  const online = useOnline() && !fx?.offline;
  const left = d.thread?.quota.leftInThread ?? null;
  const turnsLine = left === 0 ? "15 of 15 questions asked" : left !== null ? `${left} ${left === 1 ? "turn" : "turns"} left in this thread` : "";
  return (
    <article className="card col fade min-w-0 flex-[999_1_560px] overflow-hidden" aria-label={`Doubt about ${t.testShortName} question ${t.shownAs}`}>
      <div className="row between pad gap-3 border-b border-line-2">
        <div className="col gap-0.5">
          <h2 className="h3">
            Doubt · {t.testShortName}, Q{t.shownAs}
          </h2>
          <span className="xs muted">
            {t.testName}
            {turnsLine ? ` · ${turnsLine}` : ""}
          </span>
        </div>
        <Link href={`/results/${encodeURIComponent(t.testId)}/q/${t.n}`} className="btn btn-ghost btn-sm">
          Open in review
          <svg className="arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" focusable="false">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </Link>
      </div>
      {!online && <OfflineBanner className="bnr-flush">Your chat is saved. Your question sends when you&apos;re back.</OfflineBanner>}
      <Log
        d={d}
        testName={t.testName}
        className="chat-log col max-h-[640px] min-h-[420px] gap-3 overflow-y-auto bg-[#FAFBFE] p-5"
        top={
          <div className="ai col gap-1 rounded-xl px-3.5 py-3">
            <span className="xs muted font-semibold">
              {t.testShortName} · Q{t.shownAs}
            </span>
            <MathText className="q-stem text-[16px] leading-normal" text={`“${t.questionPreview}”`} />
          </div>
        }
        empty={null}
      />
      {atLimit(d) ? (
        <LimitRow d={d} />
      ) : d.loadError == null ? (
        <div className="dcomp col gap-2.5 border-t border-line-2 px-5 pt-3.5 pb-5">
          <Composer d={d} label={t.shownAs} offline={!online} />
        </div>
      ) : null}
    </article>
  );
}
