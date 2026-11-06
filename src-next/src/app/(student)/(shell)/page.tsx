import type { Metadata } from "next";
import { Doodle, InkUnderline, Note } from "@iitpulse/ui";
import { HomeView } from "@/components/student/home-view";
import { BatchBadge, GreetingComma, GreetingName, GreetingWord, HomeDate, HomeOffline } from "@/components/student/home-greeting";

export const metadata: Metadata = { title: "Home · IIT-PULSE" };

/**
 * "/" is the Home tab (Student-Home, Phone-Home). Signed-out visitors are sent to /login by the shell.
 * Server-rendered (no JavaScript): the doodles, the frames of the date note and the greeting, the title underline.
 * Client: the date and greeting words, the name, the batch badge and every data card (HomeView). Its data request
 * starts from the root layout while the JavaScript loads.
 */
export default function HomePage() {
  return (
    <div className="col gap-7 md:pt-1 max-md:gap-3.5">
      <Doodle name="pendulum" slot="gl" style={{ top: 300 }} />
      <Doodle name="benzene" slot="gr" style={{ top: 760 }} />
      <HomeOffline />
      <header className="row between wrap relative gap-4 rise max-md:gap-0.5">
        <Doodle name="atom" className="md:hidden [&_svg]:size-16" style={{ right: 2, top: -6 }} />
        <div className="col gap-0.5">
          <Note size="sm" write rotate={-1.5} delay={150} className="self-start min-h-[17px]">
            <HomeDate />
          </Note>
          <h1 className="h1 relative max-md:text-[22px]">
            <GreetingWord />
            <GreetingComma />
            <InkUnderline delay={450}>
              <GreetingName />
            </InkUnderline>
          </h1>
        </div>
        <BatchBadge />
      </header>
      <HomeView />
    </div>
  );
}
