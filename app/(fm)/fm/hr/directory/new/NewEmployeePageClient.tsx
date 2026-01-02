"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

import ModuleViewTabs from "@/components/fm/ModuleViewTabs";
import { useFmOrgGuard } from "@/hooks/fm/useFmOrgGuard";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { logger } from "@/lib/logger";
import type { Locale } from "@/i18n/config";
import type { TranslationDictionary } from "@/i18n/dictionaries/types";
import type {
  EmployeeDraft,
  Lookups,
  TranslateFn,
} from "./types";
import { createScopedTranslator } from "./types";
import ProfileBasicsStep from "./steps/ProfileBasicsStep";

const RoleDetailsStep = dynamic(
  () => import("./steps/RoleDetailsStep"),
  {
    loading: () => <StepSkeleton title="Loading role details..." />,
  },
);

const CompensationNotesStep = dynamic(
  () => import("./steps/CompensationNotesStep"),
  {
    loading: () => <StepSkeleton title="Loading compensation..." />,
  },
);

const EMPTY_LOOKUPS: Lookups = {
  departments: [],
  employmentTypes: [],
  workModels: [],
  compensationTypes: [],
};

const defaultDraft: EmployeeDraft = {
  firstName: "",
  lastName: "",
  workEmail: "",
  jobTitle: "",
  department: "",
  employmentType: "",
  workModel: "On-site",
  reportsTo: "",
  startDate: "",
  phone: "",
  compensationType: "Salary",
  salary: "",
  notes: "",
};

type Props = {
  locale: Locale;
  dictionary: TranslationDictionary;
};

export default function NewEmployeePageClient({
  locale,
  dictionary,
}: Props) {
  const router = useRouter();
  const { hasOrgContext, guard, supportBanner } = useFmOrgGuard({
    moduleId: "hr",
  });
  const [draft, setDraft] = useState<EmployeeDraft>(defaultDraft);
  const [lookups, setLookups] = useState<Lookups>(EMPTY_LOOKUPS);
  const [loadingLookups, setLoadingLookups] = useState(false);
  const [lookupsLoaded, setLookupsLoaded] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const t = useMemo<TranslateFn>(
    () => createScopedTranslator(dictionary),
    [dictionary],
  );

  const handleChange = useCallback(
    (field: keyof EmployeeDraft, value: string) => {
      setDraft((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  const resetForm = useCallback(() => setDraft(defaultDraft), []);

  const ensureLookups = useCallback(() => {
    if (lookupsLoaded) return;
    setLoadingLookups(true);
    import("./lookups")
      .then((mod) => {
        setLookups(mod.LOOKUPS);
        setLookupsLoaded(true);
      })
      .catch((error) => {
        logger.error("Failed to load lookups:", error);
        toast.error("Failed to load form options");
      })
      .finally(() => setLoadingLookups(false));
  }, [lookupsLoaded]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const response = await fetch("/api/hr/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...draft, locale }),
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Failed to create employee");
      }

      toast.success(
        t(
          "auto.fm.hr.directory.new.toast.success",
          "Employee added to directory",
        ),
      );
      resetForm();
      router.push("/fm/hr/directory");
    } catch (error) {
      const description = error instanceof Error ? error.message : undefined;
      toast.error(
        t(
          "auto.fm.hr.directory.new.toast.error",
          "Unable to create employee",
        ),
        { description },
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!hasOrgContext) {
    return guard;
  }

  return (
    <div className="space-y-8">
      <ModuleViewTabs moduleId="hr" />
      {supportBanner}

      <div className="space-y-2">
        <p className="text-sm text-muted-foreground uppercase tracking-wide">
          {t("auto.fm.hr.directory.new.breadcrumbs", "HR / Directory")}
        </p>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            {t(
              "auto.fm.hr.directory.new.header.title",
              "Add employee to directory",
            )}
          </h1>
          <p className="text-muted-foreground">
            {t(
              "auto.fm.hr.directory.new.header.subtitle",
              "Capture onboarding details, reporting lines, and compensation visibility in one flow.",
            )}
          </p>
        </div>
      </div>

      <form className="space-y-6" onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>
              {t(
                "auto.fm.hr.directory.new.sections.profile.title",
                "Profile basics",
              )}
            </CardTitle>
            <CardDescription>
              {t(
                "auto.fm.hr.directory.new.sections.profile.description",
                "Used for the employee directory, approvals, and payroll integrations.",
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProfileBasicsStep
              t={t}
              draft={draft}
              onChange={handleChange}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              {t(
                "auto.fm.hr.directory.new.sections.role.title",
                "Role details",
              )}
            </CardTitle>
            <CardDescription>
              {t(
                "auto.fm.hr.directory.new.sections.role.description",
                "Appears in dashboards, workflows, and approval routing.",
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RoleDetailsStep
              t={t}
              draft={draft}
              lookups={lookups}
              loading={loadingLookups}
              onChange={handleChange}
              onOpenLookups={ensureLookups}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              {t(
                "auto.fm.hr.directory.new.sections.compensation.title",
                "Compensation & notes",
              )}
            </CardTitle>
            <CardDescription>
              {t(
                "auto.fm.hr.directory.new.sections.compensation.description",
                "This data helps payroll and finance teams forecast expenses and approvals.",
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CompensationNotesStep
              t={t}
              draft={draft}
              lookups={lookups}
              loading={loadingLookups}
              onChange={handleChange}
              onOpenLookups={ensureLookups}
            />
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/fm/hr/directory")}
            disabled={submitting}
            aria-label={t("auto.fm.hr.directory.new.actions.cancelAria", "Cancel and go back")}
          >
            {t("auto.fm.hr.directory.new.actions.cancel", "Cancel")}
          </Button>
          <Button type="submit" disabled={submitting} aria-label={t("auto.fm.hr.directory.new.actions.submitAria", "Create employee")}>
            {submitting
              ? t("auto.fm.hr.directory.new.actions.saving", "Saving...")
              : t("auto.fm.hr.directory.new.actions.submit", "Create employee")}
          </Button>
        </div>
      </form>
    </div>
  );
}

function StepSkeleton({ title }: { title: string }) {
  return (
    <div className="space-y-3">
      <div className="h-5 w-48 rounded-md bg-muted" aria-hidden />
      <div className="space-y-2">
        <div className="h-4 w-full rounded-md bg-muted/60" aria-hidden />
        <div className="h-4 w-5/6 rounded-md bg-muted/40" aria-hidden />
      </div>
      <p className="text-sm text-muted-foreground">{title}</p>
    </div>
  );
}
