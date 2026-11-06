import Link from "next/link";

/** Student-Legal: the links under the sign-in and sign-up cards (public pages /terms and /privacy). */
export function LegalFooter({ className }: { className?: string }) {
  return (
    <p className={`xs muted m-0 text-center ${className ?? ""}`}>
      <Link href="/terms" className="font-semibold">
        Terms of Use
      </Link>
      <span aria-hidden="true"> · </span>
      <Link href="/privacy" className="font-semibold">
        Privacy Policy
      </Link>
    </p>
  );
}
