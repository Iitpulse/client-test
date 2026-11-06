import type { ReactNode } from "react";
import Link from "next/link";
import { Doodle, LogoMark, Note } from "@iitpulse/ui";

/**
 * Student-SignInLink board frame: the logo with the tagline in blue ink, one centred card and "Not you?".
 * Desktop: red margin rule 20px left of the 1000px column, two pencil doodles in the gutter slots (hidden below
 * 1380px). Phone (batch 5 board): the same logo, note and card in a 390px column; no margin rule, no doodles, no
 * tab bar; the actions stack full width.
 *
 * Classroom budget (student desktop): 1 note, 2 doodles (gutters), 1 taped card (the card adds it), 1 title
 * underline, 1 margin rule.
 */
export function SignInFrame({ children, footer = true }: { children: ReactNode; footer?: boolean }) {
  return (
    <div className="relative flex min-h-dvh flex-col max-md:items-stretch">
      <div className="relative flex flex-1 flex-col items-center justify-center gap-7 px-4 py-12">
        <span className="cl-margin phone-hide" aria-hidden="true" style={{ left: "calc(50% - 500px)" }} />
        <Doodle name="flask" slot="gl" style={{ top: 190 }} />
        <Doodle name="parabola" slot="gr" style={{ top: 470 }} />
        <div className="col fade items-center gap-1.5">
          <LogoMark size="lg" />
          <Note size="sm" write rotate={-2} delay={250}>
            A vision of success…
          </Note>
        </div>
        {children}
        {footer && (
          <p className="xs muted m-0 text-center">
            Not you?{" "}
            <Link href="/login" className="font-semibold">
              Sign in with a different account
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}

/** The taped card of the SignInLink board (460px, 32px padding). */
export function SignInCard({ children, gap = 24, taped = true, label }: { children: ReactNode; gap?: number; taped?: boolean; label?: string }) {
  return (
    <section className="card col pop relative w-full max-w-[460px] p-8 max-md:rounded-[16px] max-md:px-5 max-md:py-6" style={{ gap }} aria-label={label}>
      {taped && <span className="cl-tape" aria-hidden="true" style={{ "--rot": "-2deg", "--d": 700 } as React.CSSProperties} />}
      {children}
    </section>
  );
}
