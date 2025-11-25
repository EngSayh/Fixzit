"use client";

import React from "react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useSupportOrg } from "@/contexts/SupportOrgContext";
import { useTranslation } from "@/contexts/TranslationContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

type SearchResult = {
  orgId: string;
  name: string;
  code?: string | null;
  registrationNumber?: string | null;
  subscriptionPlan?: string | null;
};

const SWITCHER_EVENT = "support-org-switcher:open";

export default function SupportOrgSwitcher() {
  const { t } = useTranslation();
  const {
    supportOrg,
    loading,
    canImpersonate,
    selectOrgById,
    clearSupportOrg,
  } = useSupportOrg();
  const [open, setOpen] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const handleOpen = () => setOpen(true);
    window.addEventListener(SWITCHER_EVENT, handleOpen);
    return () => {
      window.removeEventListener(SWITCHER_EVENT, handleOpen);
    };
  }, []);

  if (!canImpersonate) {
    return null;
  }

  const runSearch = async (id: string) => {
    if (!id.trim()) {
      toast.error(
        t(
          "support.impersonation.errors.identifierRequired",
          "Enter a corporate ID or code to search",
        ),
      );
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(
        `/api/support/organizations/search?identifier=${encodeURIComponent(id.trim())}`,
        { credentials: "include" },
      );
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        toast.error(
          error?.error ||
            t("support.impersonation.errors.lookupFailed", "Lookup failed"),
        );
        setResults([]);
        return;
      }
      const data = (await res.json()) as { results?: SearchResult[] };
      if (!data.results?.length) {
        toast.error(
          t(
            "support.impersonation.errors.noResults",
            "No organization found for that ID",
          ),
        );
        setResults([]);
        return;
      }
      setResults(data.results);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("support.impersonation.errors.lookupFailed", "Lookup failed"),
      );
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleSearchSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await runSearch(identifier);
  };

  const handleSelect = async (orgId: string) => {
    const ok = await selectOrgById(orgId);
    if (ok) {
      toast.success(
        t("support.impersonation.success", "Support context updated"),
      );
      setOpen(false);
      setResults([]);
      setIdentifier("");
    } else {
      toast.error(
        t(
          "support.impersonation.errors.setFailed",
          "Failed to set support organization",
        ),
      );
    }
  };

  const handleClear = async () => {
    await clearSupportOrg();
    toast.success(
      t("support.impersonation.cleared", "Support context cleared"),
    );
    setResults([]);
    setIdentifier("");
  };

  const buttonLabel = supportOrg
    ? `${t("support.impersonation.current", "Org")}: ${supportOrg.name}`
    : t("support.impersonation.select", "Select customer");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="whitespace-nowrap">
          {buttonLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {t("support.impersonation.title", "Support organization")}
          </DialogTitle>
          <DialogDescription>
            {t(
              "support.impersonation.description",
              "Search for a customer by corporate ID or code and set the active tenant context.",
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {supportOrg ? (
            <div className="rounded-lg border p-3 text-sm">
              <div className="font-semibold">{supportOrg.name}</div>
              <div className="text-muted-foreground">
                {supportOrg.registrationNumber
                  ? `${t("support.impersonation.registration", "Corporate ID")}: ${supportOrg.registrationNumber}`
                  : t(
                      "support.impersonation.noRegistration",
                      "Corporate ID not available",
                    )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2"
                onClick={handleClear}
              >
                {t("support.impersonation.clear", "Clear selection")}
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t(
                "support.impersonation.noSelection",
                "No support context selected. Choose a customer to unlock tenant data.",
              )}
            </p>
          )}
          <Separator />
          <form onSubmit={handleSearchSubmit} className="space-y-2">
            <label
              htmlFor="support-org-search"
              className="text-xs font-medium uppercase tracking-wide"
            >
              {t("support.impersonation.searchLabel", "Corporate ID or code")}
            </label>
            <div className="flex gap-2">
              <Input
                id="support-org-search"
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                placeholder={t(
                  "support.impersonation.placeholder",
                  "e.g. 7001234567",
                )}
                autoComplete="off"
              />
              <Button type="submit" disabled={searching}>
                {searching
                  ? t("support.impersonation.searching", "Searching…")
                  : t("support.impersonation.search", "Search")}
              </Button>
            </div>
          </form>
          {results.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {t("support.impersonation.results", "Matches")}
              </p>
              <div className="space-y-2 max-h-60 overflow-y-auto pe-2">
                {results.map((result) => (
                  <div
                    key={result.orgId}
                    className="rounded-lg border p-3 flex items-center justify-between gap-3 text-sm"
                  >
                    <div>
                      <div className="font-medium">{result.name}</div>
                      <div className="text-muted-foreground">
                        {result.registrationNumber
                          ? `${t("support.impersonation.registration", "Corporate ID")}: ${result.registrationNumber}`
                          : t(
                              "support.impersonation.noRegistration",
                              "Corporate ID not available",
                            )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleSelect(result.orgId)}
                      disabled={loading}
                    >
                      {t("support.impersonation.useOrg", "Use org")}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <p className="text-xs text-muted-foreground">
            {t(
              "support.impersonation.auditNotice",
              "All support impersonation actions are logged for audit purposes.",
            )}
          </p>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
