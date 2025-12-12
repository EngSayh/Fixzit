"use client";

import { useState } from "react";
import { toast } from "sonner";
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
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useFmOrgGuard } from "@/hooks/fm/useFmOrgGuard";
import { useTranslation } from "@/contexts/TranslationContext";
import { useAutoTranslator } from "@/i18n/useAutoTranslator";
import { cn } from "@/lib/utils";

const CATEGORY_OPTIONS = [
  "Electronics",
  "Home & Kitchen",
  "Industrial Supplies",
  "Automotive",
  "Services",
];

const COMPLIANCE_CHECKS = [
  {
    id: "authentic",
    label: "I confirm this product is authentic and sourced legally",
  },
  { id: "safety", label: "Safety documentation uploaded when required" },
  { id: "warranty", label: "Warranty and return policy specified" },
  { id: "media", label: "High quality media assets attached" },
];

export default function MarketplaceNewListingPage() {
  const auto = useAutoTranslator("fm.marketplace.listings.new");
  const { t } = useTranslation();
  const { hasOrgContext, guard, supportOrg } = useFmOrgGuard({
    moduleId: "marketplace",
  });
  const [formState, setFormState] = useState({
    title: "",
    sku: "",
    fsin: "",
    category: "",
    description: "",
    price: "",
    stock: "",
  });
  const [compliance, setCompliance] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);

  const updateField = (field: keyof typeof formState, value: string) =>
    setFormState((prev) => ({ ...prev, [field]: value }));

  const toggleCompliance = (id: string, value: boolean) =>
    setCompliance((prev) => ({ ...prev, [id]: value }));

  const canSubmit =
    formState.title.trim().length > 3 &&
    formState.sku.trim().length > 0 &&
    formState.price.trim().length > 0 &&
    COMPLIANCE_CHECKS.every((item) => compliance[item.id]);

  const handleSubmit = async () => {
    setSubmitting(true);
    const toastId = toast.loading(
      auto("Publishing listing...", "actions.submitting"),
    );
    try {
      const payload = {
        title: formState.title,
        sku: formState.sku,
        fsin: formState.fsin || undefined,
        category: formState.category,
        price: Number(formState.price),
        stock: Number(formState.stock || 0),
        description: formState.description,
        compliance: Object.entries(compliance)
          .filter(([, checked]) => checked)
          .map(([id]) => id),
      };

      if (!Number.isFinite(payload.price) || payload.price <= 0) {
        throw new Error(
          auto("Price must be greater than 0", "actions.priceInvalid"),
        );
      }
      if (!Number.isFinite(payload.stock) || payload.stock < 0) {
        throw new Error(
          auto("Stock must be zero or greater", "actions.stockInvalid"),
        );
      }

      const res = await fetch("/api/fm/marketplace/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body?.success) {
        throw new Error(body?.error || "Failed to publish listing");
      }

      toast.success(auto("Listing submitted for review", "actions.success"), {
        id: toastId,
      });
      setFormState({
        title: "",
        sku: "",
        fsin: "",
        category: "",
        description: "",
        price: "",
        stock: "",
      });
      setCompliance({});
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : auto("Failed to publish listing", "actions.error");
      toast.error(message, { id: toastId });
    } finally {
      setSubmitting(false);
    }
  };

  if (!hasOrgContext) {
    return guard;
  }

  return (
    <div className="space-y-6 p-6">
      <ModuleViewTabs moduleId="marketplace" />
      {supportOrg && (
        <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
          {t("fm.org.supportContext", "Support context: {{name}}", {
            name: supportOrg.name,
          })}
        </div>
      )}

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-sm uppercase tracking-wide text-muted-foreground">
            {auto("Listings", "breadcrumbs.scope")}
          </p>
          <h1 className="text-3xl font-semibold text-foreground">
            {auto("Create Marketplace Listing", "header.title")}
          </h1>
          <p className="text-muted-foreground">
            {auto(
              "Share product details, pricing, and compliance notes before publishing to buyers.",
              "header.subtitle",
            )}
          </p>
        </div>
        <Button onClick={handleSubmit} disabled={!canSubmit || submitting}>
          {submitting
            ? auto("Submitting…", "actions.submitting")
            : auto("Publish Listing", "actions.submit")}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>
              {auto("Product Information", "sections.productInfo.title")}
            </CardTitle>
            <CardDescription>
              {auto(
                "Core data shoppers see while browsing the marketplace.",
                "sections.productInfo.desc",
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="title">
                  {auto("Title", "fields.title.label")}
                </Label>
                <Input
                  id="title"
                  value={formState.title}
                  placeholder={auto(
                    "E.g., Smart HVAC Controller",
                    "fields.title.placeholder",
                  )}
                  onChange={(event) => updateField("title", event.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="sku">{auto("SKU", "fields.sku.label")}</Label>
                <Input
                  id="sku"
                  value={formState.sku}
                  placeholder="SKU-001"
                  onChange={(event) => updateField("sku", event.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <Label htmlFor="fsin">
                  {auto("FSIN (optional)", "fields.fsin.label")}
                </Label>
                <Input
                  id="fsin"
                  value={formState.fsin}
                  placeholder="FSIN-12345"
                  onChange={(event) => updateField("fsin", event.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="category">
                  {auto("Category", "fields.category.label")}
                </Label>
                <select
                  id="category"
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                  value={formState.category}
                  onChange={(event) =>
                    updateField("category", event.target.value)
                  }
                >
                  <option value="">
                    {auto("Select category", "fields.category.placeholder")}
                  </option>
                  {CATEGORY_OPTIONS.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="price">
                  {auto("Price (SAR)", "fields.price.label")}
                </Label>
                <Input
                  id="price"
                  value={formState.price}
                  onChange={(event) => updateField("price", event.target.value)}
                  placeholder="100.00"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="stock">
                  {auto("Available stock", "fields.stock.label")}
                </Label>
                <Input
                  id="stock"
                  value={formState.stock}
                  onChange={(event) => updateField("stock", event.target.value)}
                  placeholder="50"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">
                {auto("Description", "fields.description.label")}
              </Label>
              <Textarea
                id="description"
                rows={6}
                value={formState.description}
                placeholder={auto(
                  "Describe use cases, specifications, SLAs, and delivery lead time.",
                  "fields.description.placeholder",
                )}
                onChange={(event) =>
                  updateField("description", event.target.value)
                }
              />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>
                {auto("Compliance Checklist", "sections.compliance.title")}
              </CardTitle>
              <CardDescription>
                {auto(
                  "Confirm mandatory policies before publishing.",
                  "sections.compliance.desc",
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {COMPLIANCE_CHECKS.map((item) => (
                <label key={item.id} className="flex items-start gap-3 text-sm">
                  <Checkbox
                    checked={compliance[item.id] ?? false}
                    onCheckedChange={(value) =>
                      toggleCompliance(item.id, Boolean(value))
                    }
                  />
                  <span>
                    {auto(item.label, `sections.compliance.item.${item.id}`)}
                  </span>
                </label>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                {auto("Media & Assets", "sections.media.title")}
              </CardTitle>
              <CardDescription>
                {auto(
                  "Upload hero images, spec sheets, and compliance files.",
                  "sections.media.desc",
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-lg border border-dashed border-border/80 p-4 text-center">
                <p className="text-sm text-muted-foreground">
                  {auto(
                    "Drag & drop files or click to browse",
                    "sections.media.dropzone",
                  )}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {["Hero shot", "Spec sheet", "Warranty"].map((tag) => (
                  <Badge key={tag} variant="outline" className="border-dashed">
                    {tag}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{auto("Preview", "sections.preview.title")}</CardTitle>
          <CardDescription>
            {auto(
              "Live rendering of the listing card buyers will see.",
              "sections.preview.desc",
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-2xl border border-border bg-card/60 p-6 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  {formState.category ||
                    auto("Category TBD", "sections.preview.categoryFallback")}
                </p>
                <h3 className="text-2xl font-semibold text-foreground">
                  {formState.title ||
                    auto(
                      "Listing title pending",
                      "sections.preview.titleFallback",
                    )}
                </h3>
                <p className="text-muted-foreground">
                  {auto("SKU", "sections.preview.skuLabel")}:{" "}
                  {formState.sku || "--"}
                </p>
              </div>
              <Badge className={cn("text-base px-4 py-1")}>
                {formState.price
                  ? `SAR ${formState.price}`
                  : auto("Set price", "sections.preview.priceFallback")}
              </Badge>
            </div>
            <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
              {formState.description ||
                auto(
                  "Describe the product benefits, supported SLAs, and delivery promise to improve conversions.",
                  "sections.preview.descFallback",
                )}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
