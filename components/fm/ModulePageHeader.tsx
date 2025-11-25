"use client";

import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { usePageLabels, type PageLabelKey } from "@/hooks/usePageLabels";

interface ModulePageHeaderProps {
  pageKey: PageLabelKey;
  className?: string;
  actions?: ReactNode;
  children?: ReactNode;
}

export default function ModulePageHeader({
  pageKey,
  className,
  actions,
  children,
}: ModulePageHeaderProps) {
  const { title, subtitle } = usePageLabels(pageKey);

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{title}</h1>
          <p className="text-muted-foreground">{subtitle}</p>
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
      {children}
    </div>
  );
}
