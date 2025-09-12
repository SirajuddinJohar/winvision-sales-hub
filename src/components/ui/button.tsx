import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 shadow-sm hover:shadow-md",
  {
    variants: {
      variant: {
        default: "bg-gradient-primary text-white hover:shadow-primary transform hover:-translate-y-0.5 border-0 shadow-lg hover:shadow-xl",
        destructive:
          "bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 shadow-lg hover:shadow-red-500/25 transform hover:-translate-y-0.5",
        outline:
          "border-2 border-primary bg-transparent text-primary hover:bg-gradient-primary hover:text-white hover:border-transparent transform hover:-translate-y-0.5 shadow-sm hover:shadow-primary/25",
        secondary:
          "bg-gradient-secondary text-white hover:shadow-lg transform hover:-translate-y-0.5 shadow-md",
        ghost: "hover:bg-primary/10 hover:text-primary shadow-none transition-all duration-300",
        link: "text-primary underline-offset-4 hover:underline shadow-none hover:text-primary/80",
        elegant: "bg-gradient-elegant text-white hover:shadow-elegant transform hover:-translate-y-0.5 border-0 shadow-lg",
        professional: "bg-gradient-info text-white hover:shadow-lg shadow-md transform hover:-translate-y-0.5",
        success: "bg-gradient-success text-white hover:shadow-lg shadow-md transform hover:-translate-y-0.5",
        warning: "bg-gradient-warning text-white hover:shadow-lg shadow-md transform hover:-translate-y-0.5",
      },
      size: {
        default: "h-11 px-6 py-2.5",
        sm: "h-9 rounded-lg px-4 text-xs",
        lg: "h-12 rounded-lg px-8 text-base",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
