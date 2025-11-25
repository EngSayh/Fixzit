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
import { Separator } from "@/components/ui/separator";
import { useFmOrgGuard } from "@/components/fm/useFmOrgGuard";
import { useTranslation } from "@/contexts/TranslationContext";
import { useAutoTranslator } from "@/i18n/useAutoTranslator";

type Contact = {
  id: string;
  name: string;
  title: string;
  email: string;
  phone: string;
};

export default function MarketplaceNewVendorPage() {
  const auto = useAutoTranslator("fm.marketplace.vendors.new");
  const { t } = useTranslation();
  const { hasOrgContext, guard, orgId, supportOrg } = useFmOrgGuard({
    moduleId: "marketplace",
  });
  const [companyName, setCompanyName] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [website, setWebsite] = useState("");
  const [categories, setCategories] = useState("");
  const [coverageAreas, setCoverageAreas] = useState("");
  const [deliverySla, setDeliverySla] = useState("");
  const [notes, setNotes] = useState("");
  const [contacts, setContacts] = useState<Contact[]>([
    {
      id: crypto.randomUUID(),
      name: "",
      title: "",
      email: "",
      phone: "",
    },
  ]);
  const [submitting, setSubmitting] = useState(false);

  const addContact = () =>
    setContacts((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name: "", title: "", email: "", phone: "" },
    ]);

  const updateContact = (id: string, patch: Partial<Contact>) =>
    setContacts((prev) =>
      prev.map((contact) =>
        contact.id === id ? { ...contact, ...patch } : contact,
      ),
    );

  const removeContact = (id: string) =>
    setContacts((prev) => prev.filter((contact) => contact.id !== id));

  const canSubmit =
    companyName.trim().length > 2 &&
    registrationNumber.trim().length > 2 &&
    contacts.every(
      (contact) =>
        contact.name.trim().length >= 2 && contact.email.includes("@"),
    );

  const submit = async () => {
    setSubmitting(true);
    const toastId = toast.loading(
      auto("Submitting vendor...", "actions.submitting"),
    );
    try {
      const res = await fetch("/api/fm/marketplace/vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId,
          companyName,
          registrationNumber,
          website,
          categories,
          coverageAreas,
          deliverySla,
          notes,
          contacts,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body?.success) {
        throw new Error(body?.error || "Failed to create vendor");
      }
      toast.success(auto("Vendor submitted for review", "actions.success"), {
        id: toastId,
      });
      setCompanyName("");
      setRegistrationNumber("");
      setWebsite("");
      setCategories("");
      setCoverageAreas("");
      setDeliverySla("");
      setNotes("");
      setContacts([
        { id: crypto.randomUUID(), name: "", title: "", email: "", phone: "" },
      ]);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : auto("Failed to create vendor", "actions.error");
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
            {auto("Vendors", "breadcrumbs.scope")}
          </p>
          <h1 className="text-3xl font-semibold text-foreground">
            {auto("Onboard New Vendor", "header.title")}
          </h1>
          <p className="text-muted-foreground">
            {auto(
              "Capture compliance documents, delivery commitments, and key contacts.",
              "header.subtitle",
            )}
          </p>
        </div>
        <Button onClick={submit} disabled={!canSubmit || submitting}>
          {submitting
            ? auto("Saving…", "actions.submitting")
            : auto("Create vendor profile", "actions.submit")}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>
              {auto("Company profile", "sections.profile.title")}
            </CardTitle>
            <CardDescription>
              {auto(
                "High-level details for procurement and compliance review.",
                "sections.profile.desc",
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>{auto("Legal name", "fields.companyName.label")}</Label>
              <Input
                value={companyName}
                placeholder={auto(
                  "e.g., Riyadh HVAC Solutions",
                  "fields.companyName.placeholder",
                )}
                onChange={(event) => setCompanyName(event.target.value)}
              />
            </div>
            <div>
              <Label>
                {auto(
                  "Commercial registration / CR",
                  "fields.registration.label",
                )}
              </Label>
              <Input
                value={registrationNumber}
                placeholder="CR-123456789"
                onChange={(event) => setRegistrationNumber(event.target.value)}
              />
            </div>
            <div>
              <Label>{auto("Website", "fields.website.label")}</Label>
              <Input
                value={website}
                placeholder="https://"
                onChange={(event) => setWebsite(event.target.value)}
              />
            </div>
            <div>
              <Label>
                {auto("Offering categories", "fields.categories.label")}
              </Label>
              <Textarea
                rows={3}
                value={categories}
                placeholder={auto(
                  "HVAC, BMS, IoT sensors…",
                  "fields.categories.placeholder",
                )}
                onChange={(event) => setCategories(event.target.value)}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>{auto("Coverage areas", "fields.coverage.label")}</Label>
                <Textarea
                  rows={3}
                  value={coverageAreas}
                  placeholder={auto(
                    "Cities, regions, remote support coverage…",
                    "fields.coverage.placeholder",
                  )}
                  onChange={(event) => setCoverageAreas(event.target.value)}
                />
              </div>
              <div>
                <Label>
                  {auto("Standard delivery SLA", "fields.deliverySla.label")}
                </Label>
                <Textarea
                  rows={3}
                  value={deliverySla}
                  placeholder={auto(
                    "E.g., 48h dispatch, on-site within 5 days",
                    "fields.deliverySla.placeholder",
                  )}
                  onChange={(event) => setDeliverySla(event.target.value)}
                />
              </div>
            </div>
            <div>
              <Label>{auto("Notes for approvers", "fields.notes.label")}</Label>
              <Textarea
                rows={4}
                value={notes}
                placeholder={auto(
                  "Add risk notes, SLA commitments, or commercial remarks.",
                  "fields.notes.placeholder",
                )}
                onChange={(event) => setNotes(event.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              {auto("Key contacts", "sections.contacts.title")}
            </CardTitle>
            <CardDescription>
              {auto(
                "Primary account + finance contacts to route requests.",
                "sections.contacts.desc",
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {contacts.map((contact, index) => (
              <div
                key={contact.id}
                className="space-y-3 rounded-xl border border-border/70 p-4"
              >
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>
                    {auto("Contact", "sections.contacts.contactLabel")} #
                    {index + 1}
                  </span>
                  {contacts.length > 1 && (
                    <button
                      className="text-destructive text-xs font-medium"
                      onClick={() => removeContact(contact.id)}
                    >
                      {auto("Remove", "sections.contacts.remove")}
                    </button>
                  )}
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <Label>{auto("Full name", "fields.contact.name")}</Label>
                    <Input
                      value={contact.name}
                      onChange={(event) =>
                        updateContact(contact.id, { name: event.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label>
                      {auto("Title / role", "fields.contact.title")}
                    </Label>
                    <Input
                      value={contact.title}
                      onChange={(event) =>
                        updateContact(contact.id, { title: event.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label>{auto("Email", "fields.contact.email")}</Label>
                    <Input
                      type="email"
                      value={contact.email}
                      onChange={(event) =>
                        updateContact(contact.id, { email: event.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label>{auto("Phone", "fields.contact.phone")}</Label>
                    <Input
                      value={contact.phone}
                      onChange={(event) =>
                        updateContact(contact.id, { phone: event.target.value })
                      }
                    />
                  </div>
                </div>
              </div>
            ))}

            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {auto(
                  "Need escalation contacts? Add another contact card.",
                  "sections.contacts.addHint",
                )}
              </p>
              <Button variant="secondary" onClick={addContact}>
                {auto("Add contact", "sections.contacts.add")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {auto("Documents & attestations", "sections.documents.title")}
          </CardTitle>
          <CardDescription>
            {auto(
              "Upload CR, tax certificates, insurance, or NDA packages.",
              "sections.documents.desc",
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-xl border border-dashed border-border/70 p-6 text-center">
            <p className="text-sm text-muted-foreground">
              {auto(
                "Drop files here or click to browse",
                "sections.documents.dropzone",
              )}
            </p>
          </div>
          <Separator />
          <div className="grid gap-4 md:grid-cols-3">
            {[
              "Commercial registration",
              "Tax certificate",
              "Insurance certificate",
            ].map((label) => (
              <div
                key={label}
                className="rounded-lg bg-muted/30 border border-border/50 p-4 text-sm"
              >
                <p className="font-medium">{label}</p>
                <p className="text-muted-foreground">
                  {auto("Pending upload", "sections.documents.pending")}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
