import * as React from "react";
import { cn } from "@/lib/utils";

type AlertVariant = "default" | "destructive" | "info";

const variantClasses: Record<AlertVariant, string> = {
  default: "bg-primary/10 border-primary/30 text-primary",
  destructive: "bg-destructive/10 border-destructive/30 text-destructive",
  info: "bg-muted border-border text-muted-foreground",
};

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant;
}

export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = "default", ...props }, ref) => (
    <div
      ref={ref}
      role="alert"
      className={cn(
        "w-full rounded-lg border p-4 text-sm",
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  ),
);
Alert.displayName = "Alert";

export const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn("mb-1 font-semibold leading-none tracking-tight", className)}
    {...props}
  />
));
AlertTitle.displayName = "AlertTitle";

export const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm leading-relaxed text-inherit", className)}
    {...props}
  />
));
AlertDescription.displayName = "AlertDescription";
