// M6 on-screen calculator (board Exam-Additions, item 6): the engine behind the NTA / TCS iON style calculator.
// The student builds an expression ("sqrt(2*9.8*sin(30)*10)") from keys or the keyboard; "=" evaluates it with a small
// parser (no eval). Nothing here is saved or sent.

export type AngleMode = "deg" | "rad";

/** The expression as tokens, so ← removes a whole "sin(" at once. */
export type Tokens = string[];

const FN_NAMES = ["sin", "cos", "tan", "asin", "acos", "atan", "sinh", "cosh", "tanh", "asinh", "acosh", "atanh", "ln", "log", "log2", "sqrt", "cbrt", "abs", "exp"] as const;
type FnName = (typeof FN_NAMES)[number];
const BINARY = new Set(["+", "-", "*", "/", "^", " mod ", " yroot ", " logbase "]);
const POSTFIX = new Set(["!", "%", "²", "³"]);
const isDigitTok = (t: string) => /^[0-9.]$/.test(t) || t === "E";
const opens = (t: string) => t.endsWith("(") || t === "(-";
const isOperandEnd = (t: string | undefined) => !!t && (isDigitTok(t) || t === ")" || t === "π" || t === "e" || POSTFIX.has(t));

/** Index where the operand that ends the expression starts (-1 if it ends with an operator or is empty). */
export function trailingOperandStart(tokens: Tokens): number {
  let i = tokens.length - 1;
  while (i >= 0 && POSTFIX.has(tokens[i])) i--;
  if (i < 0) return -1;
  const t = tokens[i];
  if (t === ")") {
    let depth = 0;
    for (let j = i; j >= 0; j--) {
      if (tokens[j] === ")") depth++;
      else if (opens(tokens[j])) {
        depth--;
        if (depth === 0) return j;
      }
    }
    return -1;
  }
  if (t === "π" || t === "e") return i;
  if (isDigitTok(t)) {
    let j = i;
    while (j > 0 && (isDigitTok(tokens[j - 1]) || ((tokens[j - 1] === "-" || tokens[j - 1] === "+") && tokens[j - 2] === "E"))) j--;
    return j;
  }
  return -1;
}

const numberTokens = (x: number): Tokens => {
  const s = formatResult(x);
  const chars = s.replace("e+", "E").replace("e-", "E-").split("");
  return x < 0 ? ["(-", ...chars.slice(1), ")"] : chars;
};

export interface CalcState {
  tokens: Tokens;
  /** the last result ("=" pressed), shown in the main display */
  result: string | null;
  /** the expression that produced `result`, shown above it */
  lastExpr: string | null;
  /** true right after "=": a digit starts a new expression, an operator continues from the result */
  justEvaluated: boolean;
  memory: number | null;
}

export const initialCalc = (): CalcState => ({ tokens: [], result: null, lastExpr: null, justEvaluated: false, memory: null });

