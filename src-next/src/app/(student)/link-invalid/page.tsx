"use client";

import { Suspense } from "react";
import { ShortLink } from "@/components/public/short-link";
import "@/app/b9.css";

/** Student-ShortLink "invalid": the gateway sends an unknown or mistyped SMS code here (never says what it was for). */
export default function LinkInvalidPage() {
  return (
    <Suspense fallback={null}>
      <ShortLink invalid />
    </Suspense>
  );
}
