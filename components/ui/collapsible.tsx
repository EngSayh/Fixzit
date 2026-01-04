"use client";

/**
 * Collapsible Component
 * 
 * A component that can be expanded or collapsed to show/hide content.
 * Simple implementation without external dependencies.
 * 
 * @module components/ui/collapsible
 */

import * as React from "react";
import { cn } from "@/lib/utils";

interface CollapsibleProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultOpen?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
}

const CollapsibleContext = React.createContext<{
  open: boolean;
  onToggle: () => void;
  disabled?: boolean;
}>({
  open: false,
  onToggle: () => {},
  disabled: false,
});

function Collapsible({
  open: controlledOpen,
  onOpenChange,
  defaultOpen = false,
  disabled = false,
  children,
  className,
}: CollapsibleProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);
  
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  
  const onToggle = React.useCallback(() => {
    if (disabled) return;
    if (isControlled) {
      onOpenChange?.(!open);
    } else {
      setUncontrolledOpen((prev) => !prev);
      onOpenChange?.(!open);
    }
  }, [disabled, isControlled, open, onOpenChange]);
  
  return (
    <CollapsibleContext.Provider value={{ open, onToggle, disabled }}>
      <div data-state={open ? "open" : "closed"} className={className}>
        {children}
      </div>
    </CollapsibleContext.Provider>
  );
}

interface CollapsibleTriggerProps {
  children: React.ReactNode;
  className?: string;
  asChild?: boolean;
}

function CollapsibleTrigger({
  children,
  className,
  asChild,
}: CollapsibleTriggerProps) {
  const { open, onToggle, disabled } = React.useContext(CollapsibleContext);
  
  // If asChild, we need to clone the child and add our props
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<{
      onClick?: (e: React.MouseEvent) => void;
      "data-state"?: string;
      "data-disabled"?: string;
      "aria-expanded"?: boolean;
    }>, {
      onClick: (e: React.MouseEvent) => {
        onToggle();
        // Also call the child's onClick if it exists
        const childOnClick = (children as React.ReactElement<{ onClick?: (e: React.MouseEvent) => void }>).props.onClick;
        if (childOnClick) childOnClick(e);
      },
      "data-state": open ? "open" : "closed",
      "data-disabled": disabled ? "" : undefined,
      "aria-expanded": open,
    });
  }
  
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      data-state={open ? "open" : "closed"}
      aria-expanded={open}
      className={cn("flex w-full", className)}
    >
      {children}
    </button>
  );
}

interface CollapsibleContentProps {
  children: React.ReactNode;
  className?: string;
  forceMount?: boolean;
}

function CollapsibleContent({
  children,
  className,
  forceMount,
}: CollapsibleContentProps) {
  const { open } = React.useContext(CollapsibleContext);
  
  if (!open && !forceMount) {
    return null;
  }
  
  return (
    <div
      data-state={open ? "open" : "closed"}
      className={cn(
        "overflow-hidden",
        !open && forceMount && "hidden",
        className
      )}
    >
      {children}
    </div>
  );
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent };
