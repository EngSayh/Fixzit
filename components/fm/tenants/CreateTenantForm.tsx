"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "@/contexts/TranslationContext";
import { Input } from "@/components/ui/input";
import { Select, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";

const createInitialTenantForm = () => ({
  name: "",
  type: "",
  contact: {
    primary: {
      name: "",
      title: "",
      email: "",
      phone: "",
      mobile: "",
    },
    secondary: {
      name: "",
      email: "",
      phone: "",
    },
    emergency: {
      name: "",
      relationship: "",
      phone: "",
    },
  },
  identification: {
    nationalId: "",
    companyRegistration: "",
    taxId: "",
    licenseNumber: "",
  },
  address: {
    current: {
      street: "",
      city: "",
      region: "",
      postalCode: "",
    },
    permanent: {
      street: "",
      city: "",
      region: "",
      postalCode: "",
    },
  },
  preferences: {
    communication: {
      email: true,
      sms: false,
      phone: false,
      app: false,
    },
    notifications: {
      maintenance: true,
      rent: true,
      events: false,
      announcements: false,
    },
    language: "ar",
    timezone: "Asia/Riyadh",
  },
  tags: [] as string[],
});

type TenantFormState = ReturnType<typeof createInitialTenantForm>;

type CreateTenantFormProps = {
  orgId: string;
  onCreated: () => void;
};

export function CreateTenantForm({ orgId, onCreated }: CreateTenantFormProps) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<TenantFormState>(() =>
    createInitialTenantForm(),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!orgId) {
      toast.error(
        t(
          "fm.errors.noOrgSession",
          "Error: No organization ID found in session",
        ),
      );
      return;
    }

    if (!formData.type) {
      toast.error(
        t("fm.tenants.errors.typeRequired", "Please select a tenant type."),
      );
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading(
      t("fm.tenants.toast.creating", "Creating tenant..."),
    );

    try {
      const response = await fetch("/api/tenants", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-id": orgId,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        const message =
          error &&
          typeof error === "object" &&
          "error" in error &&
          typeof error.error === "string"
            ? error.error
            : t("fm.tenants.errors.unknown", "Unknown error");
        toast.error(
          t(
            "fm.tenants.toast.createFailed",
            "Failed to create tenant: {{message}}",
          ).replace("{{message}}", message),
          { id: toastId },
        );
        return;
      }

      toast.success(
        t("fm.tenants.toast.createSuccess", "Tenant created successfully"),
        { id: toastId },
      );
      setFormData(createInitialTenantForm());
      onCreated();
    } catch (error) {
      logger.error("Error creating tenant:", error);
      toast.error(
        t(
          "fm.tenants.toast.createUnknown",
          "Error creating tenant. Please try again.",
        ),
        { id: toastId },
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 max-h-96 overflow-y-auto"
    >
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium">
            {t("fm.tenants.tenantName", "Tenant Name")} *
          </label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">
            {t("fm.properties.type", "Type")} *
          </label>
          <Select
            value={formData.type}
            onValueChange={(value) => setFormData({ ...formData, type: value })}
            placeholder={t("fm.properties.selectType", "Select type")}
            className="w-full sm:w-40 bg-muted border-input text-foreground"
          >
              <SelectItem value="INDIVIDUAL">
                {t("fm.tenants.individual", "Individual")}
              </SelectItem>
              <SelectItem value="COMPANY">
                {t("fm.tenants.company", "Company")}
              </SelectItem>
              <SelectItem value="GOVERNMENT">
                {t("fm.tenants.government", "Government")}
              </SelectItem>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium">
            {t("fm.tenants.primaryContactName", "Primary Contact Name")} *
          </label>
          <Input
            value={formData.contact.primary.name}
            onChange={(e) =>
              setFormData({
                ...formData,
                contact: {
                  ...formData.contact,
                  primary: {
                    ...formData.contact.primary,
                    name: e.target.value,
                  },
                },
              })
            }
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">
            {t("fm.tenants.email", "Email")} *
          </label>
          <Input
            type="email"
            value={formData.contact.primary.email}
            onChange={(e) =>
              setFormData({
                ...formData,
                contact: {
                  ...formData.contact,
                  primary: {
                    ...formData.contact.primary,
                    email: e.target.value,
                  },
                },
              })
            }
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium">
            {t("fm.tenants.phone", "Phone")}
          </label>
          <Input
            value={formData.contact.primary.phone}
            onChange={(e) =>
              setFormData({
                ...formData,
                contact: {
                  ...formData.contact,
                  primary: {
                    ...formData.contact.primary,
                    phone: e.target.value,
                  },
                },
              })
            }
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">
            {t("fm.tenants.mobile", "Mobile")}
          </label>
          <Input
            value={formData.contact.primary.mobile}
            onChange={(e) =>
              setFormData({
                ...formData,
                contact: {
                  ...formData.contact,
                  primary: {
                    ...formData.contact.primary,
                    mobile: e.target.value,
                  },
                },
              })
            }
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium">
            {t("fm.properties.city", "City")} *
          </label>
          <Input
            value={formData.address.current.city}
            onChange={(e) =>
              setFormData({
                ...formData,
                address: {
                  ...formData.address,
                  current: {
                    ...formData.address.current,
                    city: e.target.value,
                  },
                },
              })
            }
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">
            {t("fm.properties.region", "Region")} *
          </label>
          <Input
            value={formData.address.current.region}
            onChange={(e) =>
              setFormData({
                ...formData,
                address: {
                  ...formData.address,
                  current: {
                    ...formData.address.current,
                    region: e.target.value,
                  },
                },
              })
            }
            required
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">
          {t("fm.properties.streetAddress", "Street Address")} *
        </label>
        <Input
          value={formData.address.current.street}
          onChange={(e) =>
            setFormData({
              ...formData,
              address: {
                ...formData.address,
                current: {
                  ...formData.address.current,
                  street: e.target.value,
                },
              },
            })
          }
          required
        />
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button
          type="submit"
          className="bg-secondary hover:bg-secondary/90"
          disabled={isSubmitting}
          aria-busy={isSubmitting}
          aria-label={t("fm.tenants.createTenant.ariaLabel", "Submit form to create tenant")}
        >
          {isSubmitting
            ? t("common.saving", "Saving...")
            : t("fm.tenants.createTenant", "Create Tenant")}
        </Button>
      </div>
    </form>
  );
}
