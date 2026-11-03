import { Geist, Geist_Mono, Kalam, Noto_Sans_Devanagari, Source_Serif_4 } from "next/font/google";
import { fontClassName } from "@iitpulse/ui/fonts";

// Fonts of the student app (@iitpulse/ui/fonts fixes the variable names; tokens.css reads them).
// next/font needs literal options here. The frozen NTA exam layout keeps its own Inter and never loads these.

// Geist is the only preloaded face. Mono and Kalam are not preloaded (unlike the @iitpulse/ui default): nothing
// above the fold on a phone uses them, and every preload counts against the 2.5 s mobile LCP budget on /login.
export const sans = Geist({ subsets: ["latin"], variable: "--font-iitp-sans", display: "swap" });
export const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-iitp-mono", preload: false, display: "swap" });
// Hindi: not preloaded; the unicode-range faces download only when Devanagari text appears on screen.
export const devanagari = Noto_Sans_Devanagari({
  subsets: ["devanagari"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-iitp-devanagari",
  preload: false,
  display: "swap",
});
// Handwriting for the classroom notes: student app only, latin subset, loaded when a note is on screen.
export const hand = Kalam({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-iitp-hand", preload: false, display: "swap" });
// Question stems on review screens: not preloaded.
export const serif = Source_Serif_4({ subsets: ["latin"], variable: "--font-iitp-serif", preload: false, display: "swap" });

export const studentFonts = fontClassName(sans, mono, devanagari, hand, serif);
