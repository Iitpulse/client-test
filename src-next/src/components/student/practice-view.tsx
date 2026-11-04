"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MathText } from "@iitpulse/ui";
import { m4Api, m4Keys, useProfile } from "@/lib/m4-api";
import { StudentApiError } from "@/lib/student-api";
import { useServerClock } from "@/lib/server-clock";
import { mmss } from "@/lib/time";
import type { PracticeCheck, PracticeQuestion, PracticeSet } from "@/types/m4";
import { ArrowLeftIcon, ArrowRightIcon, Spinner } from "@/components/shell/icons";
import { ErrorCard, Skel } from "./common";
import { ChevronLeftIcon } from "./icons";
import { num, sentence } from "./labels";

/**
 * /practice/[setId]: a practice set made from Progress or the study plan (POST /tests/student/practice).
 * Laid out like Phone-Review / the Student-Result question pane: a strip of the set's questions, one question at a
 * time; answer, Check (POST …/questions/:n/check), then the key and the solution. A checked answer can't change.
 * A timed drill shows a countdown from when the set was made; when it runs out the student can still check.
 */

type Lang = "en" | "hi";
type Answer = { optionIds: string[]; value: string };
const EMPTY: Answer = { optionIds: [], value: "" };
const multi = (q: PracticeQuestion) => q.type === "multiple" || q.type === "matrix";

const OUTCOME: Record<PracticeCheck["outcome"], { text: string; badge: string; cell: string }> = {
  correct: { text: "Correct", badge: "b-green", cell: "qc-correct" },
  partial: { text: "Partly correct", badge: "b-amber", cell: "qc-partial" },
  wrong: { text: "Wrong", badge: "b-wrong", cell: "qc-wrong" },
};

export function PracticeView({ setId }: { setId: string }) {
  const q = useQuery({ queryKey: m4Keys.practice(setId), queryFn: ({ signal }) => m4Api.practice(setId, signal), staleTime: 10 * 60_000 });
  const set = q.data?.set;
  const pref = useProfile().data?.profile.preferences.questionLanguage ?? "en";
  const [langChoice, setLang] = useState<Lang | null>(null);
  const lang = langChoice ?? pref;
  const [cur, setCur] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<number, Answer>>({});

  if (!set) {
    const e = q.error instanceof StudentApiError ? q.error : null;
    return (
      <Frame title="Practice" sub="">
        {q.isError ? (
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
        )}
      </Frame>
    );
  }

  const qs = set.questions;
  const firstOpen = qs.find((x) => !x.checked) ?? qs[0];
  const question = qs.find((x) => x.n === cur) ?? firstOpen;
  if (!question) return <Frame title={set.title} sub="No questions in this set" />;
  const idx = qs.indexOf(question);
  const checked = qs.filter((x) => x.checked).length;
  const correct = qs.filter((x) => x.checked?.outcome === "correct").length;
  const ans = answers[question.n] ?? EMPTY;
  const setAns = (a: Answer) => setAnswers((m) => ({ ...m, [question.n]: a }));
  const hasHindi = qs.some((x) => x.stem.hi);
  const prev = qs[idx - 1];
  const next = qs[idx + 1];

  return (
    <Frame
      title={set.title}
      sub={`Question ${idx + 1} of ${qs.length}${checked ? ` · ${checked} checked` : ""}`}
      right={<Countdown set={set} serverNow={q.data!.now} receivedAt={q.dataUpdatedAt} />}
      strip={
        qs.length > 1 && (
          <nav className="qstrip" aria-label="Questions in this set">
            {qs.map((x, i) => {
              const on = x.n === question.n;
              const cls = x.checked ? OUTCOME[x.checked.outcome].cell : "qc-skipped";
              return (
                <button key={x.n} type="button" className={`qc ${cls}${on ? " qc-on" : ""}`} aria-current={on ? "true" : undefined} aria-label={`Question ${i + 1}${x.checked ? `, ${OUTCOME[x.checked.outcome].text.toLowerCase()}` : ""}`} onClick={() => setCur(x.n)}>
                  {i + 1}
                </button>
              );
            })}
          </nav>
        )
      }
      footer={
        <>
          {prev ? (
            <button type="button" className="btn btn-secondary btn-lg flex-1" onClick={() => setCur(prev.n)}>
              <ArrowLeftIcon />
              Previous
            </button>
          ) : (
            <Link href="/progress" className="btn btn-secondary btn-lg flex-1">
              Back to Progress
            </Link>
          )}
          {next ? (
            <button type="button" className="btn btn-primary btn-lg flex-1" onClick={() => setCur(next.n)}>
              Next: Q{idx + 2}
              <ArrowRightIcon className="arrow" />
            </button>
          ) : (
            <Link href="/progress" className="btn btn-primary btn-lg flex-1">
              Done
            </Link>
          )}
        </>
      }
    >
      <div className="row xs muted gap-2">
        <span className="grow">{question.type === "multiple" || question.type === "matrix" ? "One or more answers are correct" : question.options.length ? "One answer is correct" : "Type a number"}</span>
        {hasHindi && (
          <button type="button" className="btn btn-ghost btn-sm" aria-pressed={lang === "hi"} onClick={() => setLang(lang === "hi" ? "en" : "hi")}>
            {lang === "hi" ? "English" : <span lang="hi">हिंदी</span>}
          </button>
        )}
      </div>
      {/* pin the question on check: otherwise "the first unchecked one" would move on before the key is seen */}
      <QuestionArea key={question.n} setId={set.id} q={question} lang={lang} ans={ans} onAns={setAns} onCheck={() => setCur(question.n)} />
      {checked === qs.length && (
        <div className="card col items-start gap-2 p-4 fade">
          <span className="h3">
            {correct} of {qs.length} correct
          </span>
          <span className="sm muted">Every question in this set is checked. Your progress picks these up with your next results.</span>
        </div>
      )}
    </Frame>
  );
}

