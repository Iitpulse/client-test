import * as React from "react"

import { cn } from "@/lib/utils"

// shadcn new-york Input on @iitpulse/ui tokens: 44px tall (student touch target), 15px text, hairline border.
// Focus: navy border plus the 3px brand-200 outline. No shadows.
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-11 w-full min-w-0 rounded-control border border-line bg-surface px-3.5 text-[15px] text-ink transition-[border-color,outline-color] duration-200",
        "placeholder:text-[#6B7089] selection:bg-brand-100 hover:border-[#CDD0DE]",
        "focus-visible:border-brand focus-visible:outline-3 focus-visible:outline-offset-0 focus-visible:outline-brand-200",
        "disabled:cursor-not-allowed disabled:bg-line-2 disabled:text-muted",
        "aria-invalid:border-danger aria-invalid:focus-visible:outline-danger-50",
        "file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium",
        className
      )}
      {...props}
    />
  )
}

export { Input }
