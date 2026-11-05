"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Doodle, InkUnderline, MathText, Stamp } from "@iitpulse/ui";
import { m4Api, m4Keys, useProfile } from "@/lib/m4-api";
import { StudentApiError } from "@/lib/student-api";
import { useServerClock } from "@/lib/server-clock";
import { dayMonth, mmss } from "@/lib/time";
import type { PracticeCheck, PracticeQuestion, PracticeSet } from "@/types/m4";
import { ArrowLeftIcon, ArrowRightIcon, Spinner } from "@/components/shell/icons";
import { ErrorCard, Skel } from "./common";
import { ChevronLeftIcon } from "./icons";
import { num, sentence } from "./labels";

/**
 * /practice/[setId]: Student-Practice (desktop) and Phone-Practice. A set made from Progress (POST
 * /tests/student/practice): the questions grid (desktop) or strip (phone), one question at a time; answer, Check
 * (POST …/questions/:n/check), then the key and the solution. Checks are final. A timed drill counts down from when
 * the set was made; when it runs out the student can still check. Once every question is checked: "Set finished".
 * Progress stays highlighted in the top bar (the set belongs to it); on phones a back header and no tab bar.
 */

type Lang = "en" | "hi";
type Answer = { optionIds: string[]; value: string };
const EMPTY: Answer = { optionIds: [], value: "" };
const multi = (q: PracticeQuestion) => q.type === "multiple" || q.type === "matrix";
const pick = (t: { en: string; hi: string | null }, lang: Lang) => (lang === "hi" && t.hi ? t.hi : t.en);
const outcomeOf = (q: PracticeQuestion) => q.checked?.outcome ?? null;
const OUT: Record<PracticeCheck["outcome"], { text: string; badge: string }> = {
  correct: { text: "Correct", badge: "b-green" },
  partial: { text: "Partly correct", badge: "b-amber" },
  wrong: { text: "Wrong", badge: "b-wrong" },
};

