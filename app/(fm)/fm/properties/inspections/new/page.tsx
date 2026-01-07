"use client";

import ModuleViewTabs from "@/components/fm/ModuleViewTabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectItem,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAutoTranslator } from "@/i18n/useAutoTranslator";
import { ClipboardCheck, MapPinned, Users } from "@/components/ui/icons";
import { useState } from "react";
import { toast } from "sonner";
import { useFmOrgGuard } from "@/hooks/fm/useFmOrgGuard";

export default function CreateInspectionPage() {
  const { hasOrgContext, guard, supportBanner, orgId } = useFmOrgGuard({
    moduleId: "properties",
  });
  const auto = useAutoTranslator("fm.properties.inspections.new");
  const [form, setForm] = useState({
    property: "",
    type: "",
    window: "",
    duration: "",
    scope: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.property || !form.type || !form.window) {
      toast.error(
        auto("Please complete the required fields.", "form.validation"),
      );
      return;
    }
    setSubmitting(true);
    try {
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };
      if (orgId) {
        headers["x-tenant-id"] = orgId;
      }

      const response = await fetch("/api/properties", {
        method: "POST",
        headers,
        body: JSON.stringify({
          orgId,
          name: form.property,
          type: "COMMERCIAL",
          subtype: form.type,
          description: form.scope,
          address: {
            street: form.property,
            city: "Riyadh",
            region: "Riyadh",
            coordinates: { lat: 24.7136, lng: 46.6753 },
          },
          tags: ["inspection", form.type],
        }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error ?? "Failed to schedule inspection");
      }
      toast.success(auto("Inspection request captured.", "next.success"));
      setForm({ property: "", type: "", window: "", duration: "", scope: "" });
    } catch (_error) {
      toast.error(_error instanceof Error ? _error.message : "Request failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (!hasOrgContext || !orgId) {
    return guard;
  }

  return (
    <div className="space-y-6">
      <ModuleViewTabs moduleId="properties" />
      {supportBanner}

      <header className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {auto("Scheduler", "header.kicker")}
        </p>
        <h1 className="text-3xl font-semibold">
          {auto("Schedule a new inspection", "header.title")}
        </h1>
        <p className="text-muted-foreground">
          {auto(
            "Capture the basic scope, assets, and team members before dispatching to vendors.",
            "header.subtitle",
          )}
        </p>
      </header>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>{auto("Inspection details", "form.title")}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {auto(
                "This data feeds the dispatch API and work order templates.",
                "form.subtitle",
              )}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="property">
                  {auto("Property / asset", "form.property")}
                </Label>
                <Input
                  id="property"
                  placeholder={auto(
                    "Olaya Tower 2 - PH Level",
                    "form.property.placeholder",
                  )}
                  value={form.property}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      property: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">
                  {auto("Inspection type", "form.type")}
                </Label>
                <Select
                  value={form.type}
                  onValueChange={(value) =>
                    setForm((prev) => ({ ...prev, type: value }))
                  }
                  placeholder={auto("Select type", "form.type.placeholder")}
                  className="w-full bg-muted border-input text-foreground"
                >
                  <SelectItem value="handover">
                    {auto("Handover", "form.type.handover")}
                  </SelectItem>
                  <SelectItem value="preventive">
                    {auto("Preventive", "form.type.preventive")}
                  </SelectItem>
                  <SelectItem value="corrective">
                    {auto("Corrective", "form.type.corrective")}
                  </SelectItem>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="window">
                  {auto("Preferred window", "form.window")}
                </Label>
                <Input
                  id="window"
                  type="date"
                  value={form.window}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, window: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="duration">
                  {auto("Duration (hours)", "form.duration")}
                </Label>
                <Input
                  id="duration"
                  type="number"
                  placeholder="4"
                  value={form.duration}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      duration: event.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="scope">
                {auto("Scope / notes", "form.scope")}
              </Label>
              <Textarea
                id="scope"
                rows={4}
                placeholder={auto(
                  "Inspect all HVAC equipment…",
                  "form.scope.placeholder",
                )}
                value={form.scope}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, scope: event.target.value }))
                }
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" title={auto("Add location pin", "form.addLocation")} aria-label={auto("Add location pin", "form.addLocationAria")}>
                <MapPinned className="me-2 h-4 w-4" />
                {auto("Add location pin", "form.addLocation")}
              </Button>
              <Button variant="outline" title={auto("Assign internal reviewer", "form.assignReviewer")} aria-label={auto("Assign internal reviewer", "form.assignReviewerAria")}>
                <Users className="me-2 h-4 w-4" />
                {auto("Assign internal reviewer", "form.assignReviewer")}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6 border-dashed border-border/70">
          <CardHeader>
            <CardTitle>{auto("Next steps", "next.title")}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {auto(
                "Save to draft or push directly to /api/properties.",
                "next.subtitle",
              )}
            </p>
          </CardHeader>
          <CardContent className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setForm({
                  property: "",
                  type: "",
                  window: "",
                  duration: "",
                  scope: "",
                })
              }
              title={auto("Reset form", "next.reset")}
              aria-label={auto("Reset form", "next.resetAria")}
            >
              {auto("Reset form", "next.reset")}
            </Button>
            <Button type="submit" disabled={submitting} title={auto("Create inspection", "next.create")} aria-label={auto("Create inspection", "next.createAria")}>
              <ClipboardCheck className="me-2 h-4 w-4" />
              {submitting
                ? auto("Submitting...", "next.submitting")
                : auto("Create inspection", "next.create")}
            </Button>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
