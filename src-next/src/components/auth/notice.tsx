import type { ReactNode } from "react";
import { CheckIcon } from "@/components/shell/icons";

/** Inline status on the sign-in card: success (green, as on the board) or error (Red 600 on Red 50). */
export function Notice({ tone, children }: { tone: "success" | "error"; children: ReactNode }) {
  if (tone === "success") {
    return (
      <div className="row pop gap-2.5 rounded-tile border border-[#BFE3CC] bg-success-50 px-3.5 py-2.5 text-success" role="status">
        <CheckIcon />
        <span className="sm font-semibold">{children}</span>
      </div>
    );
  }
  return (
    <div className="row pop items-start gap-2.5 rounded-tile border border-[#F2B1B1] bg-danger-50 px-3.5 py-2.5 text-danger" role="alert">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" focusable="false" className="mt-px flex-none">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7.5v5M12 16.2v.3" />
      </svg>
      <span className="sm font-semibold">{children}</span>
    </div>
  );
}
