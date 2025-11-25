import React, { forwardRef } from "react";

interface SeparatorProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: "horizontal" | "vertical";
}

/**
 * A purely decorative visual separator.
 * It is hidden from screen readers.
 * If you need a semantic separator (e.g., for a menu), you should
 * use role="separator" and add aria-orientation.
 */
export const Separator = forwardRef<HTMLDivElement, SeparatorProps>(
  ({ className = "", orientation = "horizontal", ...props }, ref) => {
    const orientationClasses = {
      horizontal: "h-[1px] w-full",
      vertical: "h-full w-[1px]",
    };

    return (
      <div
        ref={ref}
        role="presentation"
        aria-hidden="true"
        className={`
          shrink-0 
          bg-border
          ${orientationClasses[orientation]} 
          ${className}
        `}
        {...props}
      />
    );
  },
);

Separator.displayName = "Separator";
