import { Geist, Geist_Mono, Kalam, Noto_Sans_Devanagari, Source_Serif_4 } from "next/font/google";
import { fontClassName } from "@iitpulse/ui/fonts";

// Fonts of the student app (@iitpulse/ui/fonts fixes the variable names; tokens.css reads them).
// next/font needs literal options here. The frozen NTA exam layout keeps its own Inter and never loads these.

export const sans = Geist({ subsets: ["latin"], variable: "--font-iitp-sans", display: "swap" });
export const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-iitp-mono", display: "swap" });
// Hindi: not preloaded; the unicode-range faces download only when Devanagari text appears on screen.
export const devanagari = Noto_Sans_Devanagari({
  subsets: ["devanagari"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-iitp-devanagari",
  preload: false,
  display: "swap",
});
// Handwriting for the classroom notes: student app only, latin subset preloaded.
export const hand = Kalam({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-iitp-hand", display: "swap" });
// Question stems on review screens: not preloaded.
export const serif = Source_Serif_4({ subsets: ["latin"], variable: "--font-iitp-serif", preload: false, display: "swap" });

export const studentFonts = fontClassName(sans, mono, devanagari, hand, serif);
