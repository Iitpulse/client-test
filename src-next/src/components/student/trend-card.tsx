"use client";

import { useState } from "react";
import type { LastResult, TrendPoint } from "@/types/m2-student";
import { axisLabel, num } from "./labels";

type TrendTab = "score" | "accuracy" | "rank";

export function TrendCard({ trend, last }: { trend: TrendPoint[]; last: LastResult | null }) {
  const [tab, setTab] = useState<TrendTab>("score");
  const kind = last?.test.kind;
  const subtitle = trend.length ? `Last ${trend.length} ${kind === "full" ? (trend.length === 1 ? "full mock" : "full mocks") : kind === "sectional" ? (trend.length === 1 ? "sectional" : "sectionals") : trend.length === 1 ? "test" : "tests"}` : "";
  const value = (p: TrendPoint): number | null => (tab === "score" ? p.score : tab === "accuracy" ? p.accuracyPercent : p.rank?.position ?? null);
  const fmt = (v: number) => (tab === "score" ? num(v) : tab === "accuracy" ? `${v}%` : `#${v}`);
  const pts = trend.map((p, i) => ({ p, i, v: value(p) })).filter((x): x is { p: TrendPoint; i: number; v: number } => x.v !== null);

  const X0 = 20, X1 = 500, TOP = 58, BOTTOM = 115; // the board's band: first point at 115, best at 58
  const xs = (i: number) => (trend.length < 2 ? (X0 + X1) / 2 : X0 + ((X1 - X0) * i) / (trend.length - 1));
  const vals = pts.map((x) => x.v);
  const lo = Math.min(...vals), hi = Math.max(...vals);
  const better = tab === "rank" ? -1 : 1; // rank: lower is better, so it is drawn higher
  const ys = (v: number) => (hi === lo ? (TOP + BOTTOM) / 2 : BOTTOM - ((better * (v - (better > 0 ? lo : hi))) / (hi - lo)) * (BOTTOM - TOP));
  const line = pts.map((x) => `${xs(x.i).toFixed(1)},${ys(x.v).toFixed(1)}`).join(" ");
  const first = pts[0], lastPt = pts[pts.length - 1];
  const summary =
    first && lastPt && pts.length > 1
      ? `${tab === "score" ? "Scores" : tab === "accuracy" ? "Accuracy" : "Rank"} went from ${fmt(first.v)} to ${fmt(lastPt.v)} over ${pts.length} tests`
      : "";

  return (
    <article className="card pad-lg col rise col-span-2 gap-3.5 max-md:hidden" style={{ "--i": 3 } as React.CSSProperties}>
      <div className="row between gap-3">
        <div className="col gap-0.5">
          <span className="h3">Score trend</span>
          <span className="sm muted">{subtitle}</span>
        </div>
        {trend.length > 0 && (
          <div className="seg" role="tablist" aria-label="Trend measure">
            {(["score", "accuracy", "rank"] as const).map((k) => (
              <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? "tab on" : "tab"} onClick={() => setTab(k)}>
                {k === "score" ? "Score" : k === "accuracy" ? "Accuracy" : "Rank"}
              </button>
            ))}
          </div>
        )}
      </div>
      {trend.length < 2 ? (
        <div className="col flex-1 items-center justify-center gap-1 py-10 text-center">
          <span className="sm font-semibold">{trend.length ? "One test so far" : "No results yet"}</span>
          <span className="sm muted">Your trend appears after two tests of the same kind.</span>
        </div>
      ) : (
        <svg key={tab} viewBox="0 0 520 170" style={{ width: "100%", height: 220 }} role="img" aria-label={summary}>
          <g stroke="#EEF0F5" strokeWidth="1">
            <line x1="20" y1="20" x2="500" y2="20" />
            <line x1="20" y1="65" x2="500" y2="65" />
            <line x1="20" y1="110" x2="500" y2="110" />
            <line x1="20" y1="150" x2="500" y2="150" />
          </g>
          {pts.length > 1 && (
            <>
              <path d={`M${line.split(" ").join(" L")} L${xs(lastPt!.i).toFixed(1)} 150 L${xs(first!.i).toFixed(1)} 150 Z`} fill="#F1F2FC" className="fade" />
              <polyline className="draw" points={line} fill="none" stroke="var(--navy)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </>
          )}
          <g fill="#fff" stroke="var(--navy)" strokeWidth="2.5">
            {pts.map((x, k) => (
              <circle key={x.i} cx={xs(x.i)} cy={ys(x.v)} r={k === pts.length - 1 ? 6 : 4} fill={k === pts.length - 1 ? "var(--navy)" : "#fff"}>
                <title>{`${x.p.testName}: ${fmt(x.v)}`}</title>
              </circle>
            ))}
          </g>
          <g fontFamily="var(--font-sans)" fontSize="11" fill="#575C75" textAnchor="middle">
            {trend.map((p, i) => (
              <text key={p.testId} x={xs(i)} y="166">
                {p.testId === last?.test.id ? last.test.shortName : axisLabel(p.testName, kind, last?.test.subjects[0])}
              </text>
            ))}
          </g>
          {first && lastPt && (
            <g fontFamily="var(--font-sans)" fontSize="12" fontWeight="600" fill="#0D0F2B" textAnchor="middle">
              <text x={xs(first.i)} y={ys(first.v) - 11}>
                {fmt(first.v)}
              </text>
              {lastPt !== first && (
                <text x={xs(lastPt.i)} y={ys(lastPt.v) - 14}>
                  {fmt(lastPt.v)}
                </text>
              )}
            </g>
          )}
        </svg>
      )}
    </article>
  );
}

