import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Drawer built on Radix Dialog, sliding from the end (logical end to support RTL).
 */
export const Drawer = DialogPrimitive.Root;
export const DrawerTrigger = DialogPrimitive.Trigger;
export const DrawerPortal = DialogPrimitive.Portal;

export const DrawerOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/40 backdrop-blur-sm",
      "data-[state=open]:animate-in data-[state=closed]:animate-out",
      "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className,
    )}
    {...props}
  />
));
DrawerOverlay.displayName = DialogPrimitive.Overlay.displayName;

export interface DrawerContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  position?: "end" | "start" | "bottom";
  size?: "sm" | "md" | "lg" | "full";
  showClose?: boolean;
}

export const DrawerContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  DrawerContentProps
>(
  (
    {
      className,
      children,
      position = "end",
      size = "md",
      showClose = true,
      ...props
    },
    ref,
  ) => {
    const positionClasses = {
      end: "inset-y-0 end-0 w-full data-[state=open]:slide-in-from-end data-[state=closed]:slide-out-to-end",
      start:
        "inset-y-0 start-0 w-full data-[state=open]:slide-in-from-start data-[state=closed]:slide-out-to-start",
      bottom:
        "inset-x-0 bottom-0 w-full data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom",
    }[position];

    const sizeClasses = {
      sm: "sm:max-w-md",
      md: "sm:max-w-lg",
      lg: "sm:max-w-2xl",
      full: "sm:max-w-full",
    }[size];

    return (
      <DrawerPortal>
        <DrawerOverlay />
        <DialogPrimitive.Content
          ref={ref}
          className={cn(
            "fixed z-50 bg-card text-card-foreground shadow-lg",
            "border border-border flex flex-col",
            positionClasses,
            sizeClasses,
            className,
          )}
          {...props}
        >
          {showClose && (
            <DialogPrimitive.Close className="absolute top-4 end-4 rounded-md p-2 text-muted-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">
              <X className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          )}
          {children}
        </DialogPrimitive.Content>
      </DrawerPortal>
    );
  },
);
DrawerContent.displayName = "DrawerContent";

export const DrawerHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("px-6 py-4 border-b border-border", className)} {...props} />
);
DrawerHeader.displayName = "DrawerHeader";

export const DrawerTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-base font-semibold text-foreground", className)}
    {...props}
  />
));
DrawerTitle.displayName = DialogPrimitive.Title.displayName;

export const DrawerDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground mt-1", className)}
    {...props}
  />
));
DrawerDescription.displayName = DialogPrimitive.Description.displayName;

export const DrawerBody = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex-1 overflow-y-auto px-6 py-4", className)} {...props} />
);
DrawerBody.displayName = "DrawerBody";

export const DrawerFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "px-6 py-4 border-t border-border flex flex-col gap-3 sm:flex-row sm:justify-end",
      className,
    )}
    {...props}
  />
);
DrawerFooter.displayName = "DrawerFooter";
