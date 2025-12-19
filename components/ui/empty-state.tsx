import * as React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  illustration?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

/**
 * Standardized empty state with optional illustration/icon and CTA.
 */
export function EmptyState({
  icon: Icon,
  illustration,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center py-10 px-4 gap-4",
        "bg-card border border-dashed border-border rounded-2xl",
        className,
      )}
    >
      {illustration ? (
        <div className="relative h-32 w-48">
          <Image
            src={illustration}
            alt=""
            fill
            className="object-contain drop-shadow-sm"
            priority={false}
          />
        </div>
      ) : Icon ? (
        <Icon className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
      ) : null}

      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        {description && (
          <p className="text-sm text-muted-foreground max-w-md">{description}</p>
        )}
      </div>

      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
