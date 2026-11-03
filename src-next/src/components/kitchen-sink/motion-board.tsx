"use client";

// Copied from iitp-ui/preview/MotionBoard.tsx (@iitpulse/ui 0.1.0 kitchen sink); imports point at the published package.
// Kitchen sink, part 2: the Motion board ("Motion & micro-interactions") rebuilt from @iitpulse/ui, playable.
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  AiMark,
  Blueboard,
  Highlight,
  InkTick,
  InkUnderline,
  LiveDot,
  MathText,
  Note,
  Paper,
  RING_CIRCUMFERENCE,
  Stamp,
  Sticker,
  StarIcon,
  Tape,
  TypingDots,
  useCountUp,
  useReducedMotion,
  type StyleVars,
} from "@iitpulse/ui";
import { ArrowIcon, SpinnerIcon } from "./main-board";

const EXPLAIN =
  "You took the full rod length as the lever arm. The force acts at the midpoint, so the torque is $F \\times L/2$. With $I = mL^2/3$, angular acceleration is $3F/2mL$, half of what you marked.";

type Mark = "ink" | "hl" | "st" | "tape" | "stamp" | "write";

function useTimers() {
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach((t) => clearTimeout(t)), []);
  return (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };
}

function ReplayIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  );
}

function CheckIcon({ size = 18, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

function Demo({ title, sub, stage, onReplay, timing, stageStyle }: { title: string; sub: string; stage: ReactNode; onReplay: () => void; timing: string; stageStyle?: StyleVars }) {
  return (
    <div className="card demo">
      <div className="col" style={{ gap: 4 }}>
        <span className="h3">{title}</span>
        <span className="sm muted">{sub}</span>
      </div>
      <div className="stage" style={stageStyle}>
        {stage}
      </div>
      <div className="row between">
        <button className="btn btn-ghost btn-sm replay" onClick={onReplay}>
          <ReplayIcon />
          Replay
        </button>
        <span className="mono xs muted">{timing}</span>
      </div>
    </div>
  );
}

const LISTS = {
  live: [{ tag: "Live", cls: "b-live", live: true, name: "JEE Main Mock 12" }],
  up: [
    { tag: "15 Nov", cls: "b-navy", live: false, name: "Physics Sectional 4" },
    { tag: "18 Nov", cls: "b-navy", live: false, name: "Chemistry Sectional 4" },
    { tag: "22 Nov", cls: "b-navy", live: false, name: "Full Mock 13" },
  ],
  done: [
    { tag: "248/300", cls: "b-green", live: false, name: "JEE Main Mock 11" },
    { tag: "Result 20 Nov", cls: "b-amber", live: false, name: "Maths Sectional 3" },
  ],
} as const;

export function MotionBoard() {
  const later = useTimers();
  const reduced = useReducedMotion();
  const [submit, setSubmit] = useState<"idle" | "loading" | "done">("idle");
  const [tab, setTab] = useState<keyof typeof LISTS>("live");
  const [thinking, setThinking] = useState(false);
  const [stream, setStream] = useState(EXPLAIN);
  const [streaming, setStreaming] = useState(false);
  const [scoreRun, setScoreRun] = useState(0);
  const [ringOn, setRingOn] = useState(false);
  const [toast, setToast] = useState(false);
  const [loading, setLoading] = useState(false);
  const [marks, setMarks] = useState<Record<Mark, number>>({ ink: 0, hl: 0, st: 0, tape: 0, stamp: 0, write: 0 });
  const [hov, setHov] = useState(false);
  const streamer = useRef<number | undefined>(undefined);

  // The score counts once on first view (400ms after mount, like the board), and again on Replay.
  const [scoreStarted, setScoreStarted] = useState(false);
  useEffect(() => later(() => setScoreStarted(true), 400), []); // eslint-disable-line react-hooks/exhaustive-deps
  const score = useCountUp(248, { start: scoreStarted, replayKey: scoreRun });
  useEffect(() => {
    if (!scoreStarted) return;
    setRingOn(false);
    later(() => setRingOn(true), 30);
  }, [scoreStarted, scoreRun]); // eslint-disable-line react-hooks/exhaustive-deps

  const replayMarks = (keys: Mark[]) => setMarks((m) => ({ ...m, ...Object.fromEntries(keys.map((k) => [k, m[k] + 1])) }));
  const replayHover = () => {
    setHov(false);
    later(() => setHov(true), 60);
    later(() => setHov(false), 1400);
  };
  const ask = () => {
    clearInterval(streamer.current);
    const words = EXPLAIN.split(" ");
    setThinking(true);
    setStream("");
    setStreaming(false);
    later(() => {
      let i = 0;
      setThinking(false);
      setStreaming(true);
      streamer.current = window.setInterval(() => {
        i++;
        setStream(words.slice(0, i).join(" "));
        if (i >= words.length) {
          clearInterval(streamer.current);
          setStreaming(false);
        }
      }, reduced ? 0 : 70);
    }, 1100);
  };
  useEffect(() => () => clearInterval(streamer.current), []);

  const indX = { live: 0, up: 106, done: 212 }[tab];
  const ringOffset = ringOn ? RING_CIRCUMFERENCE * (1 - 248 / 300) : RING_CIRCUMFERENCE;

  return (
    <Paper
      surface="student"
      margin={52}
      style={{ width: 1440, minHeight: 1864, padding: "56px 72px", display: "flex", flexDirection: "column", gap: 32, color: "#0D0F2B", position: "relative" }}
    >
      <header className="row between" style={{ alignItems: "flex-end" }}>
        <div className="col" style={{ gap: 8 }}>
          <span className="eyebrow">Motion system</span>
          <h1 className="h1">Every action answers back</h1>
          <p className="body muted" style={{ margin: 0, maxWidth: 680 }}>
            Press Play and try each card. Motion is short, eased and purposeful: it confirms an action, shows progress, or directs attention. Nothing loops except live,
            loading and AI-thinking states.
          </p>
        </div>
        <div className="card" style={{ padding: "14px 18px", display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 24 }}>
          {[
            ["fast", "120ms", "press, hover"],
            ["base", "200ms", "tabs, fields"],
            ["slow", "360–520ms", "entrances"],
            ["ink", "600–900ms", "marks, once"],
          ].map(([k, t, s]) => (
            <div className="col" style={{ gap: 2 }} key={k}>
              <span className="mono xs muted">{k}</span>
              <span className="h3 num">{t}</span>
              <span className="xs muted">{s}</span>
            </div>
          ))}
        </div>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 24 }}>
        <div className="card pad-lg col" style={{ gap: 16, minHeight: 300 }}>
          <div className="col" style={{ gap: 4 }}>
            <span className="h3">1 · Press, load, confirm</span>
            <span className="sm muted">Buttons sink 3% on press, show a spinner while working, then morph into a success state.</span>
          </div>
          <div className="col" style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12 }}>
            {submit === "idle" && (
              <button
                className="btn btn-primary btn-lg"
                style={{ minWidth: 200 }}
                onClick={() => {
                  setSubmit("loading");
                  later(() => setSubmit("done"), 1300);
                }}
              >
                Submit test <ArrowIcon />
              </button>
            )}
            {submit === "loading" && (
              <button className="btn btn-primary btn-lg" disabled style={{ minWidth: 200, opacity: 0.9 }}>
                <SpinnerIcon size={18} />
                Submitting…
              </button>
            )}
            {submit === "done" && (
              <>
                <button className="btn btn-lg pop" onClick={() => setSubmit("idle")} style={{ minWidth: 200, background: "#0E7A3D", color: "#fff" }}>
                  <CheckIcon />
                  Submitted
                </button>
                <span className="xs muted fade">Click again to reset</span>
              </>
            )}
          </div>
        </div>

        <div className="card pad-lg col" style={{ gap: 16, minHeight: 300 }}>
          <div className="col" style={{ gap: 4 }}>
            <span className="h3">2 · Tabs that slide, lists that settle</span>
            <span className="sm muted">The active pill glides; the new list fades up item by item, 60ms apart.</span>
          </div>
          <div className="seg" role="tablist" aria-label="Test lists" style={{ alignSelf: "flex-start", display: "grid", gridTemplateColumns: "repeat(3, 104px)", position: "relative" }}>
            <span
              aria-hidden="true"
              style={{
                position: "absolute",
                top: 4,
                left: 4,
                width: 104,
                height: 34,
                borderRadius: 8,
                background: "#fff",
                boxShadow: "0 0 0 1px #E4E6EF",
                transition: "transform 280ms var(--spring)",
                transform: `translateX(${indX}px)`,
              }}
            />
            {(
              [
                ["live", "Live", 1],
                ["up", "Upcoming", 3],
                ["done", "Done", 2],
              ] as const
            ).map(([k, label, n]) => (
              <button
                key={k}
                className={tab === k ? "tab on" : "tab"}
                role="tab"
                aria-selected={tab === k}
                onClick={() => setTab(k)}
                style={{ justifyContent: "center", background: "transparent", boxShadow: "none" }}
              >
                {label} <span className="count">{n}</span>
              </button>
            ))}
          </div>
          <div className="col" style={{ gap: 8 }} key={tab}>
            {LISTS[tab].map((it, i) => (
              <div key={it.name} className="row rise" style={{ gap: 10, padding: "10px 12px", border: "1px solid #E4E6EF", borderRadius: 10, background: "#fff", "--i": i } as StyleVars}>
                <span className={`badge ${it.cls}`}>
                  {it.live && <LiveDot />}
                  {it.tag}
                </span>
                <span className="sm" style={{ fontWeight: 600 }}>
                  {it.name}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="ai pad-lg col" style={{ gap: 14, minHeight: 300 }}>
          <AiMark />
          <div className="col" style={{ gap: 4 }}>
            <span className="h3">3 · AI streams, never pops</span>
            <span className="sm muted">Typing dots while Claude thinks, then words arrive with a blinking caret.</span>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={ask} style={{ alignSelf: "flex-start" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />
            </svg>
            {stream.length > 0 ? "Explain again" : "Explain my mistake"}
          </button>
          {thinking && (
            <div className="row fade" style={{ gap: 10 }}>
              <TypingDots />
              <span className="sm muted">Reading your answer…</span>
            </div>
          )}
          {stream.length > 0 && (
            <p className="body" style={{ margin: 0 }}>
              {/* Streaming-safe: closed $…$ render, an unclosed tail stays raw with the caret. */}
              <MathText streaming={streaming}>{stream}</MathText>
            </p>
          )}
        </div>

        <div className="card pad-lg col" style={{ gap: 16, minHeight: 300 }}>
          <div className="col" style={{ gap: 4 }}>
            <span className="h3">4 · Scores count up</span>
            <span className="sm muted">Numbers roll to their value while the ring draws, once, on first view.</span>
          </div>
          <div className="row" style={{ gap: 24, flex: 1 }}>
            <svg width="132" height="132" viewBox="0 0 120 120" role="img" aria-label="Score ring">
              <circle cx="60" cy="60" r="48" fill="none" stroke="#EEF0F5" strokeWidth="12" />
              <circle
                cx="60"
                cy="60"
                r="48"
                fill="none"
                stroke="#00007E"
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={RING_CIRCUMFERENCE}
                strokeDashoffset={ringOffset}
                transform="rotate(-90 60 60)"
                style={{ transition: "stroke-dashoffset 1100ms cubic-bezier(.2,.8,.2,1)" }}
              />
            </svg>
            <div className="col" style={{ gap: 4 }}>
              <span className="num" style={{ fontSize: 48, fontWeight: 650, letterSpacing: "-.03em" }}>
                {score}
                <span style={{ fontSize: 20, color: "#575C75" }}>/300</span>
              </span>
              <span className="sm muted">Top 12% of your batch</span>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => setScoreRun((n) => n + 1)} style={{ alignSelf: "flex-start", marginLeft: -12 }}>
            Replay
          </button>
        </div>

        <div className="card pad-lg col" style={{ gap: 16, minHeight: 300, position: "relative", overflow: "hidden" }}>
          <div className="col" style={{ gap: 4 }}>
            <span className="h3">5 · Toasts confirm quietly</span>
            <span className="sm muted">They spring up from the bottom, stay 3 seconds, and never cover the main action.</span>
          </div>
          <div className="col" style={{ flex: 1, alignItems: "center", justifyContent: "flex-start", paddingTop: 24 }}>
            <button
              className="btn btn-secondary"
              onClick={() => {
                setToast(false);
                later(() => setToast(true), 20);
                later(() => setToast(false), 3000);
              }}
            >
              Save changes
            </button>
          </div>
          {toast && (
            <div
              className="toast row"
              role="status"
              aria-live="polite"
              style={{ position: "absolute", left: 24, right: 24, bottom: 20, gap: 12, padding: "14px 16px", background: "#0D0F2B", color: "#fff", borderRadius: 14 }}
            >
              <CheckIcon size={20} color="#7BE0A6" />
              <span className="sm grow" style={{ fontWeight: 600 }}>
                Changes saved
              </span>
              <button
                onClick={() => setToast(false)}
                style={{ background: "none", border: 0, padding: "4px 6px", margin: "-4px -6px", fontSize: 13, fontWeight: 600, color: "#fff", cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3, textDecorationColor: "rgba(255,255,255,.4)" }}
              >
                Undo
              </button>
            </div>
          )}
        </div>

        <div className="card pad-lg col" style={{ gap: 16, minHeight: 300 }}>
          <div className="col" style={{ gap: 4 }}>
            <span className="h3">6 · Loading keeps its shape</span>
            <span className="sm muted">Skeletons match the final layout, so content swaps in without the page jumping.</span>
          </div>
          {loading ? (
            <div className="col" style={{ gap: 10 }}>
              <div className="skel" style={{ height: 16, width: "55%" }} />
              <div className="skel" style={{ height: 12, width: "80%" }} />
              <div className="skel" style={{ height: 12, width: "70%" }} />
              <div className="skel" style={{ height: 36, width: "40%", borderRadius: 10 }} />
            </div>
          ) : (
            <div className="col" style={{ gap: 10 }}>
              <span className="h3 rise">Physics Sectional 4</span>
              <span className="sm muted rise" style={{ "--i": 1 } as StyleVars}>
                25 questions · 60 min · 100 marks
              </span>
              <span className="sm muted rise" style={{ "--i": 2 } as StyleVars}>
                Opens 15 Nov, 10:00 AM
              </span>
              <button className="btn btn-primary btn-sm rise" style={{ alignSelf: "flex-start", "--i": 3 } as StyleVars}>
                Set reminder
              </button>
            </div>
          )}
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => {
              setLoading(true);
              later(() => setLoading(false), 1200);
            }}
            style={{ alignSelf: "flex-start", marginTop: "auto", marginLeft: -12 }}
          >
            Reload
          </button>
        </div>
      </div>

      <section className="col" style={{ gap: 20 }}>
        <div className="row between" style={{ alignItems: "flex-end", gap: 48 }}>
          <div className="col" style={{ gap: 8 }}>
            <span className="eyebrow">Classroom motion</span>
            <h2 className="h2" style={{ fontSize: 24 }}>
              Marks arrive once, like a pen on paper
            </h2>
            <p className="sm muted" style={{ margin: 0, maxWidth: 720 }}>
              Ink, highlighter, tape, stickers and stamps play once on first view, staggered with --d in ms. They never loop and never block a click. Press Replay to watch
              one again.
            </p>
          </div>
          <button
            className="btn btn-secondary"
            onClick={() => {
              replayMarks(["ink", "hl", "st", "tape", "stamp", "write"]);
              replayHover();
            }}
          >
            <ReplayIcon size={16} />
            Replay all
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 20 }}>
          <Demo
            title="7 · Ink draws on"
            sub="Paths draw themselves; an arrowhead or second stroke follows 650ms later."
            onReplay={() => replayMarks(["ink"])}
            timing="800ms · once"
            stage={
              <div className="col" style={{ gap: 14, alignItems: "center" }} key={marks.ink}>
                <span className="h2">
                  Good evening, <InkUnderline delay={100}>Aarav</InkUnderline>
                </span>
                <div className="row" style={{ gap: 8 }}>
                  <InkTick delay={600} />
                  <span className="sm" style={{ fontWeight: 600 }}>
                    Mock 11 reviewed
                  </span>
                </div>
              </div>
            }
          />
          <Demo
            title="8 · Highlighter swipe"
            sub="One stroke, left to right, on the key phrase of an AI explanation."
            onReplay={() => replayMarks(["hl"])}
            timing="620ms · once"
            stageStyle={{ padding: "0 18px" }}
            stage={
              <div className="col" style={{ gap: 8 }} key={marks.hl}>
                <AiMark iconSize={12} />
                <span className="sm">
                  <Highlight delay={150}>Rotational motion</Highlight> was your weakest topic in Mock 11.
                </span>
              </div>
            }
          />
          <Demo
            title="9 · Sticker slap"
            sub="Lands from 1.5× with a spring and settles at a tilt. Only when the data earns it."
            onReplay={() => replayMarks(["st"])}
            timing="560ms · spring"
            stage={
              <div className="mini" style={{ width: 200, paddingTop: 16 }} key={marks.st}>
                <Sticker float rotate={5} delay={150} icon={<StarIcon size={11} />} style={{ top: -13, right: 14, fontSize: 13, padding: "6px 10px 7px" }}>
                  Personal best
                </Sticker>
                <span className="xs muted">Last result · Mock 11</span>
                <span className="num" style={{ fontSize: 24, fontWeight: 650, letterSpacing: "-.02em" }}>
                  248<span style={{ fontSize: 13, color: "#575C75" }}>/300</span>
                </span>
              </div>
            }
          />
          <Demo
            title="10 · Tape drop"
            sub="Drops 8px onto the card's top edge and sticks. One taped card per screen."
            onReplay={() => replayMarks(["tape"])}
            timing="520ms · spring"
            stage={
              <div className="mini" style={{ width: 200, paddingTop: 18 }} key={marks.tape}>
                <Tape rotate={-2} delay={150} />
                <span className="sm" style={{ fontWeight: 600 }}>
                  Today's plan
                </span>
                <span className="xs muted">Built by AI from your Mock 11 answers</span>
              </div>
            }
          />
          <Demo
            title="11 · Stamp thump"
            sub="Comes down from 1.6× and settles at 85% ink, like a checked answer sheet."
            onReplay={() => replayMarks(["stamp"])}
            timing="420ms · spring"
            stage={
              <div className="row" style={{ gap: 18 }} key={marks.stamp}>
                <div className="col" style={{ gap: 2, flex: "none" }}>
                  <span className="xs muted" style={{ whiteSpace: "nowrap" }}>
                    Mock 11 score
                  </span>
                  <span className="num" style={{ fontSize: 24, fontWeight: 650, letterSpacing: "-.02em" }}>
                    248<span style={{ fontSize: 13, color: "#575C75" }}>/300</span>
                  </span>
                </div>
                <Stamp rotate={-8} delay={150}>
                  Checked · 2 Nov
                </Stamp>
              </div>
            }
          />
          <Demo
            title="12 · Write-on note"
            sub="Handwriting reveals left to right at pen speed. Chalk on a blueboard, blue ink on paper."
            onReplay={() => replayMarks(["write"])}
            timing="900ms · once"
            stage={
              <div className="col" style={{ gap: 10, alignItems: "center" }} key={marks.write}>
                <Note size="sm" write rotate={-1.5} delay={100}>
                  Monday, 2 November
                </Note>
                <Blueboard className="mini-board">
                  <span className="sm" style={{ fontWeight: 600, color: "#fff" }}>
                    JEE Main Mock 12
                  </span>
                  <Note tone="chalk" size="sm" write rotate={-4} delay={700}>
                    all the best!
                  </Note>
                </Blueboard>
              </div>
            }
          />
          <Demo
            title="13 · Papery card hover"
            sub="The sheet lifts 2px and tilts a hair; the border warms to Navy 200. No shadow. Hover it."
            onReplay={replayHover}
            timing="200ms · −0.15°"
            stage={
              <div className={`card cl-lift mini${hov ? " is-hover" : ""}`} style={{ width: 210, cursor: "pointer" }}>
                <span className="sm" style={{ fontWeight: 600 }}>
                  Physics Sectional 4
                </span>
                <span className="xs muted">Sun 15 Nov · 10:00 AM · 60 min</span>
              </div>
            }
          />
          <div className="card demo">
            <div className="col" style={{ gap: 4 }}>
              <span className="h3">14 · One page, one sequence</span>
              <span className="sm muted">Student home: every mark on its own beat, done in 2.4 seconds.</span>
            </div>
            <div className="col" style={{ gap: 7, flex: 1, justifyContent: "center" }}>
              {(
                [
                  ["Date note", 5.77, 34.62, "#3A3AB0"],
                  ["Nav underline", 9.62, 30.77, "#3A3AB0"],
                  ["Title underline", 17.31, 30.77, "#FD0001"],
                  ["Chalk note", 34.62, 34.62, "#A9ACDF"],
                  ["Tape", 34.62, 20, "#C3C6EF"],
                  ["Sticker", 42.31, 21.54, "#00007E"],
                  ["Red-pen arrow", 50, 35, "#C40000"],
                  ['"start here"', 57.69, 34.62, "#C40000"],
                ] as const
              ).map(([name, left, width, color]) => (
                <div className="tl" key={name}>
                  <span>{name}</span>
                  <div className="track">
                    <i style={{ left: `${left}%`, width: `${width}%`, background: color }} />
                  </div>
                </div>
              ))}
              <div className="tl">
                <span />
                <div className="axis">
                  <span style={{ left: 0 }}>0</span>
                  <span style={{ left: "38.46%" }}>1s</span>
                  <span style={{ left: "76.92%" }}>2s</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="card pad-lg" style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 24 }}>
        {[
          ["Hover", "Cards lift 2px and tilt a hair, like a sheet of paper, and the border warms to Navy 200. Links draw a blue-ink underline; arrows nudge 3px forward."],
          ["Page changes", "Cross-fade with the View Transitions API; shared elements (a test card into its result) morph in place."],
          ["Focus", "A 3px navy halo on every control, visible for keyboard users, never removed."],
          ["Reduced motion", "With the system setting on, every animation drops to an instant change. Ink marks appear already drawn."],
        ].map(([h, t]) => (
          <div className="col" style={{ gap: 6 }} key={h}>
            <span className="h3">{h}</span>
            <span className="sm muted">{t}</span>
          </div>
        ))}
      </div>
    </Paper>
  );
}
