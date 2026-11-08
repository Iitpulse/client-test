import type { CSSProperties } from "react";
import { Blueboard, LogoMark, Tape } from "@iitpulse/ui";
import { LegalFooter } from "@/components/auth/legal-footer";
import { BrandLogo, DefaultBrandOnly, PoweredBy, WhiteLabelIntro } from "@/components/brand/brand-logo";
import "@/app/b9-auth.css"; // Student-PhoneSignIn: the sign-in tabs, the code box, the account picker

/**
 * Student-Login board (sign in, forgot password, reset password). The blueboard welcome panel and the taped card
 * belong to this layout, so moving between the three screens keeps them in place and only the card's content
 * fades, as on the board. Below 1024px (Phone-Login): the blueboard as a band on top (logo, the tagline in chalk,
 * the headline) with the taped card overlapping it; no margin rule, no tab bar.
 *
 * Classroom budget (student desktop): 1 note, 2 doodles (on the blueboard), 1 taped card, 1 title underline,
 * 1 margin rule; no red pen, no sticker. Phone: none of these render except the title underline.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-wrap max-lg:flex-col max-lg:flex-nowrap">
      {/* Phone-Login: the blueboard band */}
      <Blueboard as="section" className="auth-board col flex-none gap-[18px] px-5 pt-[calc(22px+env(safe-area-inset-top))] pb-14 text-white lg:hidden" smudge={{ left: -90, top: 120, width: 360, height: 140 }}>
        <div className="cl-doodle" aria-hidden="true" style={{ right: 18, top: 84 }}>
          <svg width="88" height="67" viewBox="0 0 110 84" focusable="false">
            <path d="M8 72H106M18 80V4" />
            <path d="M30 72Q62 -8 94 72" />
            <text x="98" y="68">x</text>
            <text x="22" y="10">y</text>
          </svg>
        </div>
        <span className="inline-flex self-start rounded-[10px] bg-white px-3 py-2">
          <BrandLogo
            size="sm"
            fallback={
              <span role="img" aria-label="IIT-PULSE" className="relative block h-[27px] w-[139px] overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element -- the logo is a fixed, unchanged PNG cropped by CSS */}
                <img src="/iitpulse-logo.png" alt="" className="absolute top-[-7px] left-0 h-[44px] w-auto max-w-none" decoding="async" />
              </span>
            }
          />
        </span>
        <DefaultBrandOnly>
        <div className="col items-start gap-0">
          <span className="cl-note chalk cl-write" style={{ "--rot": "-3deg", "--d": 300, fontSize: 30, lineHeight: 1.1 } as CSSProperties}>
            A vision of success…
          </span>
          <svg
            className="cl-ink chalk inline"
            width="250"
            height="10"
            viewBox="0 0 400 14"
            aria-hidden="true"
            focusable="false"
            style={{ "--d": 1100, margin: "4px 0 0 4px", transform: "rotate(-3deg)" } as CSSProperties}
          >
            <path pathLength={1} d="M3 9.5C80 5 180 4.5 280 6.5S372 10 397 7.5" />
          </svg>
        </div>
        </DefaultBrandOnly>
        <p className="h2 rise m-0 max-w-[300px] text-[24px] text-white">Every test makes the next one easier.</p>
        <PoweredBy className="sm text-on-brand-2" />
      </Blueboard>

      <Blueboard
        as="section"
        className="auth-board auth-desktop-only flex min-h-dvh flex-[1_1_520px] flex-col justify-between px-14 py-12 text-white"
        smudge={{ left: -90, top: 300, width: 560, height: 200 }}
      >
        <div className="cl-doodle" aria-hidden="true" style={{ right: 64, top: 236 }}>
          <svg width="165" height="126" viewBox="0 0 110 84" focusable="false">
            <path d="M8 72H106M18 80V4" />
            <path d="M30 72Q62 -8 94 72" />
            <text x="98" y="68">x</text>
            <text x="22" y="10">y</text>
          </svg>
        </div>
        <div className="cl-doodle" aria-hidden="true" style={{ right: 72, bottom: 96 }}>
          <svg width="126" height="126" viewBox="0 0 84 84" focusable="false">
            <circle cx="42" cy="42" r="4" />
            <ellipse cx="42" cy="42" rx="36" ry="13" />
            <ellipse cx="42" cy="42" rx="36" ry="13" transform="rotate(60 42 42)" />
            <ellipse cx="42" cy="42" rx="36" ry="13" transform="rotate(120 42 42)" />
          </svg>
        </div>
        <div className="row gap-3">
          <span className="inline-flex rounded-[10px] bg-white px-3.5 py-2.5">
            <BrandLogo size="lg" fallback={<LogoMark size="lg" />} />
          </span>
        </div>
        <DefaultBrandOnly>
        <div className="col items-start gap-0">
          {/* The logo's tagline, written in chalk */}
          <span className="cl-note chalk cl-write" style={{ "--rot": "-3deg", "--d": 300, fontSize: 46, lineHeight: 1.1 } as CSSProperties}>
            A vision of success…
          </span>
          <svg
            className="cl-ink chalk inline"
            width="400"
            height="14"
            viewBox="0 0 400 14"
            aria-hidden="true"
            focusable="false"
            style={{ "--d": 1100, margin: "4px 0 0 6px", transform: "rotate(-3deg)" } as CSSProperties}
          >
            <path pathLength={1} d="M3 9.5C80 5 180 4.5 280 6.5S372 10 397 7.5" />
          </svg>
        </div>
        </DefaultBrandOnly>
        <div className="col max-w-[460px] gap-[18px]">
          <WhiteLabelIntro part="name" className="h2 rise m-0 text-white" />
          <p className="d1 rise text-white">Every test makes the next one easier.</p>
          <DefaultBrandOnly>
            <p className="body rise m-0 text-on-brand-2" style={{ "--i": 1 } as CSSProperties}>
              Take your mock tests, see exactly where marks slipped, and get a study plan built from your own answers.
            </p>
            <div className="row wrap rise gap-2.5" style={{ "--i": 2 } as CSSProperties}>
              {/* G69: no exam names here (every institute's exams differ); the badges say what the app does */}
              <span className="badge bg-white/12 text-white">Mock tests</span>
              <span className="badge bg-white/12 text-white">Study plans</span>
              <span className="badge bg-white/12 text-white">AI review after every test</span>
            </div>
          </DefaultBrandOnly>
          <WhiteLabelIntro part="about" className="body rise m-0 text-on-brand-2" />
          <PoweredBy className="sm text-on-brand-2" />
        </div>
      </Blueboard>

      <section className="relative flex flex-[1_1_480px] items-center justify-center px-6 py-12 max-lg:-mt-9 max-lg:flex-1 max-lg:items-start max-lg:pt-0 max-md:px-4 max-md:pb-6">
        <span className="cl-margin auth-desktop-only" aria-hidden="true" style={{ left: 56 }} />
        <div className="col w-full max-w-[420px] items-stretch gap-4">
          <div className="card pad-lg col pop relative w-full gap-[22px] p-9 max-md:gap-5 max-md:px-5 max-md:py-6">
            <Tape rotate={-2} delay={700} />
            {children}
          </div>
          <LegalFooter />
        </div>
      </section>
    </div>
  );
}
