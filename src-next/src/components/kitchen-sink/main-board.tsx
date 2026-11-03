"use client";

// Copied from iitp-ui/preview/MainBoard.tsx (@iitpulse/ui 0.1.0 kitchen sink); imports point at the published package.
// Kitchen sink, part 1: the Main board ("Foundations: brand, type, components") rebuilt from @iitpulse/ui.
import { useState, type ReactNode } from "react";
import {
  AiCard,
  Bar,
  Blueboard,
  Doodle,
  Highlight,
  InkArrow,
  InkCircle,
  InkMark,
  InkTick,
  InkUnderline,
  INK_PATHS,
  LiveDot,
  MathText,
  Note,
  Paper,
  ScoreRing,
  Stamp,
  StepNumber,
  Sticker,
  StreamCaret,
  Tape,
  type DoodleName,
  type StyleVars,
} from "@iitpulse/ui";

const v = (o: StyleVars) => o;

function Swatch({ color, name, note }: { color: string; name: string; note: string }) {
  return (
    <div className="card" style={{ overflow: "hidden" }}>
      <div style={{ height: 96, background: color }} />
      <div className="pad" style={{ padding: "12px 14px" }}>
        <div className="h3">{name}</div>
        <div className="xs mono muted">{note}</div>
      </div>
    </div>
  );
}

function Chip({ color, label, border }: { color: string; label: string; border?: boolean }) {
  return (
    <div className="col" style={{ gap: 6 }}>
      <div style={{ height: 44, borderRadius: 10, background: color, border: border ? "1px solid #E4E6EF" : undefined }} />
      <span className="xs mono muted">{label}</span>
    </div>
  );
}

function NavyChip({ color, name, hex, ring }: { color: string; name: string; hex: string; ring?: boolean }) {
  return (
    <div className="col" style={{ gap: 6 }}>
      <div style={{ height: 36, borderRadius: 10, background: color, boxShadow: ring ? "inset 0 0 0 1px rgba(255,255,255,.2)" : undefined }} />
      <span className="xs" style={{ color: "#FFFFFF", fontWeight: 600 }}>
        {name}
      </span>
      <span className="xs mono" style={{ color: "#A9ACDF" }}>
        {hex}
      </span>
    </div>
  );
}

function Spec({ stage, name, tok, children, stageStyle }: { stage: ReactNode; name: string; tok: string; children: ReactNode; stageStyle?: StyleVars }) {
  return (
    <div className="card spec">
      <div className="stage" style={stageStyle}>
        {stage}
      </div>
      <div className="col" style={{ gap: 3 }}>
        <div className="row between">
          <span className="nm">{name}</span>
          <span className="tok">{tok}</span>
        </div>
        <span className="xs muted">{children}</span>
      </div>
    </div>
  );
}

function InkTile({ swatch, name, tok, children, swatchStyle }: { swatch: ReactNode; name: string; tok: string; children: ReactNode; swatchStyle?: StyleVars }) {
  return (
    <div className="card ink-tile">
      <div className="ink-swatch" style={swatchStyle}>
        {swatch}
      </div>
      <div className="col" style={{ gap: 3 }}>
        <span className="nm">{name}</span>
        <span className="tok">{tok}</span>
        <span className="xs muted">{children}</span>
      </div>
    </div>
  );
}

function Ground({ name, tok, children, note }: { name: string; tok: string; children: ReactNode; note: string }) {
  return (
    <div className="col" style={{ gap: 10 }}>
      {children}
      <div className="col" style={{ gap: 3 }}>
        <div className="row between">
          <span className="nm">{name}</span>
          <span className="tok">{tok}</span>
        </div>
        <span className="xs muted">{note}</span>
      </div>
    </div>
  );
}

function MiniCard({ title, sub, num }: { title: string; sub: string; num?: boolean }) {
  return (
    <div className="mini-card" style={{ position: "absolute", right: 18, bottom: 18 }}>
      <span className="xs" style={{ fontWeight: 600 }}>
        {title}
      </span>
      <span className={num ? "xs muted num" : "xs muted"}>{sub}</span>
    </div>
  );
}