/** What a key does. `key` is the label on the key (digits, "+", "sin", "x²", "MS", …). */
export function press(state: CalcState, key: string, mode: AngleMode): CalcState {
  const s: CalcState = { ...state, tokens: [...state.tokens] };
  const resultValue = () => (s.result !== null && Number.isFinite(Number(s.result)) ? Number(s.result) : null);
  // After "=", continuing with an operator starts from the result; anything else starts afresh.
  const continueFromResult = () => {
    if (!s.justEvaluated) return;
    const v = resultValue();
    s.tokens = v === null ? [] : numberTokens(v);
    s.justEvaluated = false;
  };
  const freshAfterResult = () => {
    if (!s.justEvaluated) return;
    s.tokens = [];
    s.justEvaluated = false;
  };
  const last = () => s.tokens[s.tokens.length - 1];
  const appendOperand = (toks: Tokens) => {
    if (isOperandEnd(last())) s.tokens.push("*");
    s.tokens.push(...toks);
  };
  /** wrap the trailing operand as prefix…suffix, or (no operand) open prefix */
  const wrapOrOpen = (prefix: string, suffix = ")") => {
    continueFromResult();
    const i = trailingOperandStart(s.tokens);
    if (i < 0) {
      appendOperand([prefix]);
      return;
    }
    const operand = s.tokens.slice(i);
    s.tokens = [...s.tokens.slice(0, i), prefix, ...operand, suffix];
  };
  const postfix = (tok: string) => {
    continueFromResult();
    if (trailingOperandStart(s.tokens) >= 0) s.tokens.push(tok);
  };
  const binary = (tok: string) => {
    continueFromResult();
    const l = last();
    if (l === undefined) {
      if (tok === "-") s.tokens.push("-");
      return;
    }
    if (BINARY.has(l)) {
      if (tok === "-" && l !== "-" && l !== "+") s.tokens.push("-");
      else s.tokens[s.tokens.length - 1] = tok;
      return;
    }
    if (opens(l)) {
      if (tok === "-") s.tokens.push("-");
      return;
    }
    if (l === "E") {
      if (tok === "-" || tok === "+") s.tokens.push(tok);
      return;
    }
    s.tokens.push(tok);
  };
  const evaluateNow = (): number | null => {
    const toks = [...s.tokens];
    if (!toks.length) return resultValue();
    let depth = 0;
    for (const t of toks) {
      if (opens(t)) depth++;
      else if (t === ")") depth = Math.max(0, depth - 1);
    }
    while (depth-- > 0) toks.push(")");
    return evaluate(toks.join(""), mode);
  };

  const fnKeys: Record<string, string> = {
    sin: "sin(", cos: "cos(", tan: "tan(",
    "sin⁻¹": "asin(", "cos⁻¹": "acos(", "tan⁻¹": "atan(",
    sinh: "sinh(", cosh: "cosh(", tanh: "tanh(",
    "sinh⁻¹": "asinh(", "cosh⁻¹": "acosh(", "tanh⁻¹": "atanh(",
    ln: "ln(", log: "log(", "log₂x": "log2(",
    "eˣ": "exp(", "10ˣ": "10^(", "√": "sqrt(", "³√x": "cbrt(", "|x|": "abs(", "1/x": "1/(",
  };

  if (/^[0-9]$/.test(key)) {
    freshAfterResult();
    const l = last();
    if (l === ")" || l === "π" || l === "e" || POSTFIX.has(l ?? "")) s.tokens.push("*");
    s.tokens.push(key);
    return s;
  }
  switch (key) {
    case ".": {
      freshAfterResult();
      const i = trailingOperandStart(s.tokens);
      const operand = i >= 0 ? s.tokens.slice(i) : [];
      if (i >= 0 && operand.every(isDigitTok)) {
        if (!operand.includes(".") && !operand.includes("E")) s.tokens.push(".");
      } else appendOperand(["0", "."]);
      return s;
    }
    case "Exp": {
      continueFromResult();
      const i = trailingOperandStart(s.tokens);
      const operand = i >= 0 ? s.tokens.slice(i) : [];
      if (i >= 0 && operand.every(isDigitTok) && !operand.includes("E")) s.tokens.push("E");
      return s;
    }
    case "π":
    case "e":
      freshAfterResult();
      appendOperand([key]);
      return s;
    case "(":
      freshAfterResult();
      appendOperand(["("]);
      return s;
    case ")": {
      let depth = 0;
      for (const t of s.tokens) {
        if (opens(t)) depth++;
        else if (t === ")") depth--;
      }
      if (depth > 0 && isOperandEnd(last())) s.tokens.push(")");
      return s;
    }
    case "+": case "-": case "−": case "*": case "/":
      binary(key === "−" ? "-" : key);
      return s;
    case "xʸ": case "^":
      binary("^");
      return s;
    case "mod":
      binary(" mod ");
      return s;
    case "ʸ√x":
      binary(" yroot ");
      return s;
    case "logᵧx":
      binary(" logbase ");
      return s;
    case "x²": postfix("²"); return s;
    case "x³": postfix("³"); return s;
    case "n!": case "!": postfix("!"); return s;
    case "%": postfix("%"); return s;
    case "±":
    case "+/-": {
      continueFromResult();
      const i = trailingOperandStart(s.tokens);
      if (i < 0) {
        binary("-");
        return s;
      }
      const operand = s.tokens.slice(i);
      if (operand[0] === "(-" && operand[operand.length - 1] === ")" && trailingOperandStart(operand) === 0) {
        s.tokens = [...s.tokens.slice(0, i), ...operand.slice(1, -1)];
      } else s.tokens = [...s.tokens.slice(0, i), "(-", ...operand, ")"];
      return s;
    }
    case "←":
    case "Backspace":
      if (s.justEvaluated) return s;
      s.tokens.pop();
      return s;
    case "C":
      return { ...initialCalc(), memory: s.memory };
    case "CE": {
      if (s.justEvaluated) return { ...s, tokens: [], result: null, lastExpr: null, justEvaluated: false };
      const i = trailingOperandStart(s.tokens);
      if (i >= 0) s.tokens = s.tokens.slice(0, i);
      return s;
    }
    case "=": {
      if (!s.tokens.length) return s;
      const expr = closeParens(s.tokens).join("");
      const v = evaluate(expr, mode);
      return { ...s, tokens: closeParens(s.tokens), lastExpr: expr, result: v === null ? "Error" : formatResult(v), justEvaluated: true };
    }
    case "MC":
      return { ...s, memory: null };
    case "MR":
      if (s.memory === null) return s;
      freshAfterResult();
      appendOperand(numberTokens(s.memory));
      return s;
    case "MS":
    case "M+":
    case "M-": {
      const v = s.justEvaluated ? resultValue() : evaluateNow();
      if (v === null) return s;
      const m = s.memory ?? 0;
      return { ...s, memory: key === "MS" ? v : key === "M+" ? m + v : m - v };
    }
  }
  if (key in fnKeys) {
    wrapOrOpen(fnKeys[key]);
    return s;
  }
  return s;
}

