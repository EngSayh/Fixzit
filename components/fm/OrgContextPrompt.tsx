"use client";

import React, { PropsWithChildren } from "react";
import { useTranslation } from "@/contexts/TranslationContext";
import { cn } from "@/lib/utils";

export interface OrgContextPromptProps extends PropsWithChildren {
  canImpersonate: boolean;
  className?: string;
  title?: string;
  impersonationMessage?: string;
  fallbackMessage?: string;
}

export function OrgContextPrompt({
  canImpersonate,
  className,
  title,
  impersonationMessage,
  fallbackMessage,
  children,
}: OrgContextPromptProps) {
  const { t } = useTranslation();

  const resolvedTitle = title ?? t("fm.org.required", "Organization Required");
  const resolvedMessage = canImpersonate
    ? (impersonationMessage ??
      t(
        "fm.org.selectPrompt",
        "Please select an organization from the top bar to continue.",
      ))
    : (fallbackMessage ??
      t(
        "fm.org.contactAdmin",
        "Please contact your administrator to be assigned to an organization.",
      ));

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card/30 p-6 space-y-3",
        className,
      )}
    >
      <p className="text-destructive font-semibold">{resolvedTitle}</p>
      <p className="text-sm text-muted-foreground">{resolvedMessage}</p>
      {children}
    </div>
  );
}
