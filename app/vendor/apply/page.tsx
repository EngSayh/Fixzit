"use client";

import { useState } from "react";
import { Building2, Mail, Phone, FileText, Check, ArrowLeft } from "@/components/ui/icons";
import { useTranslation } from "@/contexts/TranslationContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";

type VendorForm = {
  company: string;
  contactName: string;
  email: string;
  phone: string;
  services: string;
  notes: string;
};

export default function VendorApplyPage() {
  const { t } = useTranslation();
  const [form, setForm] = useState<VendorForm>({
    company: "",
    contactName: "",
    email: "",
    phone: "",
    services: "",
    notes: "",
  });
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const update = (key: keyof VendorForm, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("submitting");
    setError(null);
    try {
      const res = await fetch("/api/vendor/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Application failed");
      }
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Application failed");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ArrowLeft className="h-4 w-4" />
          <Link href="/" className="hover:underline">
            {t("vendor.apply.backHome", "Back to Home")}
          </Link>
        </div>
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
            {t("vendor.apply.tagline", "Marketplace Onboarding")}
          </p>
          <h1 className="text-3xl font-semibold">
            {t("vendor.apply.title", "Apply to become a Fixzit Souq vendor")}
          </h1>
          <p className="text-muted-foreground">
            {t(
              "vendor.apply.subtitle",
              "Submit your business details so we can review and invite you to the marketplace.",
            )}
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  {t("vendor.apply.company", "Company name")}
                </label>
                <Input
                  required
                  value={form.company}
                  onChange={(e) => update("company", e.target.value)}
                  placeholder="Al-Namaa Facilities"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  {t("vendor.apply.email", "Work email")}
                </label>
                <Input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                  placeholder="ops@company.com"
                />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  {t("vendor.apply.contact", "Primary contact")}
                </label>
                <Input
                  required
                  value={form.contactName}
                  onChange={(e) => update("contactName", e.target.value)}
                  placeholder="Fatimah Al-Saadi"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  {t("vendor.apply.phone", "Phone")}
                </label>
                <Input
                  value={form.phone}
                  onChange={(e) => update("phone", e.target.value)}
                  placeholder="+966 5x xxx xxxx"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t("vendor.apply.services", "Services offered")}
              </label>
              <Textarea
                value={form.services}
                onChange={(e) => update("services", e.target.value)}
                placeholder={t(
                  "vendor.apply.servicesPlaceholder",
                  "E.g., HVAC, electrical, cleaning, elevators",
                )}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t("vendor.apply.notes", "Notes (optional)")}
              </label>
              <Textarea
                value={form.notes}
                onChange={(e) => update("notes", e.target.value)}
                placeholder={t(
                  "vendor.apply.notesPlaceholder",
                  "Share anything else we should know",
                )}
                rows={3}
              />
            </div>
            <div className="flex items-center gap-3">
              <Button type="submit" disabled={status === "submitting"}>
                {status === "submitting"
                  ? t("vendor.apply.submitting", "Submitting...")
                  : t("vendor.apply.submit", "Submit application")}
              </Button>
              {status === "success" && (
                <span className="text-sm text-success flex items-center gap-1">
                  <Check className="h-4 w-4" />
                  {t("vendor.apply.success", "Received! We will review and contact you.")}
                </span>
              )}
              {status === "error" && (
                <span className="text-sm text-destructive">
                  {error ||
                    t(
                      "vendor.apply.error",
                      "Could not submit application. Please try again.",
                    )}
                </span>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