/** Phone-Review's frame: back header with the strip, the body, Previous / Next at the bottom. Centred on desktop. */
function Frame({ title, sub, right, strip, footer, children }: { title: string; sub: string; right?: React.ReactNode; strip?: React.ReactNode; footer?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="col mx-auto min-h-dvh w-full max-w-[760px] md:min-h-0 md:gap-4">
      <header className="sticky top-0 z-(--z-topbar) col gap-2 border-b border-line bg-white/90 px-3 pt-[calc(8px+env(safe-area-inset-top))] pb-2.5 backdrop-blur-md md:static md:rounded-card md:border md:px-5 md:pt-3">
        <div className="row gap-1.5">
          <Link href="/progress" className="btn btn-ghost btn-icon size-11 flex-none" aria-label="Back to Progress">
            <ChevronLeftIcon />
          </Link>
          <span className="col grow min-w-0 justify-center gap-px">
            <h1 className="h3 truncate">{title}</h1>
            {sub && <span className="xs muted">{sub}</span>}
          </span>
          {right}
        </div>
        {strip}
      </header>
      <div className="col flex-1 gap-3 px-4 pt-3.5 pb-[calc(96px+env(safe-area-inset-bottom))] md:px-0 md:pb-0">{children}</div>
      {footer && (
        <footer className="fixed inset-x-0 bottom-0 z-(--z-topbar) row gap-2 border-t border-line bg-white px-4 pt-3 pb-[max(26px,env(safe-area-inset-bottom))] md:static md:border-0 md:bg-transparent md:px-0 md:pt-4 md:pb-0">
          {footer}
        </footer>
      )}
    </div>
  );
}

function Countdown({ set, serverNow, receivedAt }: { set: PracticeSet; serverNow: string; receivedAt: number }) {
  const now = useServerClock(serverNow, receivedAt, set.minutes != null);
  if (set.minutes == null) return null;
  const left = Math.max(0, (Date.parse(set.createdAt) + set.minutes * 60_000 - now) / 1000);
  if (Number.isNaN(left)) return null;
  return left > 0 ? (
    <span className="badge b-navy num flex-none" role="timer" aria-label={`${mmss(left)} left`}>
      {mmss(left)} left
    </span>
  ) : (
    <span className="badge b-live flex-none" role="status">
      Time&apos;s up
    </span>
  );
}

const pick = (t: { en: string; hi: string | null }, lang: Lang) => (lang === "hi" && t.hi ? t.hi : t.en);