function closeParens(tokens: Tokens): Tokens {
  const out = [...tokens];
  let depth = 0;
  for (const t of out) {
    if (opens(t)) depth++;
    else if (t === ")") depth = Math.max(0, depth - 1);
  }
  while (depth-- > 0) out.push(")");
  return out;
}

/** The expression line as shown above the result */
export const expressionText = (s: CalcState) => (s.justEvaluated ? s.lastExpr ?? "" : s.tokens.join(""));

/** The main display: the result after "=", else the number being typed, else 0 */
export function mainText(s: CalcState): string {
  if (s.justEvaluated && s.result !== null) return s.result;
  const i = trailingOperandStart(s.tokens);
  const operand = i >= 0 ? s.tokens.slice(i) : [];
  if (operand.length && operand.every(isDigitTok)) return operand.join("");
  return s.result ?? "0";
}

/** Ten significant digits, as the TCS calculator shows */
export function formatResult(x: number): string {
  if (!Number.isFinite(x)) return "Error";
  if (x === 0) return "0";
  const a = Math.abs(x);
  if (a >= 1e15 || a < 1e-9) return x.toExponential(9).replace(/\.?0+e/, "e");
  return String(Number(x.toPrecision(10)));
}

// ---- parser ---------------------------------------------------------------------------------

type Tok = { k: "num"; v: number } | { k: "id"; v: string } | { k: "op"; v: string };

function lex(src: string): Tok[] | null {
  const out: Tok[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === " ") { i++; continue; }
    const num = /^(\d+\.?\d*|\.\d+)(E[+-]?\d+)?/.exec(src.slice(i));
    if (num) {
      const v = Number(num[0].replace("E", "e"));
      if (!Number.isFinite(v)) return null;
      out.push({ k: "num", v });
      i += num[0].length;
      continue;
    }
    const id = /^(log2|[a-z]+)/.exec(src.slice(i));
    if (id) {
      out.push({ k: "id", v: id[0] });
      i += id[0].length;
      continue;
    }
    if ("+-*/^()!%²³π".includes(c)) {
      out.push(c === "π" ? { k: "id", v: "pi" } : { k: "op", v: c });
      i++;
      continue;
    }
    return null;
  }
  return out;
}

class ParseError extends Error {}

