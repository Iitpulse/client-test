import Link from "next/link";
import { InkUnderline } from "@iitpulse/ui";
import { Button } from "@/components/ui/button";

/** Placeholder for a tab whose screen is not built yet (Progress and Doubts arrive in M4): never a 404. */
export function ComingSoon({ title, body }: { title: string; body: string }) {
  return (
    <section className="col rise mx-auto max-w-[560px] gap-5 pt-6 md:pt-12">
      <span className="badge b-navy self-start">Coming soon</span>
      <h1 className="h1">
        <InkUnderline delay={300}>{title}</InkUnderline>
      </h1>
      <p className="body muted m-0">{body}</p>
      <div>
        <Button asChild variant="secondary">
          <Link href="/tests">Go to your tests</Link>
        </Button>
      </div>
    </section>
  );
}
