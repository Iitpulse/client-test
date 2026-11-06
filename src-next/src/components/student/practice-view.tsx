"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Doodle, InkUnderline, MathText, Stamp } from "@iitpulse/ui";
import { m4Api, m4Keys, useProfile, useStartPractice } from "@/lib/m4-api";
import { StudentApiError } from "@/lib/student-api";
import { useServerClock } from "@/lib/server-clock";
import { useOnline } from "@/lib/use-online";
import { asPracticeFx, fxCheck, practiceFixture, type PracticeFxName } from "@/lib/practice-fixtures";
import { dayMonth, mmss, resetsAt } from "@/lib/time";
import type { PracticeRequest } from "@/types/m4";
import type { PracticeAnswer, PracticeCheckM6, PracticeQuestionM6, PracticeSetM6 } from "@/types/practice-m6";
import { ArrowLeftIcon, ArrowRightIcon, Spinner } from "@/components/shell/icons";
import { Skel, useFixtureAfterHydration } from "./common";
import { ChevronLeftIcon } from "./icons";
import { sentence } from "./labels";
import { OfflineBanner, supportCode } from "./states";
import { answered, cellOutcome, checkBody, MatrixGrid, NumberAnswer, OptionList, outcomeLine, PassageHead, typeLabel } from "./practice-types";

/**
 * /practice/[setId]: Student-Practice (desktop) and Phone-Practice. A set made from Progress (POST
 * /tests/student/practice): the questions grid (desktop) or strip (phone), one question at a time; answer, Check
 * (POST …/questions/:n/check), then the key and the solution. Checks are final. A timed drill counts down from when
 * the set was made; when it runs out the student can still check. Once every question is checked: "Set finished".
 * Progress stays highlighted in the top bar (the set belongs to it); on phones a back header and no tab bar.
 *
 * Batch 5 states: loading, couldn't load (Code E-…), offline (read the set, Check waits), set not found, a question held
 * back because it went into a live test (PRACTICE_QUESTION_HELD), and the answer types (multi-correct, numerical range,
 * passage, matrix). /practice/new?problem=… shows why a set couldn't be made (practice-button.tsx sends the student
 * there): nothing left in the chapter, 30 sets today, the question bank unreachable.
 */

type Lang = "en" | "hi";
const EMPTY: PracticeAnswer = { optionIds: [], value: "", matrix: {} };
const pick = (t: { en: string; hi: string | null }, lang: Lang) => (lang === "hi" && t.hi ? t.hi : t.en);
const OUT_WORD = { correct: "correct", partial: "partly correct", wrong: "wrong" } as const;

export type PracticeProblem = { code: "NO_PRACTICE_QUESTIONS" | "PRACTICE_LIMIT" | "PRACTICE_UNAVAILABLE"; req: PracticeRequest; resetsAt: string | null };

/** The `?fixture=` practice state (dev and staging only): undefined until the URL is read (after hydration). */
function usePracticeFx(): PracticeFxName | null | undefined {
  const name = useFixtureAfterHydration();
  return name === undefined ? undefined : asPracticeFx(name);
}

export function PracticeView({ setId, problem }: { setId: string; problem?: PracticeProblem | null }) {
  const fx = usePracticeFx();
  if (fx === undefined) return <PracticeSkeleton />;
  if (fx === "noleft" || fx === "limit" || fx === "unavailable") {
    const code = fx === "noleft" ? "NO_PRACTICE_QUESTIONS" : fx === "limit" ? "PRACTICE_LIMIT" : "PRACTICE_UNAVAILABLE";
    return <ProblemPage p={{ code, req: { chapter: "Rotational motion", count: 12 }, resetsAt: nextMidnight() }} fixture />;
  }
  if (setId === "new" && !fx) return problem ? <ProblemPage p={problem} /> : <Message kind="notfound" />;
  return <SetView key={fx ?? "live"} setId={setId} fxName={fx} />;
}

function nextMidnight(): string {
  const IST = 5.5 * 3600_000;
  const d = new Date(Date.now() + IST);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1) - IST).toISOString();
}

