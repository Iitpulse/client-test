"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";

/** Password input with the board's show/hide eye (32px button inside the 44px field). */
export function PasswordField(props: Omit<React.ComponentProps<typeof Input>, "type">) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input {...props} type={show ? "text" : "password"} className="pr-12" />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Hide password" : "Show password"}
        aria-pressed={show}
        className="absolute top-1.5 right-1.5 inline-flex size-8 cursor-pointer items-center justify-center rounded-chip border-0 bg-transparent text-muted hover:bg-line-2 hover:text-ink focus-visible:outline-3 focus-visible:outline-brand-200"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true" focusable="false">
          <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
          <circle cx="12" cy="12" r="3" />
          {show && <path d="M3 3l18 18" />}
        </svg>
      </button>
    </div>
  );
}
