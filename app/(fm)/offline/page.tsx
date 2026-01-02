"use client";

import Link from "next/link";
import { WifiOff, RefreshCw } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/contexts/TranslationContext";
import { useCurrency } from "@/contexts/CurrencyContext";

export default function OfflinePage() {
  const { t, language, isRTL } = useTranslation();
  const { currency, preferenceSource } = useCurrency();

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-6 py-12">
      <Card className="w-full max-w-2xl">
        <CardHeader className="flex flex-row items-center gap-4">
          <div className="rounded-full bg-muted p-3">
            <WifiOff className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <CardTitle>
              {t("offline.title", "You are offline")}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {t(
                "offline.subtitle",
                "Some data may be unavailable until your connection is restored.",
              )}
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            <p>
              {t(
                "offline.hint",
                "We will keep your language and currency preferences available while you work.",
              )}
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <div className="rounded-md bg-muted/50 px-3 py-2">
                <div className="text-xs uppercase text-muted-foreground">
                  {t("offline.language", "Language")}
                </div>
                <div className="text-sm font-medium">
                  {language?.toUpperCase?.() ?? "AR"}
                </div>
              </div>
              <div className="rounded-md bg-muted/50 px-3 py-2">
                <div className="text-xs uppercase text-muted-foreground">
                  {t("offline.currency", "Currency")}
                </div>
                <div className="text-sm font-medium">{currency}</div>
                <div className="text-xs text-muted-foreground">
                  {t("offline.source", "Source")}: {preferenceSource}
                </div>
              </div>
            </div>
          </div>

          <div
            className={`flex flex-wrap gap-3 ${
              isRTL ? "justify-end" : "justify-start"
            }`}
          >
            <Button onClick={() => window.location.reload()} aria-label={t("offline.retryAria", "Retry network connection")}>
              <RefreshCw className="me-2 h-4 w-4" />
              {t("offline.retry", "Retry Connection")}
            </Button>
            <Button variant="outline" asChild aria-label={t("offline.backAria", "Navigate back to dashboard")}>
              <Link href="/fm">
                {t("offline.back", "Back to dashboard")}
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
