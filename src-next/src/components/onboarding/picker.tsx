"use client";

// Kit-Pickers K01 at the student size (44px): a searchable combobox over a fixed list (City, State, Class, Month).
// Desktop: the list opens under the field with the search box on top; phone: a bottom sheet (Kit-Overlays) with the
// search box, 48px rows and a close button. Typing filters (matched letters bold), the first match is focused so
// Enter picks it, picking closes the list and returns focus to the field. No native select.
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Sheet } from "@/components/student/sheet";
import { ChevronDown } from "@/components/auth/form-bits";
import { useIsDesktop } from "@/lib/use-media";
import { cn } from "@/lib/utils";

function Highlight({ text, q }: { text: string; q: string }) {
  const i = q ? text.toLowerCase().indexOf(q.toLowerCase()) : -1;
  if (i < 0) return <span>{text}</span>;
  return (
    <span>
      {text.slice(0, i)}
      <b>{text.slice(i, i + q.length)}</b>
      {text.slice(i + q.length)}
    </span>
  );
}

const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" focusable="false">
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
);
const Tick = () => (
  <svg className="tick" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
);

export function Picker({
  id,
  label,
  value,
  options,
  onChange,
  placeholder = "Pick one",
  invalid,
  describedBy,
  ariaLabel,
}: {
  id: string;
  /** the list's name for screen readers and the phone sheet title ("City") */
  label: string;
  value: string | null;
  options: string[];
  onChange: (v: string) => void;
  placeholder?: string;
  invalid?: boolean;
  describedBy?: string;
  /** when the visible label is not a <label for> (the month of a birthday) */
  ariaLabel?: string;
}) {
  const desktop = useIsDesktop() !== false;
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [focus, setFocus] = useState(0);
  const listId = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const shown = useMemo(() => options.filter((o) => o.toLowerCase().includes(q.trim().toLowerCase())), [options, q]);

  const close = (refocus = true) => {
    setOpen(false);
    setQ("");
    if (refocus) requestAnimationFrame(() => trigger.current?.focus());
  };
  const pick = (v: string) => {
    onChange(v);
    close();
  };

  // desktop: a click outside closes the list
  useEffect(() => {
    if (!open || !desktop) return;
    const onDown = (e: PointerEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) close(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open, desktop]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocus((f) => Math.min(f + 1, shown.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocus((f) => Math.max(f - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (shown[focus]) pick(shown[focus]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      close();
    }
  };

  const search = (
    <div className="au-cb open">
      <SearchIcon />
      <input
        autoFocus
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setFocus(0);
        }}
        onKeyDown={onKey}
        role="combobox"
        aria-expanded="true"
        aria-controls={listId}
        aria-activedescendant={shown[focus] ? `${listId}-${focus}` : undefined}
        aria-label={`Search ${label.toLowerCase()}`}
        placeholder={`Search ${label.toLowerCase()}`}
        autoComplete="off"
      />
    </div>
  );
  const list = (
    <ul id={listId} className="au-list" role="listbox" aria-label={label}>
      {shown.length === 0 ? (
        <li className="au-li none" role="presentation">
          No match
        </li>
      ) : (
        shown.map((o, i) => (
          <li key={o} id={`${listId}-${i}`} role="option" aria-selected={o === value}>
            <button type="button" tabIndex={-1} className={cn("au-li", i === focus && "focus")} onMouseEnter={() => setFocus(i)} onClick={() => pick(o)}>
              <Highlight text={o} q={q.trim()} />
              {o === value && <Tick />}
            </button>
          </li>
        ))
      )}
    </ul>
  );

  return (
    <div ref={wrap} className="relative">
      <button
        ref={trigger}
        id={id}
        type="button"
        className={cn("au-cb", invalid && "e", open && desktop && "open")}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        aria-label={ariaLabel}
        onClick={() => {
          setFocus(Math.max(0, options.indexOf(value ?? "")));
          setOpen((o) => !o);
        }}
      >
        <span className={cn("v", !value && "ph")}>{value || placeholder}</span>
        <ChevronDown />
      </button>
      {open && desktop && (
        <div className="au-pop pop">
          {search}
          {list}
        </div>
      )}
      {!desktop && (
        <Sheet open={open} onOpenChange={(o) => (o ? setOpen(true) : close())} title={label}>
          {search}
          {list}
        </Sheet>
      )}
    </div>
  );
}
