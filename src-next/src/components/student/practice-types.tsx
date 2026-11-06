"use client";

import { MathText } from "@iitpulse/ui";
import type { MatrixAnswer, PracticeAnswer, PracticeCheckM6, PracticeQuestionM6 } from "@/types/practice-m6";
import { num } from "./labels";

/**
 * The answer area of a practice question by type (Student-Practice / Phone-Practice batch 5 states): single and
 * passage questions (one option), multi-correct (square keys, "you missed it" after Check), numerical (exact or an
 * accepted range), matrix match (a grid of tick cells, a result per row). Before Check the student picks; after it,
 * the key and their answer are marked. Math is KaTeX through MathText only.
 */

type Lang = "en" | "hi";
const pick = (t: { en: string; hi: string | null }, lang: Lang) => (lang === "hi" && t.hi ? t.hi : t.en);

export function typeLabel(q: PracticeQuestionM6): string {
  if (q.type === "multiple") return "One or more options are correct";
  if (q.type === "paragraph") return "Passage · one answer is correct";
  if (q.type === "matrix") return "Match the lists";
  return q.options.length ? "One answer is correct" : "Type a number";
}

/** Can Check be pressed with this answer? */
export function answered(q: PracticeQuestionM6, a: PracticeAnswer): boolean {
  if (q.type === "matrix") return Object.values(a.matrix).some((c) => c.length > 0);
  if (q.options.length) return a.optionIds.length > 0;
  return a.value.trim() !== "" && Number.isFinite(Number(a.value.replace(",", ".")));
}

/** The body POST …/check takes (matrix: not in the M4 contract yet, fixture mode only). */
export function checkBody(q: PracticeQuestionM6, a: PracticeAnswer): { optionIds?: string[]; value?: number; matrix?: MatrixAnswer } {
  if (q.type === "matrix") return { matrix: a.matrix };
  if (q.options.length) return { optionIds: a.optionIds };
  return { value: Number(a.value.replace(",", ".")) };
}

const sameSet = (a: string[] = [], b: string[] = []) => a.length === b.length && a.every((x) => b.includes(x));

/** "Correct · all 3 options", "Partly correct · 2 of 4 rows", "Wrong · B is not correct": the badge after Check. */
export function outcomeLine(q: PracticeQuestionM6, c: PracticeCheckM6): { text: string; badge: string } {
  const badge = c.outcome === "correct" ? "b-green" : c.outcome === "partial" ? "b-part" : "b-wrong";
  if (q.type === "multiple") {
    const right = c.correctAnswer.optionIds ?? [];
    const mine = c.yourAnswer.optionIds ?? [];
    const keyOf = (id: string) => q.options.find((o) => o.id === id)?.key ?? id;
    const bad = mine.filter((id) => !right.includes(id)).map(keyOf);
    if (c.outcome === "correct") return { text: `Correct · all ${right.length} options`, badge };
    if (c.outcome === "partial") return { text: `Partly correct · ${mine.filter((id) => right.includes(id)).length} of ${right.length} correct options`, badge };
    if (bad.length) return { text: `Wrong · ${bad.length > 1 ? `${bad.slice(0, -1).join(", ")} and ${bad[bad.length - 1]} are` : `${bad[0]} is`} not correct`, badge };
    return { text: "Wrong", badge };
  }
  if (q.type === "integer" && c.correctAnswer.range && c.correctAnswer.range.min !== c.correctAnswer.range.max)
    return { text: c.outcome === "correct" ? "Correct · inside the accepted range" : "Wrong · outside the accepted range", badge };
  if (q.type === "matrix" && q.matrix) {
    const rows = q.matrix.rows.length;
    const ok = q.matrix.rows.filter((r) => sameSet(c.yourAnswer.matrix?.[r.id], c.correctAnswer.matrix?.[r.id])).length;
    if (ok === rows) return { text: `Correct · all ${rows} rows`, badge: "b-green" };
    if (ok > 0) return { text: `Partly correct · ${ok} of ${rows} rows`, badge: "b-part" };
    return { text: "Wrong · no row right", badge: "b-wrong" };
  }
  return { text: c.outcome === "correct" ? "Correct" : c.outcome === "partial" ? "Partly correct" : "Wrong", badge };
}

/** The question-grid cell / strip chip outcome. */
export function cellOutcome(q: PracticeQuestionM6): "correct" | "wrong" | "partial" | null {
  return q.checked?.outcome ?? null;
}

