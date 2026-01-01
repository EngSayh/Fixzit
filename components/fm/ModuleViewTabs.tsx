"use client";

import React from "react";
import { useMemo, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/contexts/TranslationContext";
import {
  MODULE_SUB_VIEWS,
  type ModuleId,
  type ModuleSubView,
} from "@/config/navigation";

type ModuleKeyLike = ModuleId | string;
type QueryView = Extract<ModuleSubView, { kind: "query" }>;

const getQueryViews = (moduleId: ModuleKeyLike): QueryView[] => {
  const views =
    (MODULE_SUB_VIEWS as Record<string, ModuleSubView[] | undefined>)[
      moduleId
    ] ?? [];
  return views.filter((view): view is QueryView => view.kind === "query");
};

export function useModuleView(moduleId: ModuleKeyLike) {
  const searchParams = useSearchParams();
  const views = useMemo(() => getQueryViews(moduleId), [moduleId]);
  const requested = searchParams?.get("view");
  const currentView =
    views.find((view) => view.value === requested) ??
    (views.length ? views[0] : undefined);

  return { views, currentView };
}

interface ModuleViewTabsProps {
  moduleId: ModuleKeyLike;
  className?: string;
}

export default function ModuleViewTabs({
  moduleId,
  className,
}: ModuleViewTabsProps) {
  const { views, currentView } = useModuleView(moduleId);
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useTranslation();
  const [, startTransition] = useTransition();

  if (views.length <= 1) {
    return null;
  }

  const handleSelect = (value: string) => {
    if (currentView?.value === value) return;
    const paramsString = searchParams?.toString() ?? "";
    startTransition(() => {
      const params = new URLSearchParams(paramsString);
      params.set("view", value);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  };

  return (
    <div
      className={cn(
        "flex flex-wrap gap-2 border-b border-border pb-3",
        className,
      )}
    >
      {views.map((view) => {
        const active = currentView?.value === view.value;
        return (
          <button
            key={view.id}
            type="button"
            onClick={() => handleSelect(view.value)}
            aria-label={view.fallbackLabel}
            className={cn(
              "px-3 py-1.5 text-sm rounded-full border transition-all duration-200",
              active
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "bg-muted border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {t(view.name, view.fallbackLabel)}
          </button>
        );
      })}
    </div>
  );
}
