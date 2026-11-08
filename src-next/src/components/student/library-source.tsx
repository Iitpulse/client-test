/**
 * M10 Library-Branding board: the small "From the IIT-PULSE library" line under a question in review (Student-Review,
 * Phone-Review) and practice, with the small IP mark. Shown only when api-tests sends `librarySource` (a shared
 * IIT-PULSE library question and the institute shows the source); nothing otherwise. Never on the exam screens
 * ((exam)/instructions, (exam)/test): the exam payload never carries it.
 *
 * The mark is IIT-PULSE's own navy, not the institute's theme colour (--navy follows the institute's brand).
 */
export function LibrarySource({ source, className }: { source?: string | null; className?: string }) {
  if (!source) return null;
  return (
    <span className={`xs muted inline-flex items-center gap-1.5 self-start${className ? ` ${className}` : ""}`}>
      <span aria-hidden="true" className="inline-block h-3.5 w-3.5 flex-none rounded bg-[#00007E] text-center font-sans text-[8px] leading-[14px] font-bold text-white">
        IP
      </span>
      From the {source}
    </span>
  );
}
