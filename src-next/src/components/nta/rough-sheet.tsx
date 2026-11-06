"use client";
// M6 addition to the frozen NTA exam screen (board Exam-Additions, item 7): the rough sheet. Pen, eraser, clear and
// several sheets. Kept on this device only, for this attempt (lib/rough-sheet: localStorage); never sent, never
// marked; cleared on submit. Phone: full screen, close to go back.

import { useCallback, useEffect, useRef, useState } from "react";
import { loadRoughSheets, MAX_SHEETS, saveRoughSheets } from "@/lib/rough-sheet";
import { ToolWindow } from "./tool-window";

interface RoughSheetProps {
  testId: string | null;
  onClose: () => void;
}

const PEN = "#1e3a8a";

export function RoughSheet({ testId, onClose }: RoughSheetProps) {
  const [sheets, setSheets] = useState<string[]>(() => loadRoughSheets(testId));
  const [index, setIndex] = useState(0);
  const [tool, setTool] = useState<"pen" | "eraser">("pen");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const drawing = useRef<{ id: number; x: number; y: number } | null>(null);
  const sheetsRef = useRef(sheets);
  useEffect(() => {
    sheetsRef.current = sheets;
  }, [sheets]);

  // Size the canvas to its box (device pixels) and paint the current sheet
  const paint = useCallback(() => {
    const canvas = canvasRef.current, box = boxRef.current;
    if (!canvas || !box) return;
    const dpr = window.devicePixelRatio || 1;
    const w = Math.max(1, Math.round(box.clientWidth * dpr)), h = Math.max(1, Math.round(box.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const src = sheetsRef.current[index];
    if (src) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0);
      img.src = src;
    }
  }, [index]);

  useEffect(() => {
    paint();
    const box = boxRef.current;
    if (!box || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => paint());
    ro.observe(box);
    return () => ro.disconnect();
  }, [paint]);

  const commit = (next: string[]) => {
    setSheets(next);
    saveRoughSheets(testId, next);
  };

  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    return { x: (e.clientX - r.left) * dpr, y: (e.clientY - r.top) * dpr };
  };
  const stroke = (from: { x: number; y: number }, to: { x: number; y: number }) => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    ctx.globalCompositeOperation = tool === "eraser" ? "destination-out" : "source-over";
    ctx.strokeStyle = PEN;
    ctx.lineWidth = (tool === "eraser" ? 18 : 2) * dpr;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x + 0.01, to.y);
    ctx.stroke();
  };
  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = point(e);
    drawing.current = { id: e.pointerId, ...p };
    stroke(p, p);
  };
  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const d = drawing.current;
    if (!d || d.id !== e.pointerId) return;
    const p = point(e);
    stroke(d, p);
    drawing.current = { id: d.id, ...p };
  };
  const onUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (drawing.current?.id !== e.pointerId) return;
    drawing.current = null;
    const url = canvasRef.current?.toDataURL("image/png") ?? "";
    const next = [...sheetsRef.current];
    next[index] = url;
    commit(next);
  };

  const clearSheet = () => {
    const next = [...sheets];
    next[index] = "";
    commit(next);
    const c = canvasRef.current;
    c?.getContext("2d")?.clearRect(0, 0, c.width, c.height);
  };
  const newSheet = () => {
    if (sheets.length >= MAX_SHEETS) return;
    const next = [...sheets, ""];
    commit(next);
    setIndex(next.length - 1);
  };

  return (
    <ToolWindow title="Rough Sheet" label="Rough sheet" initial={{ left: 806, top: 170, width: 540 }} height={430} phone="full" onClose={onClose} testId="nta-rough-sheet">
      <div className="nta-rs-tools">
        <button type="button" className={`nta-rt${tool === "pen" ? " on" : ""}`} aria-pressed={tool === "pen"} onClick={() => setTool("pen")} data-autofocus>
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.2 5.2l3.6 3.6M4 20l4.2-1 10.6-10.6a2.5 2.5 0 00-3.6-3.6L4.6 15.4z" /></svg>
          Pen
        </button>
        <button type="button" className={`nta-rt${tool === "eraser" ? " on" : ""}`} aria-pressed={tool === "eraser"} onClick={() => setTool("eraser")}>
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 20h12M5.5 14.5l7-7 5 5-5.5 5.5H9.5z" /></svg>
          Eraser
        </button>
        <button type="button" className="nta-rt" onClick={clearSheet}>Clear sheet</button>
        <span className="nta-rs-pg">
          <button type="button" className="nta-rt" aria-label="Previous sheet" disabled={index === 0} onClick={() => setIndex((i) => Math.max(0, i - 1))}>‹</button>
          <span aria-live="polite">Sheet {index + 1} of {sheets.length}</span>
          <button type="button" className="nta-rt" aria-label="Next sheet" disabled={index >= sheets.length - 1} onClick={() => setIndex((i) => Math.min(sheets.length - 1, i + 1))}>›</button>
          <button type="button" className="nta-rt" onClick={newSheet} disabled={sheets.length >= MAX_SHEETS}>+ New sheet</button>
        </span>
      </div>
      <div className="nta-rs-c" ref={boxRef}>
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={`Rough work, sheet ${index + 1}. Draw with a mouse, pen or finger.`}
          data-testid="rough-canvas"
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
        />
      </div>
      <p className="nta-rs-f">For your rough work only. Not saved with your answers; cleared when you submit.</p>
    </ToolWindow>
  );
}
