// Student-Legal (batch 7, canvas v180): the Terms of Use and Privacy Policy pages, public (no sign-in). Renders the
// drafts in content/legal.ts: a contents list from the "## " headings, the title, the effective date and version,
// a "Draft for legal review" banner, and the sections. Bracketed fill-ins ("[Legal entity name]") are marked in orange
// until they are filled. Only the small Markdown subset the drafts use is read: headings, paragraphs, "- " lists (one
// nested level), **bold** and [text](link). Server component: no JavaScript ships for these pages.
import Link from "next/link";
import { Fragment } from "react";
import { LEGAL_VERSION } from "@/content/legal";

type Block =
  | { k: "h1"; text: string }
  | { k: "h2"; text: string; id: string }
  | { k: "p"; text: string }
  | { k: "draft"; text: string }
  | { k: "ul"; items: Array<{ text: string; sub: string[] }> };

const slug = (t: string) =>
  t
    .toLowerCase()
    .replace(/^\d+\.\s*/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

function parse(md: string): Block[] {
  const out: Block[] = [];
  const lines = md.replace(/\r/g, "").split("\n");
  let para: string[] = [];
  let list: Extract<Block, { k: "ul" }> | null = null;
  const flush = () => {
    if (para.length) out.push({ k: "p", text: para.join(" ") });
    para = [];
    if (list) out.push(list);
    list = null;
  };
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      flush();
      continue;
    }
    if (line.startsWith("> ")) {
      flush();
      out.push({ k: "draft", text: line.slice(2) });
    } else if (line.startsWith("# ")) {
      flush();
      out.push({ k: "h1", text: line.slice(2) });
    } else if (line.startsWith("## ")) {
      flush();
      out.push({ k: "h2", text: line.slice(3), id: slug(line.slice(3)) });
    } else if (/^\s{2,}- /.test(line) && list) {
      list.items[list.items.length - 1]?.sub.push(line.trim().slice(2));
    } else if (line.startsWith("- ")) {
      if (para.length) {
        out.push({ k: "p", text: para.join(" ") });
        para = [];
      }
      list ??= { k: "ul", items: [] };
      list.items.push({ text: line.slice(2), sub: [] });
    } else {
      if (list) {
        out.push(list);
        list = null;
      }
      para.push(line.trim());
    }
  }
  flush();
  return out;
}

/** **bold**, [text](href) and [fill-in] (no link) */
function Inline({ text }: { text: string }) {
  const parts: React.ReactNode[] = [];
  const re = /\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)]+)\)|\[([^\]]+)\]/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[1] !== undefined) parts.push(<b key={i++}>{m[1]}</b>);
    else if (m[2] !== undefined) {
      const href = m[3]!;
      parts.push(
        href.startsWith("/") ? (
          <Link key={i++} href={href}>
            {m[2]}
          </Link>
        ) : (
          <a key={i++} href={href} rel="noopener noreferrer">
            {m[2]}
          </a>
        )
      );
    } else parts.push(<span key={i++} className="fill">[{m[4]}]</span>);
    last = re.lastIndex;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}

export function LegalDoc({ md, other }: { md: string; other: { href: string; label: string } }) {
  const blocks = parse(md);
  const title = (blocks.find((b) => b.k === "h1") as { text: string } | undefined)?.text ?? "";
  const toc = blocks.filter((b): b is Extract<Block, { k: "h2" }> => b.k === "h2");
  return (
    <div className="mx-auto w-full max-w-[1136px] px-4 pt-6 pb-16 md:px-8 md:pt-10">
      <nav className="row between mb-6 gap-4">
        <Link href="/" aria-label="IIT-PULSE home" className="flex">
          <span role="img" aria-label="IIT-PULSE" className="relative block h-[26px] w-[136px] overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element -- the logo is a fixed, unchanged PNG cropped by CSS */}
            <img src="/iitpulse-logo.png" alt="" className="absolute top-[-7px] left-0 h-[43px] w-auto max-w-none" decoding="async" />
          </span>
        </Link>
        <Link href={other.href} className="sm font-semibold">
          {other.label}
        </Link>
      </nav>
      <div className="flex items-start gap-10 max-lg:flex-col max-lg:gap-5">
        <aside className="card pad col sticky top-6 w-[260px] flex-none gap-2 max-lg:static max-lg:w-full" aria-label="Contents">
          <details open className="group">
            <summary className="sm cursor-pointer list-none font-semibold">Contents</summary>
            <ol className="mt-2 col gap-1.5 pl-0" style={{ listStyle: "none" }}>
              {toc.map((h) => (
                <li key={h.id}>
                  <a href={`#${h.id}`} className="sm">
                    {h.text}
                  </a>
                </li>
              ))}
            </ol>
          </details>
        </aside>
        <article className="legal col min-w-0 max-w-[720px] grow">
          <h1 className="h1 mb-1">{title}</h1>
          <span className="sm muted mb-4">Version {LEGAL_VERSION}</span>
          {blocks.map((b, i) => {
            if (b.k === "h1") return null;
            if (b.k === "draft")
              return (
                <p key={i} className="draft" role="note">
                  <Inline text={b.text} />
                </p>
              );
            if (b.k === "h2")
              return (
                <h2 key={i} id={b.id}>
                  {b.text}
                </h2>
              );
            if (b.k === "p")
              return (
                <p key={i} className="my-2">
                  <Inline text={b.text} />
                </p>
              );
            return (
              <ul key={i}>
                {b.items.map((it, j) => (
                  <li key={j}>
                    <Inline text={it.text} />
                    {it.sub.length > 0 && (
                      <ul>
                        {it.sub.map((s, k) => (
                          <Fragment key={k}>
                            <li>
                              <Inline text={s} />
                            </li>
                          </Fragment>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            );
          })}
        </article>
      </div>
    </div>
  );
}
