import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

// The design system's type scale (text-d1, text-h1, ..., text-body from @iitpulse/ui tokens.css) is a font size,
// not a colour: tell tailwind-merge, or cn("text-ink", "text-h1") would drop one of them.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ["d1", "h1", "h2", "h3", "body"],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
