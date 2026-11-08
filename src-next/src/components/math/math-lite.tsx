"use client";
import { createElement, lazy, memo, Suspense } from "react";
import { cx, mayContainMath, type MathTextProps } from "@iitpulse/ui";

// KaTeX (about 100 KB of JavaScript with mhchem and DOMPurify) loads only when this text has maths in it.
const MathText = lazy(() => import("./math-text-katex"));

/**
 * <MathText> for the first screens (Home, the result summary): plain text renders at once, with the same markup as
 * MathText's; text with maths loads KaTeX first. Keeps KaTeX off those screens' critical path (mobile LCP budget).
 * Question content (html mode) and the review screens use MathText from @iitpulse/ui directly.
 */
function MathLiteImpl(props: Omit<MathTextProps, "html">) {
  const text = props.text ?? (typeof props.children === "string" ? props.children : "");
  const plain = createElement(props.as ?? "span", { className: cx("math-text", props.className), id: props.id }, text);
  if (!mayContainMath(text)) return plain;
  return (
    <Suspense fallback={createElement(props.as ?? "span", { className: cx("math-text", props.className), id: props.id, "aria-busy": true })}>
      <MathText {...props} />
    </Suspense>
  );
}

export const MathLite = memo(MathLiteImpl);
MathLite.displayName = "MathLite";
