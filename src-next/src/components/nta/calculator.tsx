"use client";
// M6 addition to the frozen NTA exam screen (board Exam-Additions, item 6): the NTA / TCS iON style on-screen
// calculator, basic or scientific per the exam template. Stays open across questions; nothing in it is saved or sent.
// Keyboard: every key is a button (Tab / Space); typing digits, + - * / ^ ( ) . % ! works while focus is inside, Enter
// or = gives the result, Backspace deletes, Delete clears.

import { useCallback, useState } from "react";
import { useIsDesktop } from "@/lib/use-media";
import { expressionText, initialCalc, mainText, press, type AngleMode, type CalcState } from "@/lib/calculator";
import { ToolWindow } from "./tool-window";

type Key = { k: string; c?: string; label?: string };
const K = (k: string, c = "", label?: string): Key => ({ k, c, label });
const digit = (d: string) => K(d, "n");

// Desktop scientific: 11 columns (board D3)
const SCI: Key[] = [
  K("sinh"), K("cosh"), K("tanh"), K("Exp"), K("("), K(")"), K("←", "r w2", "Backspace"), K("C", "r", "Clear all"), K("+/-", "", "Change sign"), K("√", "", "Square root"),
  K("sinh⁻¹", "", "Inverse sinh"), K("cosh⁻¹", "", "Inverse cosh"), K("tanh⁻¹", "", "Inverse tanh"), K("log₂x", "", "Log base 2"), K("ln"), K("log", "", "Log base 10"), digit("7"), digit("8"), digit("9"), K("/", "", "Divide"), K("%", "", "Percent"),
  K("π", "", "Pi"), K("e"), K("n!", "", "Factorial"), K("logᵧx", "", "Log of x to base y"), K("eˣ", "", "e to the power x"), K("10ˣ", "", "10 to the power x"), digit("4"), digit("5"), digit("6"), K("*", "", "Multiply"), K("1/x", "", "Reciprocal"),
  K("sin"), K("cos"), K("tan"), K("xʸ", "", "x to the power y"), K("x³", "", "Cube"), K("x²", "", "Square"), digit("1"), digit("2"), digit("3"), K("−", "", "Minus"), K("=", "e h2", "Equals"),
  K("sin⁻¹", "", "Inverse sine"), K("cos⁻¹", "", "Inverse cosine"), K("tan⁻¹", "", "Inverse tangent"), K("ʸ√x", "", "y-th root of x"), K("³√x", "", "Cube root"), K("|x|", "", "Absolute value"), digit("0"), digit("."), K("+", "", "Plus"),
];
// Phone scientific: 6 columns (board P3)
const SCI_PHONE: Key[] = [
  K("sin"), K("cos"), K("tan"), K("sin⁻¹", "", "Inverse sine"), K("cos⁻¹", "", "Inverse cosine"), K("tan⁻¹", "", "Inverse tangent"),
  K("sinh"), K("cosh"), K("tanh"), K("sinh⁻¹", "", "Inverse sinh"), K("cosh⁻¹", "", "Inverse cosh"), K("tanh⁻¹", "", "Inverse tanh"),
  K("ln"), K("log", "", "Log base 10"), K("log₂x", "", "Log base 2"), K("logᵧx", "", "Log of x to base y"), K("eˣ", "", "e to the power x"), K("10ˣ", "", "10 to the power x"),
  K("π", "", "Pi"), K("e"), K("n!", "", "Factorial"), K("xʸ", "", "x to the power y"), K("x³", "", "Cube"), K("x²", "", "Square"),
  K("ʸ√x", "", "y-th root of x"), K("³√x", "", "Cube root"), K("√", "", "Square root"), K("|x|", "", "Absolute value"), K("1/x", "", "Reciprocal"), K("Exp"),
  K("("), K(")"), K("%", "", "Percent"), K("+/-", "", "Change sign"), K("←", "r", "Backspace"), K("C", "r", "Clear all"),
  digit("7"), digit("8"), digit("9"), K("/", "", "Divide"), K("*", "", "Multiply"), K("−", "", "Minus"),
  digit("4"), digit("5"), digit("6"), K("+", "", "Plus"), digit("0"), digit("."),
  digit("1"), digit("2"), digit("3"), K("=", "e", "Equals"),
];
// Basic: 5 columns (board D6 / P6)
const BASIC: Key[] = [
  K("MC", "m", "Memory clear"), K("MR", "m", "Memory recall"), K("MS", "m", "Memory store"), K("M+", "m", "Memory add"), K("M-", "m", "Memory subtract"),
  K("←", "r", "Backspace"), K("C", "r", "Clear all"), K("CE", "r", "Clear entry"), K("±", "", "Change sign"), K("√", "", "Square root"),
  digit("7"), digit("8"), digit("9"), K("/", "", "Divide"), K("%", "", "Percent"),
  digit("4"), digit("5"), digit("6"), K("*", "", "Multiply"), K("1/x", "", "Reciprocal"),
  digit("1"), digit("2"), digit("3"), K("−", "", "Minus"), K("=", "e h2", "Equals"),
  K("0", "n w2"), digit("."), K("+", "", "Plus"),
];
const MEMORY: Key[] = [K("MC", "m", "Memory clear"), K("MR", "m", "Memory recall"), K("MS", "m", "Memory store"), K("M+", "m", "Memory add"), K("M-", "m", "Memory subtract")];

