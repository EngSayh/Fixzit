"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import ModuleViewTabs from "@/components/fm/ModuleViewTabs";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useAutoTranslator } from "@/i18n/useAutoTranslator";
import { useFmOrgGuard } from "@/hooks/fm/useFmOrgGuard";

type ModuleOption = (typeof MODULE_OPTIONS)[number];
type PriorityOption = (typeof PRIORITY_OPTIONS)[number];

type TicketFormState = {
  requesterName: string;
  requesterEmail: string;
  requesterPhone: string;
  module: ModuleOption | "";
  priority: PriorityOption;
  subject: string;
  summary: string;
  steps: string;
  environment: string;
  ccList: string;
  notifyCustomer: boolean;
  shareStatusPage: boolean;
};

const MODULE_OPTIONS = [
  "workOrders",
  "properties",
  "finance",
  "marketplace",
  "vendors",
  "support",
  "other",
] as const;
const MODULE_LABELS: Record<(typeof MODULE_OPTIONS)[number], string> = {
  workOrders: "Work Orders",
  properties: "Properties",
  finance: "Finance",
  marketplace: "Marketplace",
  vendors: "Vendors",
  support: "Support",
  other: "Other",
};

const PRIORITY_OPTIONS = ["low", "medium", "high", "urgent"] as const;
const PRIORITY_LABELS: Record<(typeof PRIORITY_OPTIONS)[number], string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