/** Options: one answer (radio) or several (square keys, checkboxes). */
export function OptionList({ q, lang, ans, onAns }: { q: PracticeQuestionM6; lang: Lang; ans: PracticeAnswer; onAns: (a: PracticeAnswer) => void }) {
  const c = q.checked;
  const many = q.type === "multiple";
  const yours = new Set(c ? (c.yourAnswer.optionIds ?? []) : ans.optionIds);
  const right = new Set(c?.correctAnswer.optionIds ?? []);
  const toggle = (id: string) => {
    if (c) return;
    if (many) onAns({ ...ans, optionIds: ans.optionIds.includes(id) ? ans.optionIds.filter((x) => x !== id) : [...ans.optionIds, id] });
    else onAns({ ...ans, optionIds: [id] });
  };
  return (
    <>
      {many && !c && <span className="xs muted">Pick every correct option.</span>}
      <div className="col gap-2.5 max-md:gap-2" role={many ? "group" : "radiogroup"} aria-label={many ? "Options, pick all that are correct" : "Options"}>
        {q.options.map((o) => {
          const mine = yours.has(o.id);
          const isC = right.has(o.id);
          let cls = mine ? "opt sel" : "opt";
          let tag: [string, string, string] | null = null; // desktop, phone, badge
          if (c) {
            if (many) {
              if (mine && isC) [cls, tag] = ["opt done correct", ["Your pick · correct", "Correct", "b-green"]];
              else if (mine) [cls, tag] = ["opt done wrong", ["Your pick · not correct", "Not correct", "b-wrong"]];
              else if (isC) [cls, tag] = ["opt done miss", ["Correct · you missed it", "Missed", "b-part"]];
              else cls = "opt done";
            } else {
              cls = `opt done${isC ? " correct" : mine ? " wrong" : ""}`;
              tag = isC ? (mine ? ["Your answer · correct", "You · correct", "b-green"] : ["Correct answer", "Correct", "b-green"]) : mine ? ["Your answer", "You", "b-wrong"] : null;
            }
          }
          return (
            <button key={o.id} type="button" role={many ? "checkbox" : "radio"} aria-checked={mine} aria-disabled={c ? true : undefined} className={cls} onClick={() => toggle(o.id)}>
              <span className={many ? "key sq" : "key"}>{o.key}</span>
              <MathText html as="div" className="q-stem grow min-w-0" text={pick(o, lang)} />
              {tag && (
                <span className={`badge ${tag[2]}`}>
                  <span className="max-md:hidden">{tag[0]}</span>
                  <span className="md:hidden">{tag[1]}</span>
                </span>
              )}
            </button>
          );
        })}
      </div>
    </>
  );
}

/** A number: the box before Check; after it, your answer and the key (an accepted range shows "Accepted 4.4 to 4.6"). */
export function NumberAnswer({ q, ans, onAns, onEnter, disabled }: { q: PracticeQuestionM6; ans: PracticeAnswer; onAns: (a: PracticeAnswer) => void; onEnter: () => void; disabled?: boolean }) {
  const c = q.checked;
  if (c) {
    const r = c.correctAnswer.range;
    const ranged = !!r && r.min !== r.max;
    return (
      <div className="col gap-2">
        <div className={`ans ${c.outcome === "correct" ? "correct" : "wrong"}`}>
          <span className="sm grow">Your answer</span>
          <span className="num text-[18px] font-[650] max-md:text-[17px]">{c.yourAnswer.value != null ? num(c.yourAnswer.value) : "–"}</span>
        </div>
        {r && (ranged || c.outcome !== "correct") && (
          <div className="ans correct">
            {ranged ? (
              <span className="col grow gap-0.5">
                <span className="sm">Correct answer</span>
                <span className="xs font-semibold text-[#0E7A3D]">
                  Accepted {num(r.min)} to {num(r.max)}
                </span>
              </span>
            ) : (
              <span className="sm grow">Correct answer</span>
            )}
            <span className="num text-[18px] font-[650] max-md:text-[17px]">{num(ranged ? Math.round(((r.min + r.max) / 2) * 1e6) / 1e6 : r.min)}</span>
          </div>
        )}
      </div>
    );
  }
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
        disabled={disabled}
        value={ans.value}
        onChange={(e) => onAns({ ...ans, value: e.target.value.replace(/[^0-9.,\-]/g, "").slice(0, 16) })}
        onKeyDown={(e) => {
          if (e.key === "Enter") onEnter();
        }}
      />
    </div>
  );
}

/** A passage question: the passage, the tabs for its questions (with a status dot each). */
export function PassageHead({ q, siblings, lang, onPick }: { q: PracticeQuestionM6; siblings: PracticeQuestionM6[]; lang: Lang; onPick: (n: number) => void }) {
  const s = q.set!;
  return (
    <>
      <div className="passage">
        <span className="xs font-semibold text-primary">
          <span className="max-md:hidden">
            Passage for Q{s.nFrom} to Q{s.nTo}
          </span>
          <span className="md:hidden">
            Passage · Q{s.nFrom} to Q{s.nTo}
          </span>
        </span>
        <MathText html as="div" className="q-stem" text={pick(s.passage, lang)} />
      </div>
      <div className="kids" role="tablist" aria-label="Questions on this passage">
        {siblings.map((k) => {
          const o = cellOutcome(k);
          return (
            <button key={k.n} type="button" role="tab" aria-selected={k.n === q.n} className={k.n === q.n ? "kid on" : "kid"} onClick={() => onPick(k.n)}>
              <span className={`dot ${o === "partial" ? "wrong" : (o ?? "todo")}`} aria-hidden="true" />Q{k.n}
            </button>
          );
        })}
      </div>
    </>
  );
}