const DOODLE_LABELS: Array<[DoodleName, string]> = [
  ["incline", "Inclined plane · right"],
  ["pendulum", "Pendulum"],
  ["atom", "Atom"],
  ["benzene", "Benzene ring"],
  ["flask", "Flask"],
  ["parabola", "Parabola · right"],
  ["sine", "Sine wave · right"],
  ["integral", "Integral"],
];

const BUDGET_ROWS: Array<[ReactNode, ReactNode, ...Array<string | [string, string?]>]> = [
  [<span style={{ fontWeight: 600 }}>Student desktop</span>, <><span className="tok">.cl-paper</span> + margin rule</>, "max 3", "max 1", "max 2, gutters only", "max 1 card", "max 1, when earned", "H1 or greeting name"],
  [<span style={{ fontWeight: 600 }}>Phone</span>, <><span className="tok">.cl-paper</span>, no rule</>, "max 2", "max 1", "max 1, header only", ["0"], "max 1", "Greeting name"],
  [
    <><span style={{ fontWeight: 600 }}>Admin</span> <span className="xs muted">tenant</span></>,
    <><span className="tok">.cl-calm</span> + sidebar edge</>,
    ["0", "(1 in an empty state)"],
    ["0"],
    ["0", "(1 in an empty state)"],
    ["0"],
    ["0"],
    "Dashboard greeting only",
  ],
  [<><span style={{ fontWeight: 600 }}>Platform</span> <span className="xs muted">super admin</span></>, <><span className="tok">.cl-quiet</span> + blueboard rail</>, ["0"], ["0"], ["0"], ["0"], ["0"], ["None"]],
];

