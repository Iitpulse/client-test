import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// shadcn new-york Button, restyled through @iitpulse/ui tokens to the boards' .btn family (Main board):
// primary = the navy gradient, secondary = white with a hairline, ghost, danger. No shadows; focus is a
// 3px brand-200 outline. Sizes: sm 32px, default 40px, lg 48px, icon 40px.
const buttonVariants = cva(
  [
    "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-control border border-transparent text-sm font-semibold no-underline",
    "transition-[transform,background,border-color,color,filter] duration-200 ease-standard active:scale-[.97]",
    "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand-200",
    "disabled:cursor-not-allowed disabled:opacity-60 aria-disabled:cursor-not-allowed",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  ].join(" "),
  {
    variants: {
      variant: {
        primary:
          "border-brand bg-(image:--grad-btn) text-on-brand hover:bg-(image:--grad-btn-hover) hover:text-on-brand disabled:border-transparent disabled:bg-brand-100 disabled:bg-none disabled:text-muted disabled:opacity-100",
        secondary: "border-line bg-surface text-ink hover:border-brand-200 hover:bg-brand-50 hover:text-brand",
        ghost: "bg-transparent text-ink-2 hover:bg-line-2 hover:text-ink",
        danger: "bg-danger text-white hover:bg-[#A30000] hover:text-white",
        link: "h-auto px-0 text-brand underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4",
        sm: "h-8 rounded-chip px-3 text-[13px]",
        lg: "h-12 rounded-tile px-[22px] text-[15px]",
        icon: "size-10 p-0",
        "icon-sm": "size-8 rounded-chip p-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
