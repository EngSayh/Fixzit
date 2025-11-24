"use client";

import ModuleViewTabs from "@/components/fm/ModuleViewTabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAutoTranslator } from "@/i18n/useAutoTranslator";
import { ClipboardCheck, Compass, Upload } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useFmOrgGuard } from "@/components/fm/useFmOrgGuard";

export default function CreatePropertyUnitPage() {
  const auto = useAutoTranslator("fm.properties.units.new");
  const { hasOrgContext, guard, orgId, supportOrg } = useFmOrgGuard({
    moduleId: "properties",
  });
  const [form, setForm] = useState({
    name: "",
    type: "",
    size: "",
    rent: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.name || !form.type) {
      toast.error(auto("Please complete required fields.", "form.validation"));
      return;
    }

    setSubmitting(true);
    try {
      const numericSize = form.size ? Number(form.size) : undefined;
      const numericRent = form.rent ? Number(form.rent) : undefined;
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        type: form.type.toUpperCase(),
        description: form.notes.trim() || undefined,
        organizationId: orgId ?? undefined,
        address: form.name ? { street: form.name.trim() } : undefined,
        details: numericSize ? { totalArea: numericSize } : undefined,
        financials: numericRent ? { annualRent: numericRent } : undefined,
        ownership: supportOrg
          ? {
              type: "OWNED",
              owner: {
                name: supportOrg.name,
                orgId: supportOrg.orgId,
              },
            }
          : undefined,
        tags: ["unit"],
      };
      Object.keys(payload).forEach((key) => {
        if (payload[key] === undefined || payload[key] === null) {
          delete payload[key];
        }
      });
      const response = await fetch("/api/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error ?? "Failed to create unit");
      }
      toast.success(auto("Unit published successfully.", "next.success"));
      setForm({ name: "", type: "", size: "", rent: "", notes: "" });
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

      <header className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {auto("Onboarding", "header.kicker")}
        </p>
        <h1 className="text-3xl font-semibold">
          {auto("Create a new unit", "header.title")}
        </h1>
        <p className="text-muted-foreground">
          {auto(
            "Capture lease + FM metadata so downstream teams can work faster.",
            "header.subtitle",
          )}
        </p>
      </header>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>{auto("Unit profile", "form.title")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">{auto("Unit name", "form.name")}</Label>
                <Input
                  id="name"
                  placeholder={auto(
                    "HQ Tower · Floor 18",
                    "form.name.placeholder",
                  )}
                  value={form.name}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, name: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">{auto("Type", "form.type")}</Label>
                <Input
                  id="type"
                  placeholder={auto(
                    "Office / Warehouse / Retail…",
                    "form.type.placeholder",
                  )}
                  value={form.type}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, type: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="size">{auto("Area (sqm)", "form.size")}</Label>
                <Input
                  id="size"
                  type="number"
                  placeholder="1345"
                  value={form.size}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, size: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rent">
                  {auto("Rent (annual SAR)", "form.rent")}
                </Label>
                <Input
                  id="rent"
                  type="number"
                  placeholder="320000"
                  value={form.rent}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, rent: event.target.value }))
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">
                {auto("Notes for leasing / FM teams", "form.notes")}
              </Label>
              <Textarea
                id="notes"
                rows={4}
                placeholder={auto(
                  "Include special access instructions…",
                  "form.notes.placeholder",
                )}
                value={form.notes}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, notes: event.target.value }))
                }
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <Button type="button" variant="outline">
                <Upload className="me-2 h-4 w-4" />
                {auto("Attach floor plan", "form.attachFloorPlan")}
              </Button>
              <Button type="button" variant="outline">
                <Compass className="me-2 h-4 w-4" />
                {auto("Pin location", "form.pinLocation")}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6 border-dashed border-border/70">
          <CardHeader>
            <CardTitle>{auto("Next steps", "next.title")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setForm({ name: "", type: "", size: "", rent: "", notes: "" })
              }
            >
              {auto("Clear form", "next.clear")}
            </Button>
            <Button type="submit" disabled={submitting}>
              <ClipboardCheck className="me-2 h-4 w-4" />
              {submitting
                ? auto("Publishing...", "next.submitting")
                : auto("Publish unit", "next.publish")}
            </Button>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
