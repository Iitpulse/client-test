"use client";

// Kit-Overlays: a dialog on desktop, a bottom sheet on phones (below 768px): grab handle, title, close button, a
// sticky full-width action. Esc and the scrim close it; focus goes in and returns to the trigger (Radix Dialog).
// `full` opens the phone sheet at full height (forms over 3 fields).
import * as Dialog from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";

export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  full,
  className,
  dismissible = true,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  /** the actions: right-aligned on desktop, full width (primary on top) on phones */
  footer?: React.ReactNode;
  full?: boolean;
  className?: string;
  /** false: Esc and the scrim do nothing (a step that must be finished or skipped with its own button) */
  dismissible?: boolean;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="sheet-scrim" />
        <Dialog.Content
          className={cn("sheet", full && "sheet-full", className)}
          onEscapeKeyDown={dismissible ? undefined : (e) => e.preventDefault()}
          onPointerDownOutside={dismissible ? undefined : (e) => e.preventDefault()}
          aria-describedby={description ? undefined : undefined}
        >
          <span className="sheet-grab md:hidden" aria-hidden="true" />
          <div className="sheet-hd">
            <div className="col" style={{ gap: 4, minWidth: 0 }}>
              <Dialog.Title className="h3" style={{ margin: 0 }}>
                {title}
              </Dialog.Title>
              {description && <Dialog.Description className="sm muted" style={{ margin: 0 }}>{description}</Dialog.Description>}
            </div>
            {dismissible && (
              <Dialog.Close className="btn btn-ghost btn-icon sheet-x" aria-label="Close">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </Dialog.Close>
            )}
          </div>
          <div className="sheet-bd">{children}</div>
          {footer && <div className="sheet-ft">{footer}</div>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