const KEYBOARD: Record<string, string> = {
  "+": "+", "-": "−", "*": "*", "x": "*", "/": "/", "^": "xʸ", "(": "(", ")": ")", ".": ".", ",": ".", "%": "%", "!": "n!",
  "=": "=", Enter: "=", Backspace: "←", Delete: "C",
};

interface CalculatorProps {
  kind: "basic" | "scientific";
  onClose: () => void;
}

export function Calculator({ kind, onClose }: CalculatorProps) {
  const isDesktop = useIsDesktop();
  const isPhone = isDesktop === false;
  const [state, setState] = useState<CalcState>(initialCalc);
  const [mode, setMode] = useState<AngleMode>("deg");
  const [help, setHelp] = useState(false);
  const sci = kind === "scientific";
  const title = sci ? "Scientific Calculator" : "Calculator";

  const tap = useCallback((key: string) => setState((s) => press(s, key, mode)), [mode]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const target = e.target as HTMLElement;
    if (target.tagName === "INPUT") return; // Deg / Rad radios use the arrow keys
    const key = /^[0-9]$/.test(e.key) ? e.key : KEYBOARD[e.key];
    if (!key) return;
    // Space and Enter on a focused title-bar button keep their meaning
    if (e.key === "Enter" && target.closest(".nta-win-x")) return;
    e.preventDefault();
    e.stopPropagation();
    tap(key);
  };

  const keys = sci ? (isPhone ? SCI_PHONE : SCI) : BASIC;
  const gridClass = sci ? (isPhone ? "phs" : "sci") : isPhone ? "bas phb" : "bas";
  const expr = expressionText(state);
  const main = mainText(state);

  return (
    <ToolWindow
      title={title}
      label={sci ? "Scientific calculator" : "Calculator"}
      initial={sci ? { left: 718, top: 168, width: 506 } : { left: 600, top: 200, width: 280 }}
      phone="bottom"
      onClose={onClose}
      onHelp={() => setHelp((h) => !h)}
      helpOpen={help}
      testId="nta-calculator"
    >
      <div className="nta-calc-b" onKeyDown={onKeyDown}>
        {help && (
          <div className="nta-calc-help" role="note">
            <ul>
              <li>Build the sum with the keys or your keyboard, then press = (or Enter).</li>
              <li>A function key works on the number before it (9 √ = 3), or opens a bracket (√ ( 9 ) = 3).</li>
              <li>← deletes the last entry, C clears everything{sci ? "" : ", CE clears the last number"}.</li>
              {sci && <li>Deg / Rad sets the angle unit for sin, cos, tan and their inverses.</li>}
              <li>Nothing here is saved with your answers.</li>
            </ul>
          </div>
        )}
        <div className="nta-calc-d is-expr" aria-label="Expression" data-testid="calc-expression">
          <span>{expr}</span>
        </div>
        <div className="nta-calc-d" role="status" aria-live="polite" aria-label="Result" data-testid="calc-result">
          {state.memory !== null && <span className="nta-calc-mem" aria-label="Memory in use">M</span>}
          {main}
        </div>
        {sci && (
          <div className="nta-calc-r0">
            <button type="button" className="nta-k" style={{ width: 48 }} onClick={() => tap("mod")} aria-label="Modulo">
              mod
            </button>
            <fieldset className="nta-calc-rad">
              <legend className="nta-vh">Angle unit</legend>
              <label>
                <input type="radio" name="nta-calc-angle" checked={mode === "deg"} onChange={() => setMode("deg")} /> Deg
              </label>
              <label>
                <input type="radio" name="nta-calc-angle" checked={mode === "rad"} onChange={() => setMode("rad")} /> Rad
              </label>
            </fieldset>
            <span className="nta-calc-mr">
              {MEMORY.map((x) => (
                <button key={x.k} type="button" className={`nta-k ${x.c}`} aria-label={x.label} onClick={() => tap(x.k)}>
                  {x.k}
                </button>
              ))}
            </span>
          </div>
        )}
        <div className={`nta-calc-k ${gridClass}`}>
          {keys.map((x, i) => (
            <button
              key={`${x.k}-${i}`}
              type="button"
              className={`nta-k ${x.c ?? ""}`}
              aria-label={x.label}
              data-autofocus={i === 0 ? true : undefined}
              onClick={() => tap(x.k)}
            >
              {x.k}
            </button>
          ))}
        </div>
      </div>
    </ToolWindow>
  );
}