export function MainBoard() {
  const [done, setDone] = useState(true);
  return (
    <Paper surface="student" margin={52} style={{ width: 1440, minHeight: 4088, padding: "64px 72px", display: "flex", flexDirection: "column", gap: 48, color: "#0D0F2B" }}>
      <header className="row between rise" style={{ alignItems: "flex-end" }}>
        <div className="col" style={{ gap: 14 }}>
          {/* The full logo, as the board shows it (LogoMark is the nav-size crop). */}
          <img src="/iitpulse-logo.png" alt="IIT-PULSE logo" style={{ height: 56, width: "auto", alignSelf: "flex-start" }} />
          <h1 className="d1">
            <InkUnderline delay={350}>One system</InkUnderline> for students and staff
          </h1>
          <p className="body muted" style={{ margin: 0, maxWidth: 640 }}>
            Navy from the logo carries every primary action. Brand red is the spark, reserved for the logo, live tests and the teacher's red pen. A deeper Red 600 marks
            errors, wrong answers and destructive actions. Calm neutrals keep questions and equations in focus.
          </p>
        </div>
        <div className="col" style={{ gap: 6, alignItems: "flex-end" }}>
          <span className="eyebrow">Type</span>
          <span style={{ fontSize: 32, fontWeight: 650, letterSpacing: "-.02em" }}>
            Geist{" "}
            <span className="mono" style={{ fontSize: 22, fontWeight: 500, color: "#575C75" }}>
              &amp; Geist Mono
            </span>
          </span>
          <span className="cl-hand" style={{ fontSize: 22, color: "var(--cl-ink)" }}>
            + Kalam for the blue-ink notes
          </span>
        </div>
      </header>

      <section className="col rise" style={v({ gap: 16, "--i": 1 })}>
        <span className="eyebrow">Color</span>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, minmax(0, 1fr))", gap: 14 }}>
          <Swatch color="#00007E" name="Navy" note="#00007E · primary" />
          <Swatch color="#1B1B96" name="Navy 600" note="#1B1B96 · hover" />
          <Swatch color="#E1E3F8" name="Navy 100" note="#E1E3F8 · selection" />
          <Swatch color="#F1F2FC" name="Navy 50" note="#F1F2FC · AI surfaces" />
          <Swatch color="#FD0001" name="Brand red" note="#FD0001 · logo, live, title ink" />
          <Swatch color="#C40000" name="Red 600" note="#C40000 · text, errors" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(8, minmax(0, 1fr))", gap: 14 }}>
          <Chip color="#0D0F2B" label="Ink #0D0F2B" />
          <Chip color="#575C75" label="Muted #575C75" />
          <Chip color="#E4E6EF" label="Line #E4E6EF" />
          <Chip color="#F4F5FA" label="Paper #F4F5FA" border />
          <Chip color="#0E7A3D" label="Correct #0E7A3D" />
          <Chip color="#9A5800" label="Partial #9A5800" />
          <Chip color="#0B63C4" label="Info #0B63C4" />
          <Chip color="#FFFFFF" label="Surface #FFFFFF" border />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(8, minmax(0, 1fr))", gap: 14 }}>
          <Chip color="#00005E" label="Navy 700 #00005E" />
          <Chip color="#3A3AB0" label="Navy 500 #3A3AB0" />
          <Chip color="#C3C6EF" label="Navy 200 #C3C6EF · hover, focus" />
          <Chip color="#EEF0F5" label="Line 2 #EEF0F5" border />
          <Chip color="#E9F6EE" label="Green 50 #E9F6EE" border />
          <Chip color="#FFF4E2" label="Amber 50 #FFF4E2" border />
          <Chip color="#E8F1FD" label="Sky 50 #E8F1FD" border />
          <Chip color="#FFF0F0" label="Red 50 #FFF0F0" border />
        </div>
        <Blueboard
          smudge={{ right: -40, top: -30 }}
          style={{ borderRadius: 16, padding: "18px 20px", display: "grid", gridTemplateColumns: "140px repeat(6, minmax(0, 1fr))", gap: 14, alignItems: "start" }}
        >
          <div className="col" style={{ gap: 4 }}>
            <span className="eyebrow" style={{ color: "#C3C6EF" }}>
              On navy
            </span>
            <span className="xs" style={{ color: "#A9ACDF" }}>
              Text, bars and status on the blueboard: heroes and the platform sidebar
            </span>
          </div>
          <NavyChip color="#FFFFFF" name="On navy" hex="#FFFFFF" />
          <NavyChip color="#C3C6EF" name="On navy 2" hex="#C3C6EF" />
          <NavyChip color="#A9ACDF" name="On navy 3" hex="#A9ACDF" />
          <NavyChip color="#A9AEFF" name="Accent" hex="#A9AEFF" />
          <NavyChip color="#23238A" name="Navy raised" hex="#23238A" ring />
          <NavyChip color="#3DDC84" name="Positive on navy" hex="#3DDC84" />
        </Blueboard>
      </section>

      <section id="classroom" className="col rise" style={v({ gap: 28, "--i": 1 })}>
        <div className="row between" style={{ alignItems: "flex-end", gap: 48 }}>
          <div className="col" style={{ gap: 10 }}>
            <span className="eyebrow">Classroom layer</span>
            <h2 className="h1">Pen and paper</h2>
            <p className="body muted" style={{ margin: 0, maxWidth: 720 }}>
              Every student page is a sheet from a JEE aspirant's notebook: faint graph paper, one red margin rule, pencil doodles in the gutters and a little paper grain.
              Navy is the student's blue ink. Red is the teacher's red pen, and it means one thing only: look here.
            </p>
          </div>
          <div className="col" style={{ gap: 8, maxWidth: 400 }}>
            {(
              [
                [300, "Celebrations are blue ink: a navy sticker, a navy circle."],
                [450, "Red pen marks the weakest topic, a mistake to redo or a deadline. Never a win."],
                [600, "Expressive for students, calm for admin, plain for the platform."],
              ] as const
            ).map(([d, t]) => (
              <div className="row" style={{ gap: 10, alignItems: "flex-start" }} key={d}>
                <InkTick delay={d} style={{ marginTop: 3, flex: "none" }} />
                <span className="sm">{t}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="col" style={{ gap: 12 }}>
          <span className="eyebrow">Inks</span>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 16 }}>
            <InkTile swatch={<InkMark paths={[INK_PATHS.scribble]} viewBox="0 0 190 34" tone="ink" weight="thick" inline width={190} height={34} delay={200} />} name="Blue ink" tok="--cl-ink · #1B1B96">
              Notes, circles, ticks, done strikes, stickers. Follows the tenant's primary.
            </InkTile>
            <InkTile swatch={<InkMark paths={[INK_PATHS.scribble]} viewBox="0 0 190 34" tone="pen" weight="thick" inline width={190} height={34} delay={350} />} name="Teacher's red pen" tok="--cl-pen · #C40000">
              "Look here". One mark per student screen. 5.9:1 on white.
            </InkTile>
            <InkTile swatch={<InkMark paths={[INK_PATHS.bar]} viewBox="0 0 190 34" tone="brand" weight="thick" inline width={190} height={34} delay={500} />} name="Brand red" tok="--red · #FD0001">
              The logo's bar, drawn by hand under the page title. Nowhere else.
            </InkTile>
            <InkTile
              swatch={
                <span className="xs" style={{ position: "relative", fontWeight: 600, color: "#0D0F2B", fontSize: 14 }}>
                  <Highlight delay={650}>Rotational motion</Highlight>
                </span>
              }
              name="Highlighter"
              tok="--cl-hl · 120 128 250"
            >
              Navy-violet, one key phrase of AI text. Red is never a highlighter.
            </InkTile>
            <InkTile
              swatchStyle={{ gap: 18 }}
              swatch={
                <>
                  <svg width="64" height="34" viewBox="0 0 84 46" aria-hidden="true" style={{ color: "rgba(0,0,126,.3)", overflow: "visible" }}>
                    <path d="M4 42H80V12Z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
                    <path d="M38 30l12-5 4 8-12 5z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
                  </svg>
                  <Blueboard as="span" className="board-chip">
                    <Note tone="chalk" size="sm" rotate={-3}>
                      chalk
                    </Note>
                  </Blueboard>
                </>
              }
              name="Pencil and chalk"
              tok="--cl-pencil · 13% navy"
            >
              Pencil for gutter doodles. White chalk for one note on a blueboard.
            </InkTile>
          </div>
        </div>

        <div className="col" style={{ gap: 12 }}>
          <span className="eyebrow">Grounds</span>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 16 }}>
            <Ground name="Paper" tok=".cl-paper" note="Student pages. Graph grid, warm and cool ink wash, grain .42, one red margin rule 20px left of the container.">
              <Paper root={false} margin={34} className="ground">
                <MiniCard title="Today's plan" sub="1 of 4 done" />
              </Paper>
            </Ground>
            <Ground name="Calm" tok=".cl-paper.cl-calm" note="Admin main column. Dot grid, grain .24. The margin rule moves to the sidebar's edge (.cl-margin-edge).">
              <Paper root={false} surface="admin" className="ground">
                <div
                  className="cl-margin-edge"
                  aria-hidden="true"
                  style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 64, background: "#fff", padding: "18px 10px", display: "flex", flexDirection: "column", gap: 8 }}
                >
                  <i className="ln" style={{ background: "#F1F2FC" }} />
                  <i className="ln" />
                  <i className="ln" />
                  <i className="ln" />
                </div>
                <MiniCard title="Active students" sub="1,284" num />
              </Paper>
            </Ground>
            <Ground name="Quiet" tok=".cl-paper.cl-quiet" note="Super admin. Fainter dots, grain .18, and no marks at all. Only the ground carries the personality.">
              <Paper root={false} surface="platform" className="ground">
                <MiniCard title="Institutes" sub="42" num />
              </Paper>
            </Ground>
            <Ground name="Blueboard" tok=".cl-board" note="Student hero, result hero, platform sidebar. Navy gradient, chalk dust, an erased smudge, one chalk note.">
              <Blueboard
                className="ground"
                smudge={{ right: -90, top: 18, width: 300, height: 110 }}
                style={{ padding: 22, display: "flex", flexDirection: "column", justifyContent: "space-between", border: 0 }}
              >
                <div className="col" style={{ gap: 4 }}>
                  <span className="xs" style={{ color: "#C3C6EF" }}>
                    Live now
                  </span>
                  <span className="h2" style={{ color: "#fff" }}>
                    JEE Main Mock 12
                  </span>
                </div>
                <Note tone="chalk" write rotate={-4} delay={900} style={{ alignSelf: "flex-end", fontSize: 19 }}>
                  all the best!
                </Note>
              </Blueboard>
            </Ground>
          </div>
        </div>

        <div id="marks" className="col" style={{ gap: 12 }}>
          <div className="row between" style={{ alignItems: "baseline" }}>
            <span className="eyebrow">Marks</span>
            <span className="xs muted">Every mark draws, swipes or lands once, staggered with --d in ms. Reduced motion shows them finished.</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 16 }}>
            <Spec
              stage={
                <span className="h2">
                  Good evening, <InkUnderline delay={300}>Aarav</InkUnderline>
                </span>
              }
              name="Title underline"
              tok=".cl-underline"
            >
              Brand red, on the student H1 or greeting name. Admin: dashboard greeting only. Platform: none.
            </Spec>
            <Spec
              stage={
                <span className="row" style={{ gap: 2, alignItems: "baseline" }}>
                  <span style={{ fontSize: 30, fontWeight: 650, letterSpacing: "-.02em" }}>
                    <InkCircle delay={450} className="num">
                      248
                    </InkCircle>
                  </span>
                  <span className="num" style={{ fontSize: 16, color: "#575C75", marginLeft: 10 }}>
                    /300
                  </span>
                </span>
              }
              name="Ink circle"
              tok=".cl-circled"
            >
              Blue ink, max 1 per screen, student only. Around one number or word, never a chart.
            </Spec>
            <Spec
              stage={
                <div className="row" style={{ gap: 6 }}>
                  <span className="sm" style={{ fontWeight: 600 }}>
                    Rotational motion
                  </span>
                  <InkArrow delay={600} style={{ marginTop: 2 }} />
                  <Note tone="pen" size="sm" write rotate={-3} delay={800}>
                    start here
                  </Note>
                </div>
              }
              name="Red-pen arrow"
              tok=".cl-ink.pen"
            >
              The one red-pen mark per screen: the weakest topic, a mistake to redo or a deadline.
            </Spec>
            <Spec
              stage={
                <div className="row" style={{ gap: 8 }}>
                  <InkTick delay={750} />
                  <span className="sm" style={{ fontWeight: 600 }}>
                    Mock 11 reviewed
                  </span>
                </div>
              }
              name="Tick"
              tok=".cl-ink.ink"
            >
              Blue ink. Confirms a finished step in a list the student owns.
            </Spec>
            <Spec
              stageStyle={{ padding: "0 20px" }}
              stage={
                <span className="sm" style={{ textAlign: "center" }}>
                  <Highlight delay={900}>Rotational motion</Highlight> was your weakest topic in Mock 11.
                </span>
              }
              name="Highlighter"
              tok=".cl-hl"
            >
              Max 1 short phrase, only in an AI explanation or summary. Admin may use 1. Never in nav.
            </Spec>
            <Spec
              stage={
                <div className="mini-card" style={{ position: "relative", width: 176, padding: "14px 14px 12px" }}>
                  <Tape rotate={-2} delay={1000} />
                  <span className="xs" style={{ fontWeight: 600 }}>
                    Today's plan
                  </span>
                  <span className="xs muted">1 of 4 done</span>
                </div>
              }
              name="Tape"
              tok=".cl-tape"
            >
              One card per student desktop screen, centred across the top edge. Never over data. Phone: none.
            </Spec>
            <Spec
              stage={
                <Sticker rotate={5} delay={1100}>
                  Personal best
                </Sticker>
              }
              name="Sticker"
              tok=".cl-sticker"
            >
              Blue ink, max 1 per screen, only when the data earns it: 248 is the best of six mocks.
            </Spec>
            <Spec
              stage={
                <Stamp rotate={-8} delay={1200}>
                  Checked · 2 Nov
                </Stamp>
              }
              name="Stamp"
              tok=".cl-stamp"
            >
              Result screens only. The score card comes back marked, like a checked answer sheet.
            </Spec>
            <Spec
              stage={
                <div className="row" style={{ gap: 18 }}>
                  <StepNumber delay={500}>1</StepNumber>
                  <StepNumber delay={650}>2</StepNumber>
                  <StepNumber delay={800}>3</StepNumber>
                </div>
              }
              name="Step number"
              tok=".cl-num"
            >
              Circled by hand in blue ink. Student plans and how-to steps.
            </Spec>
            <Spec
              stage={
                <label className="row" style={{ gap: 10, cursor: "pointer" }}>
                  <input type="checkbox" className="check" checked={done} onChange={(e) => setDone(e.target.checked)} aria-label="Mark done" />
                  <span className={done ? "sm cl-done" : "sm"} style={{ fontWeight: 600 }}>
                    Re-read torque about an axis
                  </span>
                </label>
              }
              name="Done strike"
              tok=".cl-done"
            >
              Struck through in blue ink, never red. Try the checkbox.
            </Spec>
            <Spec
              stage={
                <div className="row" style={{ gap: 12, alignItems: "center" }}>
                  <span className="num" style={{ fontSize: 26, fontWeight: 650, letterSpacing: "-.02em" }}>
                    248
                  </span>
                  <Note write rotate={-3} delay={1300}>
                    +24 vs Mock 10
                  </Note>
                </div>
              }
              name="Handwritten note"
              tok=".cl-note"
            >
              Kalam, 5 words max, restating data on the screen. Never on buttons, labels, tables or fields.
            </Spec>
            <Spec
              stage={
                <a href="#marks" className="cl-link sm" style={{ fontWeight: 600 }}>
                  See your study plan
                </a>
              }
              name="Link hover"
              tok=".cl-link"
            >
              Hover or focus: a blue-ink underline draws in under the link.
            </Spec>
          </div>
        </div>

        <div className="card lib" style={{ display: "grid", gridTemplateColumns: "300px minmax(0, 1fr)", gap: 32, padding: "24px 28px" }}>
          <div className="col" style={{ gap: 10 }}>
            <span className="eyebrow">Doodle library</span>
            <span className="h3">Pencil sketches for the gutters</span>
            <span className="sm muted">
              Student desktop: max 2, in the .gl and .gr gutter slots, at different heights, never touching a card. The left gutter takes the 84px ones only. Phone: 1, beside the
              greeting. Admin: 1, only in an empty state. Platform: none.
            </span>
            <span className="xs muted">Shown 3× darker here. On a page they are pencil: 13% navy, 1.4px.</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-end" }}>
            {DOODLE_LABELS.map(([name, label]) => (
              <div className="dood" key={name}>
                <Doodle name={name} />
                <span className="xs muted">{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card col" style={{ overflow: "hidden" }}>
          <div className="row between" style={{ padding: "20px 24px 16px", alignItems: "flex-end", gap: 32 }}>
            <div className="col" style={{ gap: 4 }}>
              <span className="eyebrow">Budget per screen</span>
              <span className="h3">Hard limits. The fewer marks, the more each one means.</span>
            </div>
            <span className="xs muted" style={{ maxWidth: 460, textAlign: "right" }}>
              Notes restate data on that screen in 5 words or fewer. No drop shadows anywhere. Only the live dot loops.
            </span>
          </div>
          <table className="table budget">
            <thead>
              <tr>
                <th style={{ width: 190 }}>Surface</th>
                <th>Ground</th>
                <th>Handwritten notes</th>
                <th>Red-pen marks</th>
                <th>Doodles</th>
                <th>Tape</th>
                <th>Sticker or stamp</th>
                <th>Title underline</th>
              </tr>
            </thead>
            <tbody>
              {BUDGET_ROWS.map(([surface, ground, ...cells], r) => (
                <tr key={r}>
                  <td>{surface}</td>
                  <td>{ground}</td>
                  {cells.map((c, i) =>
                    typeof c === "string" ? (
                      <td key={i}>{c}</td>
                    ) : (
                      <td key={i} className="zero">
                        {c[0]}
                        {c[1] && (
                          <>
                            {" "}
                            <span className="xs">{c[1]}</span>
                          </>
                        )}
                      </td>
                    ),
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="row" style={{ gap: 28, padding: "14px 24px 16px", background: "#FAFBFD", borderTop: "1px solid var(--line-2)" }}>
            <span className="xs">
              <strong>Ink circle</strong> <span className="muted">max 1, student only</span>
            </span>
            <span className="xs">
              <strong>Highlighter</strong> <span className="muted">max 1 phrase, AI text only</span>
            </span>
            <span className="xs">
              <strong>Animation</strong> <span className="muted">every mark plays once, staggered with --d</span>
            </span>
            <span className="xs">
              <strong>Whitelabel</strong> <span className="muted">--cl-ink, --cl-hl, --cl-margin and the board gradient follow the tenant</span>
            </span>
          </div>
        </div>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 24 }}>
        <div className="card pad-lg col rise" style={v({ gap: 18, "--i": 2 })}>
          <span className="eyebrow">Type scale</span>
          <div className="d1">Display 44 · Your score</div>
          <div className="h1">Heading 28 · JEE Main Mock 12</div>
          <div className="h2">Heading 20 · Physics, Section A</div>
          <div className="h3">Heading 16 · Rotational motion</div>
          <div className="body">
            {/* Equations are KaTeX, never images or HTML fakes. */}
            <MathText>{"Body 15 · A particle of mass $m$ moves in a circle of radius $r$ with constant speed $v$."}</MathText>
          </div>
          <div className="sm muted">Small 13 · Ends 15 Nov, 5:00 PM</div>
          <div className="row" style={{ gap: 14, alignItems: "baseline" }}>
            <span className="cl-hand" style={{ fontSize: 17, color: "var(--cl-ink)" }}>
              Handwriting 17 · +24 vs Mock 10
            </span>
            <span className="xs muted">Kalam, blue ink, notes only</span>
          </div>
          <div className="row" style={{ gap: 20 }}>
            <span className="num" style={{ fontSize: 40, fontWeight: 650, letterSpacing: "-.03em" }}>
              248<span style={{ fontSize: 20, color: "#575C75" }}>/300</span>
            </span>
            <span className="xs muted" style={{ maxWidth: 220 }}>
              Numbers use tabular figures so scores and timers never jitter.
            </span>
          </div>
        </div>

        <div className="card pad-lg col rise" style={v({ gap: 20, "--i": 3 })}>
          <span className="eyebrow">Actions</span>
          <div className="row wrap" style={{ gap: 10 }}>
            <button className="btn btn-primary">
              Start test <ArrowIcon />
            </button>
            <button className="btn btn-secondary">View result</button>
            <button className="btn btn-ghost">Cancel</button>
            <button className="btn btn-danger">Delete test</button>
            <button className="btn btn-primary" disabled style={{ opacity: 0.85 }}>
              <SpinnerIcon size={16} />
              Saving
            </button>
          </div>
          <div className="row wrap" style={{ gap: 10 }}>
            <button className="btn btn-primary btn-sm">Small</button>
            <button className="btn btn-primary">Default</button>
            <button className="btn btn-primary btn-lg">Large</button>
            <button className="btn btn-secondary btn-icon" aria-label="Search">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
            </button>
          </div>
          <span className="eyebrow">Status</span>
          <div className="row wrap" style={{ gap: 8 }}>
            <span className="badge b-live">
              <LiveDot />
              Live now
            </span>
            <span className="badge b-navy">Upcoming</span>
            <span className="badge b-green">Submitted</span>
            <span className="badge b-amber">Result on 20 Nov</span>
            <span className="badge b-grey">Ended</span>
            <span className="badge b-sky">Draft</span>
          </div>
          <span className="eyebrow">Tabs</span>
          <div className="row wrap" style={{ gap: 16 }}>
            <div className="seg">
              <button className="tab on">
                Live <span className="count">1</span>
              </button>
              <button className="tab">
                Upcoming <span className="count">3</span>
              </button>
              <button className="tab">
                Completed <span className="count">24</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 24 }}>
        <div className="card pad-lg col rise" style={v({ gap: 16, "--i": 4 })}>
          <span className="eyebrow">Inputs</span>
          <div className="field">
            <label className="label" htmlFor="f-email">
              Email
            </label>
            <input id="f-email" className="input" placeholder="you@example.com" />
          </div>
          <div className="field">
            <label className="label" htmlFor="f-err">
              Promo code
            </label>
            <input id="f-err" className="input" defaultValue="IIT20" style={{ borderColor: "#C40000", boxShadow: "0 0 0 4px #FFF0F0" }} />
            <span className="xs" style={{ color: "#C40000" }}>
              Promo codes are 6 characters
            </span>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <button className="chip on">Physics</button>
            <button className="chip">Chemistry</button>
            <button className="chip">Maths</button>
          </div>
        </div>

        <div className="card pad-lg col rise" style={v({ gap: 14, "--i": 5 })}>
          <span className="eyebrow">Question review</span>
          <div className="opt correct">
            <span className="key">A</span>
            <MathText className="body">{"$2.5\\ \\mathrm{m/s^2}$"}</MathText>
            <span className="badge b-green" style={{ marginLeft: "auto" }}>
              Correct answer
            </span>
          </div>
          <div className="opt wrong">
            <span className="key">B</span>
            <MathText className="body">{"$5\\ \\mathrm{m/s^2}$"}</MathText>
            <span className="badge b-red" style={{ marginLeft: "auto" }}>
              Your answer
            </span>
          </div>
          <div className="opt">
            <span className="key">C</span>
            <MathText className="body">{"$10\\ \\mathrm{m/s^2}$"}</MathText>
          </div>
        </div>

        <AiCard className="rise" style={v({ "--i": 6 })}>
          <p className="body" style={{ margin: 0 }}>
            <MathText>{"You used the full length as the lever arm. The force acts at the midpoint, so torque is $F \\cdot L/2$, which halves the acceleration."}</MathText>
            <StreamCaret />
          </p>
          <span className="xs muted">AI surfaces sit on Navy 50 with the sparkle mark, so students always know what came from AI. Answers stream in word by word.</span>
        </AiCard>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 24 }}>
        <div className="card pad cl-lift col rise" style={v({ gap: 10, "--i": 7 })}>
          <span className="sm muted">Average score</span>
          <span className="num" style={{ fontSize: 34, fontWeight: 650, letterSpacing: "-.02em" }}>
            172<span style={{ fontSize: 16, color: "#575C75" }}>/300</span>
          </span>
          <Bar value={57} />
        </div>
        <div className="card pad cl-lift col rise" style={v({ gap: 10, "--i": 8 })}>
          <span className="sm muted">Accuracy</span>
          <div className="row" style={{ gap: 14 }}>
            <ScoreRing value={74} label="Accuracy 74 percent" />
            <span className="num" style={{ fontSize: 30, fontWeight: 650 }}>
              74%
            </span>
          </div>
        </div>
        <div className="card pad cl-lift col rise" style={v({ gap: 12, "--i": 9 })}>
          <span className="sm muted">Loading</span>
          <div className="skel" style={{ height: 14, width: "60%" }} />
          <div className="skel" style={{ height: 30, width: "40%" }} />
          <div className="skel" style={{ height: 8 }} />
        </div>
        <div className="card pad cl-lift col rise" style={v({ gap: 10, "--i": 10 })}>
          <span className="sm muted">Radius &amp; depth</span>
          <div style={{ height: 28, borderRadius: 8, background: "var(--grad-navy)" }} />
          <div className="row" style={{ gap: 10 }}>
            {[8, 10, 12, 16, 22].map((r) => (
              <div key={r} style={{ width: 40, height: 40, borderRadius: r, background: "#E1E3F8" }} />
            ))}
          </div>
          <span className="xs muted">8 · 10 controls · 12 · 16 cards · 22 heroes. No drop shadows: cards rise 2px and tilt a hair on hover, like paper.</span>
        </div>
      </section>
    </Paper>
  );
}

export function ArrowIcon() {
  return (
    <svg className="arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export function SpinnerIcon({ size }: { size: number }) {
  return (
    <svg className="spin" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
      <path d="M21 12a9 9 0 1 1-6.2-8.6" strokeLinecap="round" />
    </svg>
  );
}