function SetView({ setId, fxName }: { setId: string; fxName: PracticeFxName | null }) {
  const client = useQueryClient();
  const online = useOnline();
  const [fxAt] = useState(() => Date.now());
  const fx = useMemo(() => (fxName && fxName !== "loading" && fxName !== "error" && fxName !== "notfound" ? practiceFixture(fxName, fxAt) : null), [fxName, fxAt]);
  const q = useQuery({ queryKey: m4Keys.practice(setId), queryFn: ({ signal }) => m4Api.practice(setId, signal), staleTime: 10 * 60_000, enabled: !fxName });
  const [fxSet, setFxSet] = useState<PracticeSetM6 | null>(fx?.set ?? null);
  const set: PracticeSetM6 | undefined = fx ? (fxSet ?? undefined) : (q.data?.set as PracticeSetM6 | undefined);
  const serverNow = fx ? fx.now : (q.data?.now ?? "");
  const receivedAt = fx ? Date.parse(fx.now) : q.dataUpdatedAt;
  const pref = useProfile().data?.profile?.preferences?.questionLanguage ?? "en";
  const [langChoice, setLang] = useState<Lang | null>(null);
  const lang = langChoice ?? pref;
  const [cur, setCur] = useState<number | null>(fx?.start ?? null);
  const [answers, setAnswers] = useState<Record<number, PracticeAnswer>>({});
  const [held, setHeld] = useState<Set<number>>(() => new Set(fx?.held ?? []));
  const [fxBusy, setFxBusy] = useState<number | null>(null);
  const putCheck = (n: number, check: PracticeCheckM6) => {
    if (fx) setFxSet((s) => (s ? { ...s, questions: s.questions.map((x) => (x.n === n ? { ...x, checked: check } : x)) } : s));
    else
      client.setQueryData<{ now: string; set: PracticeSetM6 }>(m4Keys.practice(setId), (c) =>
        c ? { ...c, set: { ...c.set, questions: c.set.questions.map((x) => (x.n === n ? { ...x, checked: check } : x)) } } : c
      );
  };
  const check = useMutation({
    mutationFn: ({ n, body }: { n: number; body: { optionIds?: string[]; value?: number } }) => m4Api.practiceCheck(setId, n, body),
    onMutate: ({ n }) => setCur(n), // pin it: "the first unchecked one" would move on before the key is seen
    onSuccess: (res, { n }) => putCheck(n, res.check),
    onError: (e, { n }) => {
      if (e instanceof StudentApiError && e.code === "PRACTICE_QUESTION_HELD") setHeld((h) => new Set(h).add(n));
    },
  });

  if (!set) {
    const e = q.error instanceof StudentApiError ? q.error : null;
    if (fxName === "notfound" || (!fxName && q.isError && (e?.code === "PRACTICE_NOT_FOUND" || e?.status === 404))) return <Message kind="notfound" />;
    if (fxName === "error" || (!fxName && q.isError)) return <Message kind="error" error={q.error ?? new StudentApiError(503, "")} onRetry={() => void q.refetch()} />;
    return <PracticeSkeleton />;
  }

  const qs = set.questions;
  const question = qs.find((x) => x.n === cur) ?? qs.find((x) => !x.checked && !held.has(x.n)) ?? qs[qs.length - 1];
  if (!question) return null;
  const idx = qs.indexOf(question);
  const count = qs.length;
  const nChecked = qs.filter((x) => x.checked).length;
  const nRight = qs.filter((x) => cellOutcome(x) === "correct").length;
  const ans = answers[question.n] ?? EMPTY;
  const setAns = (a: PracticeAnswer) => setAnswers((m) => ({ ...m, [question.n]: a }));
  const go = (n: number) => () => {
    check.reset();
    setCur(n);
  };
  const prev = qs[idx - 1];
  const next = qs[idx + 1];
  const done = !!question.checked;
  const isHeld = held.has(question.n) && !done;
  const busy = (check.isPending && check.variables?.n === question.n) || fxBusy === question.n;
  const ready = answered(question, ans);
  const doCheck = () => {
    if (!ready || done || busy || !online) return;
    if (fx) {
      setFxBusy(question.n);
      const n = question.n;
      window.setTimeout(() => {
        setFxBusy(null);
        putCheck(n, fxCheck(fx, question, ans));
      }, 600);
      return;
    }
    check.mutate({ n: question.n, body: checkBody(question, ans) as { optionIds?: string[]; value?: number } });
  };
  const [chapter, ...rest] = set.title.split(" · ");
  const topic = chapter ?? set.title;
  const timed = set.minutes != null;
  // Batch 7: redo and revision sets say where they come from (PracticeSet.source) and score with the source test's marking
  const srcKind = set.source;
  const from = srcKind === "redo" ? "from your test" : srcKind === "revision" ? "from your revision list" : "from your progress";
  const setScore = (set as { score?: { marks: number; maxMarks: number; checked: number } | null }).score;
  const subDesktop = `${timed ? `Timed drill ${from}` : from[0]!.toUpperCase() + from.slice(1)} · Question ${idx + 1} of ${count}${timed && !nChecked ? "" : ` · ${nChecked} checked`}${setScore && setScore.checked ? ` · ${setScore.marks} of ${setScore.maxMarks} marks` : ""}`;
  const subPhone = `Question ${idx + 1} of ${count}${timed && !nChecked ? "" : ` · ${nChecked} checked`}`;
  const titlePhone = timed ? `${set.title.replace(/ questions$/, " Qs")} · ${set.minutes} min` : set.title;
  const finished = nChecked === count;
  const again = qs.filter((x) => x.checked && x.checked.outcome !== "correct");
  const label = typeLabel(question);
  const hasHindi = !!question.stem.hi;
  const langBtn = hasHindi && (
    <button type="button" className="btn btn-ghost btn-sm max-md:h-9" aria-pressed={lang === "hi"} lang={lang === "hi" ? "en" : "hi"} onClick={() => setLang(lang === "hi" ? "en" : "hi")}>
      {lang === "hi" ? "English" : "हिंदी"}
    </button>
  );
  const checkError = check.isError && check.variables?.n === question.n && !isHeld && (
    <span className="sm muted" role="alert">
      {sentence((check.error instanceof StudentApiError && check.error.message) || "Couldn't check that. Please try again")}
    </span>
  );
  const cellState = (x: PracticeQuestionM6) => (held.has(x.n) && !x.checked ? "held" : (cellOutcome(x) ?? "todo"));
  const cellLabel = (x: PracticeQuestionM6, i: number) => {
    const s = cellState(x);
    return `Question ${i + 1}, ${s === "held" ? "hidden while it is in a live test" : s === "todo" ? "not checked" : OUT_WORD[s]}`;
  };

  const navButtons = isHeld ? (
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
      {next ? (
        <button type="button" className="btn btn-primary btn-lg flex-1" onClick={go(next.n)}>
          Skip to Q{idx + 2}
          <ArrowRightIcon className="arrow" />
        </button>
      ) : (
        <Link href="/progress" className="btn btn-primary btn-lg flex-1">
          Done
        </Link>
      )}
    </>
  ) : (
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
      {!done && !busy && online && (
        <button type="button" className="btn btn-primary btn-lg flex-1" disabled={!ready} onClick={doCheck}>
          Check
        </button>
      )}
      {!done && !busy && !online && (
        <button type="button" className="btn btn-primary btn-lg pr-off flex-1" disabled>
          <span className="max-md:hidden">Offline · Check waits</span>
          <span className="md:hidden">Offline</span>
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
          {phone ? "Checked" : `Checked · ${dayMonth(serverNow)}`}
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
  const siblings = question.set ? qs.filter((x) => x.set?.setId === question.set!.setId) : [];
  const checked = question.checked;
  const out = checked ? outcomeLine(question, checked) : null;

  return (
    <div className="col gap-6 max-md:gap-0">
      <Doodle name="pendulum" slot="gl" style={{ top: 420 }} />
      <Doodle name="atom" slot="gr" style={{ top: 860 }} />
      {/* Phone-Practice header */}
      <PhoneHeader
        title={titlePhone}
        sub={subPhone}
        right={<Countdown set={set} serverNow={serverNow} receivedAt={receivedAt} phone />}
        strip={
          <nav className="qstrip" aria-label="Questions in this set">
            {qs.map((x, i) => {
              const s = cellState(x);
              const on = x.n === question.n;
              return (
                <button key={x.n} type="button" className={`qc qc-${s}${on ? " qc-on" : ""}`} aria-current={on ? "true" : undefined} aria-label={cellLabel(x, i)} onClick={go(x.n)}>
                  {i + 1}
                </button>
              );
            })}
          </nav>
        }
      />
      {!online && (
        <>
          <OfflineBanner className="max-md:hidden">You can read this set. Checking an answer waits until you&apos;re back.</OfflineBanner>
          <OfflineBanner className="bnr-flush md:hidden">Checking waits until you&apos;re back.</OfflineBanner>
        </>
      )}

      {/* Student-Practice header */}
      <header className="row between wrap items-end gap-4 max-md:hidden">
        <div className="col gap-1.5">
          <BackToProgress />
          <h1 className="h1 mb-1">
            <InkUnderline delay={450}>{chapter}</InkUnderline>
            {rest.length > 0 && (
              <span className="font-medium text-muted">
                {" "}
                · {rest.join(" · ")}
                {timed ? ` · ${set.minutes} min` : ""}
              </span>
            )}
          </h1>
          <span className="sm muted">{subDesktop}</span>
        </div>
        <Countdown set={set} serverNow={serverNow} receivedAt={receivedAt} />
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
              const on = x.n === question.n;
              return (
                <button key={x.n} type="button" className={`cell ${cellState(x)}${on ? " sel" : ""}`} aria-current={on ? "true" : undefined} aria-label={cellLabel(x, i)} onClick={go(x.n)}>
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
          {!isHeld && finishedCard(false)}
          {!isHeld && finishedCard(true)}
          {isHeld ? (
            <>
              <div className="row xs muted min-h-8 gap-2 md:hidden">
                <span className="grow">Question {idx + 1}</span>
                <span className="badge b-grey">Hidden for now</span>
              </div>
              <article className="card pad-lg col fade gap-[18px] max-md:contents" aria-label={`Question ${idx + 1}, hidden for now`}>
                <div className="row gap-2.5 max-md:hidden">
                  <span className="h3 mono">Q{idx + 1}</span>
                  <span className="badge b-grey">Hidden for now</span>
                </div>
                <div className="pr-held" role="status">
                  <span className="st-ico grey" aria-hidden="true">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" focusable="false">
                      <rect x="5" y="11" width="14" height="10" rx="2" />
                      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                    </svg>
                  </span>
                  <span className="h3 max-w-[520px]">This question is now in a live test, so it&apos;s hidden until the test closes</span>
                  <span className="sm muted max-w-[460px]">
                    <span className="max-md:hidden">It comes back to this set after that.</span>
                    <span className="md:hidden">It comes back here after that.</span> It doesn&apos;t count against you.
                  </span>
                </div>
                <div className="row mt-1 gap-2.5 max-md:hidden">{navButtons}</div>
              </article>
            </>
          ) : (
            <>
              <div className="row xs muted min-h-8 gap-2 md:hidden">
                <span className="grow">
                  {label} · {topic}
                </span>
                {langBtn}
              </div>
              <article className="card pad-lg col fade gap-[18px] max-md:contents" aria-label={`Question ${idx + 1}`}>
                <div className="row between wrap gap-2 max-md:hidden">
                  <div className="row gap-2.5">
                    <span className="h3 mono">Q{idx + 1}</span>
                    <span className="badge b-grey">{topic}</span>
                    <span className="xs muted">{label}</span>
                  </div>
                  {langBtn}
                </div>
                {question.set && <PassageHead q={question} siblings={siblings} lang={lang} onPick={(n) => go(n)()} />}
                <MathText key={`${question.n}-${lang}`} html as="div" className="q-stem pr-stem" text={pick(question.stem, lang)} />
                {question.type === "matrix" && question.matrix ? (
                  <MatrixGrid q={question} ans={ans} onAns={setAns} lang={lang} />
                ) : question.options.length > 0 ? (
                  <OptionList q={question} lang={lang} ans={ans} onAns={setAns} />
                ) : (
                  <NumberAnswer q={question} ans={ans} onAns={setAns} onEnter={doCheck} />
                )}
                {checked && out && (
                  <div className="col fade gap-3 max-md:gap-2.5">
                    <span className={`badge self-start ${out.badge}`}>
                      {out.text}
                      {typeof (checked as { marks?: number | null }).marks === "number" ? ` · ${marksLabel((checked as { marks?: number | null }).marks as number)}` : ""}
                    </span>
                    {checked.solution ? (
                      <section className="pr-sol col gap-2 max-md:gap-1.5" aria-label="Solution">
                        <span className="eyebrow">Solution</span>
                        <MathText html as="div" className="q-stem" text={pick(checked.solution, lang) || checked.solution.en} />
                      </section>
                    ) : (
                      <span className="sm muted">There&apos;s no written solution for this one yet. Ask your teacher if the key doesn&apos;t make sense.</span>
                    )}
                  </div>
                )}
                {checkError}
                <div className="row mt-1 gap-2.5 max-md:hidden">{navButtons}</div>
              </article>
            </>
          )}
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

/** The board's loading state: the header, the grid card and the question card (desktop); header + strip + options (phone). */
function PracticeSkeleton() {
  return (
    <div className="col gap-6 max-md:gap-0" aria-busy="true">
      <span className="sr-only" role="status">
        Loading this set
      </span>
      <header className="col gap-2.5 border-b border-line bg-white/90 px-3 pt-2 pb-2.5 md:hidden" aria-hidden="true">
        <div className="row gap-2.5">
          <Skel className="size-11 flex-none rounded-xl" />
          <span className="col grow gap-1.5">
            <Skel className="h-4 w-[70%]" />
            <Skel className="h-3 w-[45%]" />
          </span>
        </div>
        <Skel className="h-8 rounded-lg" />
      </header>
      <div className="col gap-2.5 px-4 pt-3 md:hidden">
        <Skel className="h-3.5 w-[60%]" />
        <Skel className="h-[110px] rounded-[14px]" />
        {[0, 1, 2, 3].map((k) => (
          <Skel key={k} className="h-[52px] rounded-xl" />
        ))}
      </div>
      <div className="col gap-6 max-md:hidden">
        <header className="col gap-2.5">
          <Skel className="h-3.5 w-[90px]" />
          <Skel className="h-10 w-[420px] rounded-[10px]" />
          <Skel className="h-3.5 w-[260px]" />
        </header>
        <div className="flex flex-wrap items-start gap-5">
          <Skel className="h-[300px] max-w-[320px] flex-[1_1_280px] rounded-card" />
          <div className="card pad-lg col flex-[999_1_560px] gap-3.5">
            <Skel className="h-5 w-[220px]" />
            <Skel className="h-3.5" />
            <Skel className="h-3.5 w-4/5" />
            <Skel className="mt-1.5 h-14 rounded-xl" />
            <Skel className="h-14 rounded-xl" />
            <Skel className="h-14 rounded-xl" />
            <Skel className="h-14 rounded-xl" />
            <Skel className="mt-1.5 h-12 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

type MsgKind = "error" | "notfound" | "noleft" | "limit" | "unavailable";

const ICONS: Record<MsgKind, { tone: string; path: React.ReactNode }> = {
  error: { tone: "red", path: <><circle cx="12" cy="12" r="9" /><path d="M12 7.5v5.5M12 16.5h.01" /></> },
  notfound: { tone: "grey", path: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></> },
  noleft: { tone: "navy", path: <><circle cx="12" cy="12" r="9" /><path d="m8 12.5 2.8 2.8L16.5 9.5" /></> },
  limit: { tone: "amber", path: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></> },
  unavailable: { tone: "amber", path: <><path d="M7 18h10a4 4 0 0 0 .6-7.95A6 6 0 0 0 6.2 9.1 4.5 4.5 0 0 0 7 18z" /><path d="M3 3l18 18" /></> },
};

/** The page-sized states (Student-Practice / Phone-Practice "msg"): bare header, icon, sentence, buttons, support code. */
function Message({ kind, error, onRetry, chapter, when, busy }: { kind: MsgKind; error?: unknown; onRetry?: () => void; chapter?: string; when?: string; busy?: boolean }) {
  const ico = ICONS[kind];
  const copy: Record<MsgKind, { title: string; text: string }> = {
    error: { title: "Couldn’t load this set", text: "Your checked answers are safe. Try again in a moment." },
    notfound: { title: "This set isn’t here", text: "The link may be old, or the set was removed. Your progress page has fresh sets for you." },
    noleft: { title: `You’ve done every question in ${chapter ?? "this chapter"}`, text: "There’s nothing new left in this chapter for now. More questions are added often." },
    limit: { title: "That’s 30 new sets for today", text: `You can start new sets again ${when ?? "tomorrow at 12:00 AM"}. Sets you’ve already started still open.` },
    unavailable: { title: "Practice is unavailable right now", text: "We can’t reach the question bank. Your checked answers are safe. Try again in a few minutes." },
  };
  const retry = kind === "error" || kind === "unavailable";
  return (
    <div className="col gap-6 max-md:min-h-dvh max-md:gap-0">
      <header className="col gap-1.5 max-md:hidden">
        <BackToProgress />
        <h1 className="h1">Practice</h1>
      </header>
      <header className="row gap-1.5 border-b border-line bg-white/90 px-3 pt-[calc(8px+env(safe-area-inset-top))] pb-2.5 md:hidden">
        <Link href="/progress" className="btn btn-ghost btn-icon size-11 flex-none" aria-label="Back to Progress">
          <ChevronLeftIcon />
        </Link>
        <span className="h3">Practice</span>
      </header>
      <section className="card pad-lg pr-msg" role={kind === "error" ? "alert" : "status"}>
        <span className={`st-ico ${ico.tone}`} aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" focusable="false">
            {ico.path}
          </svg>
        </span>
        <h2 className="h3">{copy[kind].title}</h2>
        <span className="sm muted max-w-[460px]">{copy[kind].text}</span>
        <div className="pr-acts">
          {kind === "noleft" && (
            <Link href="/progress" className="btn btn-secondary">
              Back to Progress
            </Link>
          )}
          {retry ? (
            <button type="button" className="btn btn-primary" disabled={busy} onClick={onRetry}>
              {busy && <Spinner size={14} />}
              Try again
            </button>
          ) : kind !== "noleft" ? (
            <Link href="/progress" className="btn btn-primary">
              Back to Progress
            </Link>
          ) : null}
        </div>
        {retry && <span className="xs muted mono">Code {supportCode(error ?? new StudentApiError(503, "", kind === "unavailable" ? "PRACTICE_UNAVAILABLE" : undefined))}</span>}
      </section>
    </div>
  );
}

/** /practice/new?problem=…: why a set couldn't be made (practice-button.tsx), with "Try again" for the bank. */
function ProblemPage({ p, fixture }: { p: PracticeProblem; fixture?: boolean }) {
  const start = useStartPractice();
  const [now] = useState(() => Date.now());
  const kind: MsgKind = p.code === "NO_PRACTICE_QUESTIONS" ? "noleft" : p.code === "PRACTICE_LIMIT" ? "limit" : "unavailable";
  const r = p.resetsAt ? resetsAt(now, p.resetsAt) : null;
  const when = r === "tomorrow" ? "tomorrow at 12:00 AM" : (r ?? undefined);
  const err = start.error ?? new StudentApiError(503, "", p.code);
  return (
    <Message
      kind={kind}
      chapter={p.req.topic || p.req.chapter}
      when={when}
      error={err}
      busy={start.isPending}
      onRetry={() => {
        if (!fixture) start.mutate(p.req);
      }}
    />
  );
}

function Countdown({ set, serverNow, receivedAt, phone }: { set: PracticeSetM6; serverNow: string; receivedAt: number; phone?: boolean }) {
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

/** "+4 marks", "−1 mark", "0 marks" (batch 7: the source test's marking) */
function marksLabel(m: number): string {
  const n = Math.abs(m);
  return `${m > 0 ? "+" : m < 0 ? "−" : ""}${n} ${n === 1 ? "mark" : "marks"}`;
}
