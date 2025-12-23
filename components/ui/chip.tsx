import * as React from "react";
import { X } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

type ChipVariant = "solid" | "outline";
type ChipSize = "sm" | "md";

export interface ChipProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "size"> {
  variant?: ChipVariant;
  size?: ChipSize;
  selected?: boolean;
  onRemove?: () => void;
}

/**
 * Compact filter/status chip with optional remove affordance.
 * Suitable for quick filters and active filter tokens.
 */
export const Chip = React.forwardRef<HTMLButtonElement, ChipProps>(
  (
    {
      className,
      children,
      variant = "outline",
      size = "md",
      selected = false,
      onRemove,
      disabled,
      ...props
    },
    ref,
  ) => {
    const base =
      "inline-flex items-center gap-2 rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

    const sizeClasses =
      size === "sm"
        ? "px-3 py-1 text-xs"
        : "px-3.5 py-1.5 text-sm";

    const variantClasses =
      variant === "solid"
        ? "bg-primary/10 text-primary border-primary/30 hover:bg-primary/15"
        : "bg-transparent text-foreground border-border hover:bg-muted";

    const selectedClasses = selected
      ? "bg-primary text-primary-foreground border-primary hover:bg-primary/90"
      : "";

    return (
      <button
        ref={ref}
        className={cn(
          base,
          sizeClasses,
          variantClasses,
          selectedClasses,
          disabled && "opacity-60 cursor-not-allowed",
          className,
        )}
        disabled={disabled}
        aria-pressed={selected}
        {...props}
      >
        <span className="inline-flex items-center">{children}</span>
        {onRemove && (
          <X
            className="h-4 w-4 shrink-0 text-muted-foreground"
            aria-hidden="true"
            onClick={(event) => {
              event.stopPropagation();
              onRemove();
            }}
          />
        )}
      </button>
    );
  },
);

Chip.displayName = "Chip";