function QuestionArea({ setId, q, lang, ans, onAns, onCheck }: { setId: string; q: PracticeQuestion; lang: Lang; ans: Answer; onAns: (a: Answer) => void; onCheck: () => void }) {
  const client = useQueryClient();
  const check = useMutation({
    mutationFn: () => {
      onCheck();
      const v = Number(ans.value.replace(",", "."));
      return m4Api.practiceCheck(setId, q.n, q.options.length ? { optionIds: ans.optionIds } : { value: v });
    },
    onSuccess: (res) =>
      client.setQueryData<{ now: string; set: PracticeSet }>(m4Keys.practice(setId), (cur) =>
        cur ? { ...cur, set: { ...cur.set, questions: cur.set.questions.map((x) => (x.n === q.n ? { ...x, checked: res.check } : x)) } } : cur
      ),
  });
  const c = q.checked;
  const yours = new Set(c ? (c.yourAnswer.optionIds ?? []) : ans.optionIds);
  const right = new Set(c?.correctAnswer.optionIds ?? []);
  const valueOk = ans.value.trim() !== "" && Number.isFinite(Number(ans.value.replace(",", ".")));
  const ready = q.options.length ? ans.optionIds.length > 0 : valueOk;
  const toggle = (id: string) => {
    if (c) return;
    if (multi(q)) onAns({ ...ans, optionIds: ans.optionIds.includes(id) ? ans.optionIds.filter((x) => x !== id) : [...ans.optionIds, id] });
    else onAns({ ...ans, optionIds: [id] });
  };

  return (
    <>
      <MathText html as="div" className="q-stem card fade px-4 py-3.5 md:px-6 md:py-5" text={pick(q.stem, lang)} />
      {q.options.length > 0 ? (
        <div className="col gap-3" role={multi(q) ? "group" : "radiogroup"} aria-label="Options">
          {q.options.map((o, i) => {
            const mine = yours.has(o.id);
            const cls = c ? (right.has(o.id) ? "opt correct" : mine ? "opt wrong" : "opt") : mine ? "opt pick chosen" : "opt pick";
            const tag = c ? (right.has(o.id) ? (mine ? ["Your answer · correct", "Correct"] : ["Correct", "Correct"]) : mine ? ["Your answer", "You"] : null) : null;
            return (
              <button
                key={o.id}
                type="button"
                role={multi(q) ? "checkbox" : "radio"}
                aria-checked={mine}
                aria-disabled={!!c || undefined}
                className={`${cls} rise w-full items-center px-3 py-2.5 text-left`}
                style={{ "--i": i } as React.CSSProperties}
                onClick={() => toggle(o.id)}
              >
                <span className="key">{o.key}</span>
                <MathText html as="div" className="q-stem grow min-w-0" text={pick(o, lang)} />
                {tag && (
                  <span className={`badge ${right.has(o.id) ? "b-green" : "b-wrong"}`}>
                    <span className="max-md:hidden">{tag[0]}</span>
                    <span className="md:hidden">{tag[1]}</span>
                  </span>
                )}
              </button>
            );
          })}
        </div>
      ) : c ? (
        <div className="col gap-2.5">
          <div className={`opt ${c.outcome === "correct" ? "correct" : "wrong"} items-center`}>
            <span className="sm grow">Your answer</span>
            <span className="num font-semibold">{c.yourAnswer.value != null ? num(c.yourAnswer.value) : "–"}</span>
          </div>
          {c.correctAnswer.range && (
            <div className="opt correct items-center">
              <span className="sm grow">Correct answer</span>
              <span className="num font-semibold">
                {c.correctAnswer.range.min === c.correctAnswer.range.max ? num(c.correctAnswer.range.min) : `${num(c.correctAnswer.range.min)} to ${num(c.correctAnswer.range.max)}`}
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="field">
          <label className="label" htmlFor="pr-value">
            Your answer
          </label>
          <input
            id="pr-value"
            className="input num max-w-[240px]"
            inputMode="decimal"
            autoComplete="off"
            value={ans.value}
            onChange={(e) => onAns({ ...ans, value: e.target.value.replace(/[^0-9.,\-]/g, "").slice(0, 16) })}
            onKeyDown={(e) => {
              if (e.key === "Enter" && ready && !check.isPending) check.mutate();
            }}
          />
        </div>
      )}

      {c ? (
        <>
          <div className="row wrap gap-2">
            <span className={`badge ${OUTCOME[c.outcome].badge}`}>{OUTCOME[c.outcome].text}</span>
          </div>
          {c.solution && (pick(c.solution, lang) || c.solution.en) && (
            <section className="card col fade gap-2 p-4" aria-label="Solution">
              <span className="eyebrow">Solution</span>
              <MathText html as="div" className="q-stem" text={pick(c.solution, lang) || c.solution.en} />
            </section>
          )}
          {!c.solution && <span className="sm muted">There&apos;s no written solution for this one yet. Ask your teacher if the key doesn&apos;t make sense.</span>}
        </>
      ) : (
        <div className="row wrap gap-2.5">
          <button type="button" className="btn btn-primary" disabled={!ready || check.isPending} onClick={() => check.mutate()}>
            {check.isPending && <Spinner size={16} />}
            Check
          </button>
          {check.isError && (
            <span className="sm muted" role="alert">
              {check.error instanceof StudentApiError && check.error.code === "PRACTICE_QUESTION_HELD"
                ? "This question is now part of a live test, so it can't be checked here. Skip it for now."
                : sentence((check.error instanceof StudentApiError && check.error.message) || "Couldn't check that. Please try again")}
            </span>
          )}
        </div>
      )}
    </>
  );
}
