import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cn } from "@/lib/utils";

export const TooltipProvider = TooltipPrimitive.Provider;
export const Tooltip = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;

export const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 6, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "z-50 overflow-hidden rounded-md px-3 py-1.5 text-sm shadow-lg",
        // Light mode
        "border border-border bg-popover text-popover-foreground",
        // Animation
        "animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
        // Side-aware animations
        "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        className,
      )}
      {...props}
    />
  </TooltipPrimitive.Portal>
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

/**
 * Simple tooltip wrapper for convenience.
 * Use this when you just need a basic tooltip on a single element.
 * Note: Requires TooltipProvider to be present in the component tree (see app/layout.tsx)
 *
 * @example
 * ```tsx
 * <SimpleTooltip content="Click to save">
 *   <button type="button">Save</button>
 * </SimpleTooltip>
 * ```
 */
interface SimpleTooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  delayDuration?: number;
  asChild?: boolean;
}

export const SimpleTooltip: React.FC<SimpleTooltipProps> = ({
  content,
  children,
  side = "top",
  delayDuration,
  asChild = true,
}) => {
  // Use global TooltipProvider from layout.tsx
  // Only wrap with local provider if delayDuration is explicitly set (overriding global)
  const tooltipContent = (
    <Tooltip>
      <TooltipTrigger asChild={asChild}>{children}</TooltipTrigger>
      <TooltipContent side={side}>{content}</TooltipContent>
    </Tooltip>
  );

  // If custom delay is specified, wrap with local provider to override
  if (delayDuration !== undefined) {
    return (
      <TooltipProvider delayDuration={delayDuration}>
        {tooltipContent}
      </TooltipProvider>
    );
  }

  return tooltipContent;
};

