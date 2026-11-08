"use client";

import { Suspense } from "react";
import { ShortLink } from "@/components/public/short-link";
import "@/app/b9.css";

/** Student-ShortLink (batch 9): an expired SMS link, /link-expired?what=class|test|result. */
export default function LinkExpiredPage() {
  return (
    <Suspense fallback={null}>
      <ShortLink />
    </Suspense>
  );
}

