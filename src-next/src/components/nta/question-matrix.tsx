"use client";
// M6 addition to the frozen NTA exam screen (board Exam-Additions, item 8): matrix match as an NTA-style grid.
// The question header, stem and anchors are the frozen QuestionObjective's; below the stem List-I and List-II, then
// the answer grid: List-I rows × List-II columns of the same native checkbox as multiple-choice options. A row may
// tick several columns; the answer is { A: ["P"], B: ["Q", "R"] } (store toggleMatrixCell).

import { memo, useEffect, useRef } from "react";
import type { IMatrixGrid, IQuestionContent, MatrixAnswer } from "@/types";
import { RenderLatex } from "./render-latex";
import "./exam-tools.css";

interface QuestionMatrixProps {
  question: { en: IQuestionContent; hi?: IQuestionContent };
  matrix: IMatrixGrid;
  id: string;
  index: number;
  answer: MatrixAnswer;
  language: "en" | "hi";
  timeTakenInSeconds: number;
  onToggle: (rowId: string, columnId: string) => void;
  onTimeUpdate: (time: number) => void;
}

const TIME_INTERVAL = 1000;

function QuestionMatrixComponent({ question, matrix, id, index, answer, language, timeTakenInSeconds, onToggle, onTimeUpdate }: QuestionMatrixProps) {
  const timeRef = useRef(timeTakenInSeconds);

  // Time on question, as in the frozen question components
  useEffect(() => {
    timeRef.current = timeTakenInSeconds;
    const interval = setInterval(() => {
      timeRef.current = Math.round((timeRef.current + TIME_INTERVAL / 1000) * 100) / 100;
      onTimeUpdate(timeRef.current);
    }, TIME_INTERVAL);
    return () => clearInterval(interval);
  }, [id, onTimeUpdate, timeTakenInSeconds]);

  const content = language === "hi" && question.hi?.question && question.hi.question !== "<p><br></p>" ? question.hi : question.en;
  const text = (x: { en: string; hi: string | null }) => (language === "hi" && x.hi ? x.hi : x.en) || "";
  const rows = matrix.rows ?? [];
  const columns = matrix.columns ?? [];
  // Migrated questions carry labels only (the lists are in the stem): then no list table
  const hasListText = rows.some((r) => text(r).trim()) || columns.some((c) => text(c).trim());
  const listRows = Math.max(rows.length, columns.length);

  return (
    <div id="container" className="scroll-smooth select-none">
      <div className="flex items-center justify-between my-3 sticky top-0 bg-white">
        <h3 className="text-lg font-semibold">Question {index + 1}</h3>
        <a id="top" href="#bottom" title="Go to bottom" className="ml-auto bg-blue-500 rounded-full p-1">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </a>
      </div>

      <div className="w-full bg-gray-200 h-px my-3" />

      <div className="text-gray-700 leading-6">
        <RenderLatex content={content.question} />
      </div>

      {hasListText && (
        <>
          {/* Desktop: the two lists side by side; phone: one under the other */}
          <table className="nta-ml max-md:hidden">
            <thead>
              <tr>
                <th colSpan={2}>List-I</th>
                <th colSpan={2}>List-II</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: listRows }, (_, i) => (
                <tr key={i}>
                  <td className="k1">{rows[i] ? `(${rows[i].id})` : ""}</td>
                  <td>{rows[i] ? <RenderLatex content={text(rows[i])} /> : null}</td>
                  <td className="k1">{columns[i] ? `(${columns[i].id})` : ""}</td>
                  <td>{columns[i] ? <RenderLatex content={text(columns[i])} /> : null}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="md:hidden">
            {[{ title: "List-I", items: rows }, { title: "List-II", items: columns }].map((list, li) => (
              <table key={list.title} className="nta-ml" style={li ? { marginTop: 8 } : undefined}>
                <thead>
                  <tr>
                    <th colSpan={2}>{list.title}</th>
                  </tr>
                </thead>
                <tbody>
                  {list.items.map((x) => (
                    <tr key={x.id}>
                      <td className="k1">({x.id})</td>
                      <td>
                        <RenderLatex content={text(x)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ))}
          </div>
        </>
      )}

      <div className="nta-mga">
        <p id={`mg-label-${id}`}>Answer</p>
        <table className="nta-mg" aria-labelledby={`mg-label-${id}`} data-testid="matrix-grid">
          <thead>
            <tr>
              <th>
                <span className="nta-vh">List-I</span>
              </th>
              {columns.map((c) => (
                <th key={c.id} scope="col">
                  {c.id}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <th scope="row">{r.id}</th>
                {columns.map((c) => (
                  <td key={c.id}>
                    <input
                      type="checkbox"
                      aria-label={`${r.id} matches ${c.id}`}
                      checked={(answer[r.id] ?? []).includes(c.id)}
                      onChange={() => onToggle(r.id, c.id)}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex justify-end">
        <a id="bottom" href="#top" title="Go to top" className="ml-auto bg-blue-500 rounded-full p-1">
          <svg className="w-4 h-4 text-white transform rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </a>
      </div>
    </div>
  );
}

export const QuestionMatrix = memo(QuestionMatrixComponent);