export function PracticeView({ setId }: { setId: string }) {
  const client = useQueryClient();
  const q = useQuery({ queryKey: m4Keys.practice(setId), queryFn: ({ signal }) => m4Api.practice(setId, signal), staleTime: 10 * 60_000 });
  const set = q.data?.set;
  const pref = useProfile().data?.profile?.preferences?.questionLanguage ?? "en";
  const [langChoice, setLang] = useState<Lang | null>(null);
  const lang = langChoice ?? pref;
  const [cur, setCur] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<number, Answer>>({});
  const check = useMutation({
    mutationFn: ({ n, body }: { n: number; body: { optionIds?: string[]; value?: number } }) => m4Api.practiceCheck(setId, n, body),
    onMutate: ({ n }) => setCur(n), // pin it: "the first unchecked one" would move on before the key is seen
    onSuccess: (res, { n }) =>
      client.setQueryData<{ now: string; set: PracticeSet }>(m4Keys.practice(setId), (c) =>
        c ? { ...c, set: { ...c.set, questions: c.set.questions.map((x) => (x.n === n ? { ...x, checked: res.check } : x)) } } : c
      ),
  });

  if (!set) {
    const e = q.error instanceof StudentApiError ? q.error : null;
    const body = q.isError ? (
      e?.code === "PRACTICE_NOT_FOUND" || e?.status === 404 ? (
        <div className="card col items-start gap-3 p-5">
          <span className="h3">This practice set isn&apos;t here</span>
          <span className="sm muted">It may belong to another account. Make a new one from your progress.</span>
          <Link href="/progress" className="btn btn-secondary">
            Go to Progress
          </Link>
        </div>
      ) : (
        <ErrorCard error={q.error} onRetry={() => q.refetch()} />
      )
    ) : (
      <div className="col gap-3" aria-busy="true" aria-label="Loading the practice set">
        <Skel className="h-28 w-full rounded-[14px]" />
        {[0, 1, 2, 3].map((k) => (
          <Skel key={k} className="h-14 w-full rounded-xl" />
        ))}
      </div>
    );
    return (
      <div className="col gap-6 max-md:gap-0">
        <PhoneHeader title="Practice" sub="" />
        <BackToProgress className="max-md:hidden" />
        <div className="max-md:px-4 max-md:pt-3">{body}</div>
      </div>
    );
  }

  const qs = set.questions;
  const question = qs.find((x) => x.n === cur) ?? qs.find((x) => !x.checked) ?? qs[qs.length - 1];
  if (!question) return null;
  const idx = qs.indexOf(question);
  const count = qs.length;
  const nChecked = qs.filter((x) => x.checked).length;
  const nRight = qs.filter((x) => outcomeOf(x) === "correct").length;
  const ans = answers[question.n] ?? EMPTY;
  const setAns = (a: Answer) => setAnswers((m) => ({ ...m, [question.n]: a }));
  const go = (n: number) => () => {
    check.reset();
    setCur(n);
  };
  const prev = qs[idx - 1];
  const next = qs[idx + 1];
  const done = !!question.checked;
  const busy = check.isPending && check.variables?.n === question.n;
  const valueOk = ans.value.trim() !== "" && Number.isFinite(Number(ans.value.replace(",", ".")));
  const ready = question.options.length ? ans.optionIds.length > 0 : valueOk;
  const doCheck = () => {
    if (!ready || done || busy) return;
    check.mutate({ n: question.n, body: question.options.length ? { optionIds: ans.optionIds } : { value: Number(ans.value.replace(",", ".")) } });
  };
  const [chapter, ...rest] = set.title.split(" · ");
  const topic = chapter ?? set.title;
  const timed = set.minutes != null;
  const subDesktop = `${timed ? "Timed drill from your progress" : "From your progress"} · Question ${idx + 1} of ${count}${timed && !nChecked ? "" : ` · ${nChecked} checked`}`;
  const subPhone = `Question ${idx + 1} of ${count}${timed && !nChecked ? "" : ` · ${nChecked} checked`}`;
  const finished = nChecked === count;
  const again = qs.filter((x) => x.checked && x.checked.outcome !== "correct");
  const typeLabel = multi(question) ? "One or more answers are correct" : question.options.length ? "One answer is correct" : "Type a number";
  const hasHindi = !!question.stem.hi;
  const langBtn = hasHindi && (
    <button type="button" className="btn btn-ghost btn-sm max-md:h-9" aria-pressed={lang === "hi"} lang={lang === "hi" ? "en" : "hi"} onClick={() => setLang(lang === "hi" ? "en" : "hi")}>
      {lang === "hi" ? "English" : "हिंदी"}
    </button>
  );
  const checkError = check.isError && check.variables?.n === question.n && (
    <span className="sm muted" role="alert">
      {check.error instanceof StudentApiError && check.error.code === "PRACTICE_QUESTION_HELD"
        ? "This question is now part of a live test, so it can't be checked here. Skip it for now."
        : sentence((check.error instanceof StudentApiError && check.error.message) || "Couldn't check that. Please try again")}
    </span>
  );
  const navButtons = (
    <>
      {prev ? (
        <button type="button" className="btn btn-secondary btn-lg flex-1" onClick={go(prev.n)}>
          <ArrowLeftIcon />
          Previous
        </button>
      ) : (
        <Link href="/progress" className="btn btn-secondary btn-lg flex-1">
          Back to Progress
        </Link>
      )}
      {!done && !busy && (
        <button type="button" className="btn btn-primary btn-lg flex-1" disabled={!ready} onClick={doCheck}>
          Check
        </button>
      )}
      {busy && (
        <button type="button" className="btn btn-primary btn-lg flex-1" disabled style={{ opacity: 0.9 }}>
          <Spinner />
          Checking…
        </button>
      )}
      {done && next && (
        <button type="button" className="btn btn-primary btn-lg flex-1" onClick={go(next.n)}>
          Next: Q{idx + 2}
          <ArrowRightIcon className="arrow" />
        </button>
      )}
      {done && !next && (
        <Link href="/progress" className="btn btn-primary btn-lg flex-1">
          Done
        </Link>
      )}
    </>
  );
  const finishedCard = (phone: boolean) =>
    finished && (
      <section className={phone ? "card pad col rise relative gap-2 md:hidden" : "card pad-lg row wrap rise relative gap-6 max-md:hidden"}>
        <Stamp rotate={-8} delay={700} style={phone ? { position: "absolute", top: 16, right: 16, fontSize: 11 } : { position: "absolute", top: 24, right: 28 }}>
          {phone ? "Checked" : `Checked · ${dayMonth(q.data!.now)}`}
        </Stamp>
        {!phone && (
          <svg width="96" height="96" viewBox="0 0 120 120" role="img" aria-label={`${nRight} of ${count} correct`}>
            <circle cx="60" cy="60" r="48" fill="none" stroke="#EEF0F5" strokeWidth="12" />
            <circle cx="60" cy="60" r="48" fill="none" stroke="#00007E" strokeWidth="12" strokeLinecap="round" strokeDasharray="302" strokeDashoffset={302 * (1 - nRight / count)} transform="rotate(-90 60 60)" />
          </svg>
        )}
        <div className={phone ? "col gap-2" : "col flex-[1_1_320px] gap-2"}>
          <span className="eyebrow">Set finished</span>
          <span className="num font-[650] leading-none" style={{ fontSize: phone ? 30 : 36, letterSpacing: "-.02em" }}>
            {nRight}{" "}
            <span className="font-medium text-muted" style={{ fontSize: phone ? 15 : 18 }}>
              of {count} correct
            </span>
          </span>
          <span className="sm muted" style={{ textWrap: "pretty" }}>
            {phone ? "Every question is checked." : "Every question in this set is checked."} Your progress picks these up with your next results.
          </span>
          {again.length > 0 && (
            <div className="row wrap mt-1 gap-2">
              <span className="xs muted">Look again:</span>
              {again.map((x) => (
                <button key={x.n} type="button" className={phone ? "chip h-9" : "chip"} onClick={go(x.n)}>
                  Q{qs.indexOf(x) + 1}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>
    );

  return (
    <div className="col gap-6 max-md:gap-0">
      <Doodle name="pendulum" slot="gl" style={{ top: 420 }} />
      <Doodle name="atom" slot="gr" style={{ top: 860 }} />
      {/* Phone-Practice header */}
      <PhoneHeader
        title={set.title}
        sub={subPhone}
        right={<Countdown set={set} serverNow={q.data!.now} receivedAt={q.dataUpdatedAt} phone />}
        strip={
          <nav className="qstrip" aria-label="Questions in this set">
            {qs.map((x, i) => {
              const o = outcomeOf(x);
              const on = x.n === question.n;
              return (
                <button key={x.n} type="button" className={`qc qc-${o === "partial" ? "partial" : o ?? "todo"}${on ? " qc-on" : ""}`} aria-current={on ? "true" : undefined} aria-label={`Question ${i + 1}, ${o ? OUT[o].text.toLowerCase() : "not checked"}`} onClick={go(x.n)}>
                  {i + 1}
                </button>
              );
            })}
          </nav>
        }
      />

      {/* Student-Practice header */}
      <header className="row between wrap items-end gap-4 max-md:hidden">
        <div className="col gap-1.5">
          <BackToProgress />
          <h1 className="h1 mb-1">
            <InkUnderline delay={450}>{chapter}</InkUnderline>
            {rest.length > 0 && <span className="font-medium text-muted"> · {rest.join(" · ")}</span>}
          </h1>
          <span className="sm muted">{subDesktop}</span>
        </div>
        <Countdown set={set} serverNow={q.data!.now} receivedAt={q.dataUpdatedAt} />
      </header>

      <div className="flex flex-wrap items-start gap-5 max-md:block">
        <aside className="card pad col max-w-[320px] flex-[1_1_280px] gap-3.5 self-start max-md:hidden" aria-label="Questions">
          <div className="row between">
            <span className="sm muted">Questions</span>
            <span className="xs muted">
              {nRight} correct · {nChecked - nRight} wrong · {count - nChecked} to go
            </span>
          </div>
          <div className="grid grid-cols-6 gap-1.5">
            {qs.map((x, i) => {
              const o = outcomeOf(x);
              const on = x.n === question.n;
              return (
                <button key={x.n} type="button" className={`cell ${o ?? "todo"}${on ? " sel" : ""}`} aria-current={on ? "true" : undefined} aria-label={`Question ${i + 1}, ${o ? OUT[o].text.toLowerCase() : "not checked"}`} onClick={go(x.n)}>
                  {i + 1}
                </button>
              );
            })}
          </div>
          <div className="row wrap xs muted gap-3">
            <span className="row gap-1.5">
              <span className="swatch correct" />
              Correct
            </span>
            <span className="row gap-1.5">
              <span className="swatch wrong" />
              Wrong
            </span>
            <span className="row gap-1.5">
              <span className="swatch todo" />
              Not checked
            </span>
          </div>
          <hr className="my-0.5 h-px border-0 bg-line-2" />
          <span className="xs muted" style={{ textWrap: "pretty" }}>
            Checked answers are final. Questions here never come from a test that&apos;s still open.
          </span>
        </aside>

        <div className="col min-w-0 flex-[999_1_560px] gap-5 max-md:gap-3 max-md:px-4 max-md:pt-3 max-md:pb-[calc(96px+env(safe-area-inset-bottom))]">
          {finishedCard(false)}
          {finishedCard(true)}
          <div className="row xs muted min-h-8 gap-2 md:hidden">
            <span className="grow">
              {typeLabel} · {topic}
            </span>
            {langBtn}
          </div>
          <article className="card pad-lg col fade gap-[18px] max-md:contents" aria-label={`Question ${idx + 1}`}>
            <div className="row between wrap gap-2 max-md:hidden">
              <div className="row gap-2.5">
                <span className="h3 mono">Q{idx + 1}</span>
                <span className="badge b-grey">{topic}</span>
                <span className="xs muted">{typeLabel}</span>
              </div>
              {langBtn}
            </div>
            <MathText key={`${question.n}-${lang}`} html as="div" className="q-stem pr-stem" text={pick(question.stem, lang)} />
            <Answers q={question} lang={lang} ans={ans} onAns={setAns} onEnter={doCheck} />
            {done && question.checked && (
              <div className="col fade gap-3 max-md:gap-2.5">
                <span className={`badge self-start ${OUT[question.checked.outcome].badge}`}>{OUT[question.checked.outcome].text}</span>
                {question.checked.solution ? (
                  <section className="pr-sol col gap-2 max-md:gap-1.5" aria-label="Solution">
                    <span className="eyebrow">Solution</span>
                    <MathText html as="div" className="q-stem" text={pick(question.checked.solution, lang) || question.checked.solution.en} />
                  </section>
                ) : (
                  <span className="sm muted">There&apos;s no written solution for this one yet. Ask your teacher if the key doesn&apos;t make sense.</span>
                )}
              </div>
            )}
            {checkError}
            <div className="row mt-1 gap-2.5 max-md:hidden">{navButtons}</div>
          </article>
        </div>
      </div>

      <footer className="fixed inset-x-0 bottom-0 z-(--z-topbar) row gap-2 border-t border-line bg-white px-4 pt-3 pb-[max(26px,env(safe-area-inset-bottom))] md:hidden">{navButtons}</footer>
    </div>
  );
}

function BackToProgress({ className }: { className?: string }) {
  return (
    <Link href="/progress" className={`sm row gap-1.5 self-start font-semibold text-muted ${className ?? ""}`}>
      <ArrowLeftIcon />
      Progress
    </Link>
  );
}

/** Phone-Practice's header: back to Progress, the set's title and place, the timer, the strip. */
function PhoneHeader({ title, sub, right, strip }: { title: string; sub: string; right?: React.ReactNode; strip?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-(--z-topbar) col gap-2 border-b border-line bg-white/90 px-3 pt-[calc(8px+env(safe-area-inset-top))] pb-2.5 backdrop-blur-md md:hidden">
      <div className="row gap-1.5">
        <Link href="/progress" className="btn btn-ghost btn-icon size-11 flex-none" aria-label="Back to Progress">
          <ChevronLeftIcon />
        </Link>
        <span className="col grow min-w-0 gap-px">
          <span className="h3 truncate">{title}</span>
          {sub && <span className="xs muted">{sub}</span>}
        </span>
        {right}
      </div>
      {strip}
    </header>
  );
}

function Countdown({ set, serverNow, receivedAt, phone }: { set: PracticeSet; serverNow: string; receivedAt: number; phone?: boolean }) {
  const now = useServerClock(serverNow, receivedAt, set.minutes != null);
  if (set.minutes == null) return null;
  const left = Math.max(0, Math.floor((Date.parse(set.createdAt) + set.minutes * 60_000 - now) / 1000));
  if (Number.isNaN(left)) return null;
  const text = left > 0 ? `${mmss(left)} left` : "Time’s up";
  const label = left > 0 ? `${Math.floor(left / 60)} minutes ${left % 60} seconds left` : "Time is up";
  if (phone)
    return (
      <span className={`badge num flex-none ${left > 0 ? "b-navy" : "b-live"}`} role="timer" aria-label={label}>
        {text}
      </span>
    );
  return (
    <span className={left > 0 ? "timer" : "timer up"} role="timer" aria-label={label}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" focusable="false">
        <circle cx="12" cy="13" r="8" />
        <path d="M12 9v4l2.5 2M9 2h6" />
      </svg>
      <span className="mono num text-[18px]">{text}</span>
    </span>
  );
}

/** The options (button.opt: sel before Check; done + correct / wrong after), or the number box and its key. */
function Answers({ q, lang, ans, onAns, onEnter }: { q: PracticeQuestion; lang: Lang; ans: Answer; onAns: (a: Answer) => void; onEnter: () => void }) {
  const c = q.checked;
  const yours = new Set(c ? (c.yourAnswer.optionIds ?? []) : ans.optionIds);
  const right = new Set(c?.correctAnswer.optionIds ?? []);
  const toggle = (id: string) => {
    if (c) return;
    if (multi(q)) onAns({ ...ans, optionIds: ans.optionIds.includes(id) ? ans.optionIds.filter((x) => x !== id) : [...ans.optionIds, id] });
    else onAns({ ...ans, optionIds: [id] });
  };
  if (q.options.length > 0)
    return (
      <div className="col gap-2.5 max-md:gap-2" role={multi(q) ? "group" : "radiogroup"} aria-label="Options">
        {q.options.map((o) => {
          const mine = yours.has(o.id);
          const isC = right.has(o.id);
          const cls = c ? `opt done${isC ? " correct" : mine ? " wrong" : ""}` : mine ? "opt sel" : "opt";
          const tag = c ? (isC ? (mine ? ["Your answer · correct", "You · correct"] : ["Correct answer", "Correct"]) : mine ? ["Your answer", "You"] : null) : null;
          return (
            <button key={o.id} type="button" role={multi(q) ? "checkbox" : "radio"} aria-checked={mine} aria-disabled={c ? true : undefined} className={cls} onClick={() => toggle(o.id)}>
              <span className="key">{o.key}</span>
              <MathText html as="div" className="q-stem grow min-w-0" text={pick(o, lang)} />
              {tag && (
                <span className={`badge ${isC ? "b-green" : "b-wrong"}`}>
                  <span className="max-md:hidden">{tag[0]}</span>
                  <span className="md:hidden">{tag[1]}</span>
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  if (c)
    return (
      <div className="col gap-2">
        <div className={`ans ${c.outcome === "correct" ? "correct" : "wrong"}`}>
          <span className="sm grow">Your answer</span>
          <span className="num text-[18px] font-[650] max-md:text-[17px]">{c.yourAnswer.value != null ? num(c.yourAnswer.value) : "–"}</span>
        </div>
        {c.outcome !== "correct" && c.correctAnswer.range && (
          <div className="ans correct">
            <span className="sm grow">Correct answer</span>
            <span className="num text-[18px] font-[650] max-md:text-[17px]">
              {c.correctAnswer.range.min === c.correctAnswer.range.max ? num(c.correctAnswer.range.min) : `${num(c.correctAnswer.range.min)} to ${num(c.correctAnswer.range.max)}`}
            </span>
          </div>
        )}
      </div>
    );
  return (
    <div className="field max-w-[260px] max-md:max-w-none">
      <label className="label" htmlFor="pr-value">
        Your answer
      </label>
      <input
        id="pr-value"
        className="input num"
        inputMode="decimal"
        placeholder="Type a number"
        autoComplete="off"
        value={ans.value}
        onChange={(e) => onAns({ ...ans, value: e.target.value.replace(/[^0-9.,\-]/g, "").slice(0, 16) })}
        onKeyDown={(e) => {
          if (e.key === "Enter") onEnter();
        }}
      />
    </div>
  );
}
