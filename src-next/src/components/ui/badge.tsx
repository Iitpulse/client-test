import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// shadcn new-york Badge with the boards' badge variants (Main board): navy, live (red, for live tests only),
// green, amber, grey, sky, red (errors, wrong answers). 24px pill, 12px semibold. No borders, no shadows.
const badgeVariants = cva(
  "inline-flex h-6 w-fit shrink-0 items-center gap-1.5 rounded-full px-[9px] text-xs font-semibold whitespace-nowrap [&>svg]:pointer-events-none [&>svg]:size-3 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand-200",
  {
    variants: {
      variant: {
        navy: "bg-brand-50 text-brand",
        live: "bg-accent-50 text-accent-600",
        green: "bg-success-50 text-success",
        amber: "bg-warning-50 text-warning",
        grey: "bg-line-2 text-muted",
        sky: "bg-info-50 text-info",
        red: "bg-danger-50 text-danger",
      },
    },
    defaultVariants: {
      variant: "navy",
    },
  }
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
