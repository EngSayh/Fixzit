"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowLeft } from "lucide-react";

import ModuleViewTabs from "@/components/fm/ModuleViewTabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CardGridSkeleton } from "@/components/skeletons";
import { useTranslation } from "@/contexts/TranslationContext";
import { CreatePropertyForm } from "../page";
import { useFmOrgGuard } from "@/hooks/fm/useFmOrgGuard";

export default function NewPropertyPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { data: session } = useSession();
  const { hasOrgContext, guard, supportBanner, orgId } = useFmOrgGuard({
    moduleId: "properties",
  });

  if (!session) {
    return <CardGridSkeleton count={4} />;
  }

  if (!hasOrgContext || !orgId) {
    return guard;
  }

  return (
    <div className="space-y-6">
      <ModuleViewTabs moduleId="properties" />
      {supportBanner}

      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {t("fm.properties.new.kicker", "Properties · Creation workspace")}
          </p>
          <h1 className="text-3xl font-semibold text-foreground">
            {t("fm.properties.new.title", "Register a new property")}
          </h1>
          <p className="text-muted-foreground">
            {t(
              "fm.properties.new.subtitle",
              "Enrich inventory details, compliance flags, and portfolio metadata before publishing.",
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => router.push("/fm/properties")}>
            <ArrowLeft className="w-4 h-4 me-2" />
            {t("fm.properties.new.back", "Back to portfolio")}
          </Button>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>
            {t("fm.properties.new.sectionTitle", "Property details")}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {t(
              "fm.properties.new.sectionDescription",
              "Captured data is shared with finance, leasing, and maintenance workflows automatically.",
            )}
          </p>
        </CardHeader>
        <CardContent>
          <CreatePropertyForm
            orgId={orgId}
            onCreated={() => {
              router.push("/fm/properties");
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
