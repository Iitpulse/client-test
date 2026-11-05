import { Doodle, InkUnderline, type DoodleName } from "@iitpulse/ui";

/**
 * The sticky title header of Phone-Progress and Phone-Doubts (phones only): the page title underlined in blue ink
 * and one pencil doodle on the right, as the boards draw it. `children` go under the title (Phone-Doubts' quota).
 */
export function PhoneTitleBar({ title, doodle, children }: { title: string; doodle?: DoodleName; children?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-(--z-topbar) col relative gap-2.5 border-b border-line bg-white/90 px-4 pt-[calc(18px+env(safe-area-inset-top))] pb-3 backdrop-blur-md md:hidden">
      {doodle && <Doodle name={doodle} className="[&_svg]:h-[55px] [&_svg]:w-[72px]" style={{ right: 22, top: 4 }} />}
      <h1 className="h2 text-[24px]">
        <InkUnderline delay={450}>{title}</InkUnderline>
      </h1>
      {children}
    </header>
  );
}