export default function NewSupportTicketPage() {
  const auto = useAutoTranslator("fm.support.newTicket");
  const { data: session } = useSession();
  const { hasOrgContext, guard, orgId, supportOrg } = useFmOrgGuard({
    moduleId: "support",
  });
  const [form, setForm] = useState<TicketFormState>({
    requesterName: "",
    requesterEmail: "",
    requesterPhone: "",
    module: "",
    priority: "medium",
    subject: "",
    summary: "",
    steps: "",
    environment: "",
    ccList: "",
    notifyCustomer: true,
    shareStatusPage: false,
  });
  const [submitting, setSubmitting] = useState(false);

  const updateField = <K extends keyof TicketFormState>(
    key: K,
    value: TicketFormState[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const canSubmit =
    form.requesterName.trim().length > 0 &&
    form.requesterEmail.trim().length > 0 &&
    form.module.trim().length > 0 &&
    form.subject.trim().length > 4 &&
    form.summary.trim().length > 20;

  const handleSubmit = async () => {
    if (!orgId) {
      toast.error(
        auto("Select a customer organization first.", "errors.noOrg"),
      );
      return;
    }
    setSubmitting(true);
    const toastId = toast.loading(
      auto("Submitting ticket…", "toast.submitting"),
    );
    try {
      const res = await fetch("/api/fm/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId,
          ...form,
          ccList: form.ccList,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body?.success) {
        throw new Error(body?.error || "Failed to submit ticket");
      }
      toast.success(auto("Ticket submitted successfully", "toast.success"), {
        id: toastId,
      });
      setForm((prev) => ({
        ...prev,
        subject: "",
        summary: "",
        steps: "",
        ccList: "",
      }));
    } catch (_error) {
      toast.error(
        auto("Failed to submit ticket. Please try again.", "toast.error"),
        { id: toastId },
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!session) {
    return (
      <div className="space-y-6 p-6">
        <ModuleViewTabs moduleId="support" />
      </div>
    );
  }

  if (!hasOrgContext || !orgId) {
    return guard;
  }

  return (
    <div className="space-y-6 p-6">
      <ModuleViewTabs moduleId="support" />
      {supportOrg && (
        <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
          {auto("Support context: {{name}}", "support.activeOrg", {
            name: supportOrg.name,
          })}
        </div>
      )}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {auto("Tickets", "breadcrumbs.scope")}
          </p>
          <h1 className="text-3xl font-semibold text-foreground">
            {auto("Create support ticket", "header.title")}
          </h1>
          <p className="text-muted-foreground">
            {auto(
              "Share customer impact, reproduction steps, and attachments for the L2 team.",
              "header.subtitle",
            )}
          </p>
        </div>
        <Button onClick={handleSubmit} disabled={!canSubmit || submitting} aria-label={auto("Submit support ticket", "actions.submitAria")}>
          {submitting
            ? auto("Submitting…", "actions.submitting")
            : auto("Submit ticket", "actions.submit")}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>
              {auto("Requester & contact", "sections.requester.title")}
            </CardTitle>
            <CardDescription>
              {auto(
                "Who raised the issue and how the team can reach them.",
                "sections.requester.desc",
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <Label>{auto("Full name", "fields.requesterName.label")}</Label>
                <Input
                  value={form.requesterName}
                  placeholder={auto(
                    "e.g., Layla Al-Harthy",
                    "fields.requesterName.placeholder",
                  )}
                  onChange={(event) =>
                    updateField("requesterName", event.target.value)
                  }
                />
              </div>
              <div>
                <Label>
                  {auto("Work email", "fields.requesterEmail.label")}
                </Label>
                <Input
                  type="email"
                  value={form.requesterEmail}
                  placeholder="name@company.com"
                  onChange={(event) =>
                    updateField("requesterEmail", event.target.value)
                  }
                />
              </div>
              <div>
                <Label>
                  {auto("Phone / extension", "fields.requesterPhone.label")}
                </Label>
                <Input
                  value={form.requesterPhone}
                  placeholder="+966 50 555 5555"
                  onChange={(event) =>
                    updateField("requesterPhone", event.target.value)
                  }
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>{auto("Module / area", "fields.module.label")}</Label>
                <Select
                  value={form.module}
                  onValueChange={(value: string) =>
                    updateField(
                      "module",
                      value === "" ? "" : (value as ModuleOption),
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={auto(
                        "Select a module",
                        "fields.module.placeholder",
                      )}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {MODULE_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {auto(MODULE_LABELS[option], `modules.${option}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{auto("Priority", "fields.priority.label")}</Label>
                <Select
                  value={form.priority}
                  onValueChange={(value: string) =>
                    updateField("priority", value as PriorityOption)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITY_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {auto(PRIORITY_LABELS[option], `priorities.${option}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              {auto("Communication", "sections.communication.title")}
            </CardTitle>
            <CardDescription>
              {auto(
                "Control who gets notified when the ticket updates.",
                "sections.communication.desc",
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>
                {auto("CC teammates (comma separated)", "fields.cc.label")}
              </Label>
              <Input
                value={form.ccList}
                placeholder="ops@company.com, lead@company.com"
                onChange={(event) => updateField("ccList", event.target.value)}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/70 px-3 py-2">
              <div>
                <p className="font-medium text-sm">
                  {auto(
                    "Notify customer contact",
                    "fields.notifyCustomer.label",
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  {auto(
                    "Send status updates to requester automatically.",
                    "fields.notifyCustomer.desc",
                  )}
                </p>
              </div>
              <Switch
                checked={form.notifyCustomer}
                onCheckedChange={(value) =>
                  updateField("notifyCustomer", Boolean(value))
                }
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/70 px-3 py-2">
              <div>
                <p className="font-medium text-sm">
                  {auto("Share on status page", "fields.shareStatus.label")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {auto(
                    "Create a status entry for proactive updates.",
                    "fields.shareStatus.desc",
                  )}
                </p>
              </div>
              <Switch
                checked={form.shareStatusPage}
                onCheckedChange={(value) =>
                  updateField("shareStatusPage", Boolean(value))
                }
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{auto("Issue details", "sections.issue.title")}</CardTitle>
          <CardDescription>
            {auto(
              "Describe the problem, reproduction steps, and environment.",
              "sections.issue.desc",
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>{auto("Subject", "fields.subject.label")}</Label>
              <Input
                value={form.subject}
                placeholder={auto(
                  "e.g., Work order approvals stuck in queue",
                  "fields.subject.placeholder",
                )}
                onChange={(event) => updateField("subject", event.target.value)}
              />
            </div>
            <div>
              <Label>{auto("Environment", "fields.environment.label")}</Label>
              <Input
                value={form.environment}
                placeholder={auto(
                  "Production, KSA-Cluster-1",
                  "fields.environment.placeholder",
                )}
                onChange={(event) =>
                  updateField("environment", event.target.value)
                }
              />
            </div>
          </div>
          <div>
            <Label>{auto("Summary", "fields.summary.label")}</Label>
            <Textarea
              rows={5}
              value={form.summary}
              placeholder={auto(
                "What happened, who is blocked, and any relevant metrics.",
                "fields.summary.placeholder",
              )}
              onChange={(event) => updateField("summary", event.target.value)}
            />
          </div>
          <div>
            <Label>{auto("Steps to reproduce", "fields.steps.label")}</Label>
            <Textarea
              rows={4}
              value={form.steps}
              placeholder={auto(
                "1) Go to… 2) Click… 3) Observe error…",
                "fields.steps.placeholder",
              )}
              onChange={(event) => updateField("steps", event.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>
              {auto("Attachments & evidence", "sections.attachments.title")}
            </CardTitle>
            <CardDescription>
              {auto(
                "Link logs, console captures, or HAR files.",
                "sections.attachments.desc",
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg border border-dashed border-border/70 p-6 text-center">
              <p className="text-sm text-muted-foreground">
                {auto(
                  "Drag files here or click to browse",
                  "sections.attachments.hint",
                )}
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {["Screenshot.png", "Logs.txt"].map((asset) => (
                <div
                  key={asset}
                  className="rounded-lg border border-border/70 bg-muted/40 px-3 py-2 text-sm"
                >
                  {asset}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              {auto("Summary preview", "sections.preview.title")}
            </CardTitle>
            <CardDescription>
              {auto(
                "Internal note generated from your inputs.",
                "sections.preview.desc",
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              <span className="font-semibold text-foreground">
                {auto("Subject:", "sections.preview.subject")}
              </span>{" "}
              {form.subject ||
                auto("Ticket subject pending", "sections.preview.emptySubject")}
            </p>
            <p>
              <span className="font-semibold text-foreground">
                {auto("Module:", "sections.preview.module")}
              </span>{" "}
              {form.module
                ? auto(MODULE_LABELS[form.module], `modules.${form.module}`)
                : "--"}
            </p>
            <p>
              <span className="font-semibold text-foreground">
                {auto("Priority:", "sections.preview.priority")}
              </span>{" "}
              {auto(
                PRIORITY_LABELS[form.priority],
                `priorities.${form.priority}`,
              )}
            </p>
            <p>
              {form.summary
                ? form.summary
                : auto(
                    "Summary content will appear here once you start typing.",
                    "sections.preview.emptySummary",
                  )}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
