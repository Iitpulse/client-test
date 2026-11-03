import { clsx, type ClassValue } from "clsx"

/**
 * Join class names. Deliberately clsx only, without tailwind-merge: its 9 KB (gzip) chunk is loaded by every
 * page, and on /login it pushed Lighthouse mobile LCP over the 2.5 s M1 budget. So the primitives in
 * components/ui never set the same property twice (base, variant and size are disjoint), and a className passed
 * in must only ADD utilities (w-full, group, pr-12 after px-*), never restate one the primitive sets; use a
 * variant or size instead. (The frozen NTA copy in components/nta/utils.ts keeps tailwind-merge.)
 */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}