function Tick() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}
function Cross() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true" focusable="false">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

/** Matrix match: List II beside a grid of tick cells (desktop); the lists in a card, then the grid (phone). */
export function MatrixGrid({ q, ans, onAns, lang }: { q: PracticeQuestionM6; ans: PracticeAnswer; onAns: (a: PracticeAnswer) => void; lang: Lang }) {
  const m = q.matrix!;
  const c = q.checked;
  const mine: MatrixAnswer = c ? (c.yourAnswer.matrix ?? {}) : ans.matrix;
  const key: MatrixAnswer = c?.correctAnswer.matrix ?? {};
  const toggle = (r: string, col: string) => {
    if (c) return;
    const cur = ans.matrix[r] ?? [];
    onAns({ ...ans, matrix: { ...ans.matrix, [r]: cur.includes(col) ? cur.filter((x) => x !== col) : [...cur, col] } });
  };
  const listII = (
    <>
      {m.columns.map((col) => (
        <span key={col.id} className="row gap-2">
          <span className="font-serif">{col.id}</span>
          <MathText html as="span" className="q-stem" text={pick(col, lang)} />
        </span>
      ))}
    </>
  );
  const table = (phone: boolean) => (
    <table className="mx" aria-label="Pick the matches">
      <thead>
        <tr>
          <th scope="col" className="rh">
            {phone ? "I \\ II" : "List I"}
          </th>
          {m.columns.map((col) => (
            <th key={col.id} scope="col">
              {col.id}
            </th>
          ))}
          <th scope="col">
            <span className="sr-only">Result</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {m.rows.map((r) => {
          const ons = mine[r.id] ?? [];
          const ok = sameSet(ons, key[r.id]);
          const res = !c ? "" : ok ? "Right" : ons.length ? "Wrong" : "Not answered";
          return (
            <tr key={r.id}>
              <th scope="row" className="rh">
                {r.id}
                {!phone && (
                  <>
                    {"  "}
                    <MathText html as="span" text={pick(r, lang)} />
                  </>
                )}
              </th>
              {m.columns.map((col) => {
                const on = ons.includes(col.id);
                const isKey = (key[r.id] ?? []).includes(col.id);
                const cls = c ? (on && isKey ? "mc hit" : on ? "mc bad" : isKey ? "mc miss" : "mc") : on ? "mc on" : "mc";
                return (
                  <td key={col.id}>
                    <button
                      type="button"
                      className={cls}
                      aria-pressed={on}
                      aria-disabled={c ? true : undefined}
                      aria-label={`${r.id} with ${col.id}${on ? ", picked" : ""}${c && isKey ? ", correct match" : ""}`}
                      onClick={() => toggle(r.id, col.id)}
                    >
                      {on && (!c || isKey) && <Tick />}
                      {c && on && !isKey && <Cross />}
                    </button>
                  </td>
                );
              })}
              <td>
                <span className="rowres" style={{ color: ok ? "#0E7A3D" : ons.length ? "#C40000" : "#575C75" }}>
                  {res}
                </span>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
  return (
    <>
      <div className="row wrap items-start gap-8 max-md:hidden">
        <div className="col min-w-[170px] gap-1.5">
          <span className="xs muted font-semibold">List II</span>
          {listII}
        </div>
        {table(false)}
      </div>
      <div className="col gap-2.5 md:hidden">
        <div className="card col gap-2.5 rounded-[14px] px-4 py-3.5">
          <div className="col sm gap-[3px]">
            {m.rows.map((r) => (
              <span key={r.id} className="row gap-2">
                <span>{r.id}</span>
                <MathText html as="span" text={pick(r, lang)} />
              </span>
            ))}
          </div>
          <div className="row wrap gap-x-4 gap-y-1.5">{listII}</div>
        </div>
        <div className="overflow-x-auto">{table(true)}</div>
      </div>
      {!c && <span className="xs muted">Tap a cell to match a row. A row can match more than one.</span>}
      {c && (
        <div className="row wrap xs muted gap-x-3.5 gap-y-1.5">
          <span className="row gap-1.5">
            <span className="mc hit mc-key" />
            <span className="max-md:hidden">Your match, right</span>
            <span className="md:hidden">Right</span>
          </span>
          <span className="row gap-1.5">
            <span className="mc bad mc-key" />
            <span className="max-md:hidden">Your match, wrong</span>
            <span className="md:hidden">Wrong</span>
          </span>
          <span className="row gap-1.5">
            <span className="mc miss mc-key" />
            <span className="max-md:hidden">Right match you didn&apos;t mark</span>
            <span className="md:hidden">Missed</span>
          </span>
        </div>
      )}
    </>
  );
}