function factorial(n: number): number {
  if (!Number.isInteger(n) || n < 0 || n > 170) throw new ParseError("factorial");
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

/** Evaluates an expression string; null when it is not valid or the answer is not a finite number. */
export function evaluate(src: string, mode: AngleMode): number | null {
  const lexed = lex(src);
  if (!lexed || !lexed.length) return null;
  const toks: Tok[] = lexed;
  let p = 0;
  const peek = () => toks[p];
  const isOp = (v: string) => peek()?.k === "op" && peek()!.v === v;
  const isId = (v: string) => peek()?.k === "id" && peek()!.v === v;
  const toRad = (x: number) => (mode === "deg" ? (x * Math.PI) / 180 : x);
  const fromRad = (x: number) => (mode === "deg" ? (x * 180) / Math.PI : x);
  // sin(180°) and cos(90°) are exactly 0 on the calculator, not 1.2e-16
  const snap = (x: number) => (Math.abs(x) < 1e-12 ? 0 : x);
  const fns: Record<FnName, (x: number) => number> = {
    sin: (x) => snap(Math.sin(toRad(x))),
    cos: (x) => snap(Math.cos(toRad(x))),
    tan: (x) => {
      const c = snap(Math.cos(toRad(x)));
      if (c === 0) throw new ParseError("tan");
      return snap(Math.sin(toRad(x))) / c;
    },
    asin: (x) => fromRad(Math.asin(x)),
    acos: (x) => fromRad(Math.acos(x)),
    atan: (x) => fromRad(Math.atan(x)),
    sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh,
    asinh: Math.asinh, acosh: Math.acosh, atanh: Math.atanh,
    ln: Math.log, log: Math.log10, log2: Math.log2,
    sqrt: Math.sqrt, cbrt: Math.cbrt, abs: Math.abs, exp: Math.exp,
  };

  function expr(): number {
    let v = term();
    while (isOp("+") || isOp("-")) {
      const op = toks[p++].v;
      const r = term();
      v = op === "+" ? v + r : v - r;
    }
    return v;
  }
  function term(): number {
    let v = unary();
    while (isOp("*") || isOp("/") || isId("mod")) {
      const op = toks[p++].v;
      const r = unary();
      if ((op === "/" || op === "mod") && r === 0) throw new ParseError("divide by zero");
      v = op === "*" ? v * r : op === "/" ? v / r : v - r * Math.floor(v / r);
    }
    return v;
  }
  function unary(): number {
    if (isOp("-")) { p++; return -unary(); }
    if (isOp("+")) { p++; return unary(); }
    return power();
  }
  function power(): number {
    const base = postfix();
    if (isOp("^")) { p++; return Math.pow(base, unary()); }
    if (isId("yroot")) {
      p++;
      const n = unary();
      if (n === 0) throw new ParseError("root");
      // odd roots of negative numbers are real
      if (base < 0 && Number.isInteger(n) && Math.abs(n) % 2 === 1) return -Math.pow(-base, 1 / n);
      return Math.pow(base, 1 / n);
    }
    if (isId("logbase")) {
      p++;
      const b = unary();
      return Math.log(base) / Math.log(b);
    }
    return base;
  }
  function postfix(): number {
    let v = primary();
    for (;;) {
      if (isOp("!")) { p++; v = factorial(v); }
      else if (isOp("%")) { p++; v = v / 100; }
      else if (isOp("²")) { p++; v = v * v; }
      else if (isOp("³")) { p++; v = v * v * v; }
      else return v;
    }
  }
  function primary(): number {
    const t = toks[p];
    if (!t) throw new ParseError("end");
    if (t.k === "num") { p++; return t.v; }
    if (t.k === "op" && t.v === "(") {
      p++;
      const v = expr();
      if (!isOp(")")) throw new ParseError(")");
      p++;
      return v;
    }
    if (t.k === "id") {
      p++;
      if (t.v === "pi") return Math.PI;
      if (t.v === "e") return Math.E;
      if ((FN_NAMES as readonly string[]).includes(t.v)) {
        if (!isOp("(")) throw new ParseError("(");
        p++;
        const a = expr();
        if (!isOp(")")) throw new ParseError(")");
        p++;
        return fns[t.v as FnName](a);
      }
    }
    throw new ParseError("token");
  }

  try {
    const v = expr();
    if (p !== toks.length) return null;
    return Number.isFinite(v) ? v : null;
  } catch {
    return null;
  }
}
