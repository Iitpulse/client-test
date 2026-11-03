// Frozen NTA copy of lib/utils.ts (cn). The exam screens must stay pixel-identical: do not restyle.
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
