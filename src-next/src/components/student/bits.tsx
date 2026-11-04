import type { ScoreDelta } from "@/types/m2-student";
import { ArrowDownIcon, ArrowUpIcon } from "./icons";
import { num, shortPair } from "./labels";

/** "+24 vs Mock 10" (green, up) or "−12 vs Mock 10" (red, down); `compact` drops the test name. */
export function Delta({ delta, against, compact, className }: { delta: ScoreDelta; against: string; compact?: boolean; className?: string }) {
  const up = delta.marks >= 0;
  const [, vs] = shortPair(against, delta.vsTestName);
  const text = `${up ? "+" : "−"}${num(Math.abs(delta.marks))}`;
  return (
    <span className={`delta${up ? "" : " down"}${className ? ` ${className}` : ""}`}>
      {up ? <ArrowUpIcon /> : <ArrowDownIcon />}
      {compact ? text : `${text} vs ${vs}`}
    </span>
  );
}
