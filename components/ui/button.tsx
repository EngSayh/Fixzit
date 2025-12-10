import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

// Helper function for class merging
function cn(...inputs: (string | undefined | null | false)[]): string {
  return inputs.filter(Boolean).join(" ");
}

// Ejar-styled button system: 40px height, 6px radius, bold labels
const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-[6px] text-[14px] font-bold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#118158]/40 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-[#118158] text-white hover:bg-[#0D6645] active:bg-[#094D34]",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        success: "bg-[#28A745] text-white hover:bg-[#1F7A3A]",
        outline:
          "border border-[#DEE2E6] bg-transparent text-[#333333] hover:bg-[#E7F2EE]",
        secondary:
          "border border-[#D1D1D1] bg-transparent text-[#333333] hover:bg-[#F8F9FA]",
        ghost: "bg-transparent text-[#118158] hover:bg-[#E7F2EE]",
        link: "text-[#118158] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-6",
        sm: "h-9 px-4 text-[13px]",
        lg: "h-11 px-8 text-[15px]",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
