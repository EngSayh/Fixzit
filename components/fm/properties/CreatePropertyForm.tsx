"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem } from "@/components/ui/select";
import { useTranslation } from "@/contexts/TranslationContext";
import { logger } from "@/lib/logger";
import { Loader2 } from "lucide-react";

export interface CreatePropertyFormProps {
  onCreated: () => void;
  orgId: string;
}

export function CreatePropertyForm({ onCreated, orgId }: CreatePropertyFormProps) {
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    type: "",
    subtype: "",
    address: {
      street: "",
      city: "",
      region: "",
      postalCode: "",
      coordinates: { lat: 24.7136, lng: 46.6753 }, // Default to Riyadh
      nationalAddress: "",
      district: "",
    },
    details: {
      totalArea: 0,
      builtArea: 0,
      bedrooms: 0,
      bathrooms: 0,
      floors: 0,
      parkingSpaces: 0,
      yearBuilt: new Date().getFullYear(),
      occupancyRate: 0,
    },
    ownership: {
      type: "OWNED",
      owner: {
        name: "",
        contact: "",
        id: "",
      },
      lease: {
        startDate: "",
        endDate: "",
        monthlyRent: 0,
        landlord: "",
      },
    },
    features: {
      amenities: [] as string[],
      utilities: {
        electricity: "",
        water: "",
        gas: "",
        internet: "",
      },
      accessibility: {
        elevator: false,
        ramp: false,
        parking: false,
      },
    },
    tags: [] as string[],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!orgId) {
      toast.error(t("fm.errors.noOrgSession", "Error: No organization ID found in session"));
      return;
    }

    if (isSubmitting) return; // Prevent double submission
    setIsSubmitting(true);

    const toastId = toast.loading(t("fm.properties.toast.creating", "Creating property..."));

    try {
      const response = await fetch("/api/fm/properties", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-id": orgId,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success(t("fm.properties.toast.createSuccess", "Property created successfully"), {
          id: toastId,
        });
        onCreated();
      } else {
        const error = await response.json().catch(() => ({}));
        const message =
          error && typeof error === "object" && "error" in error && typeof error.error === "string"
            ? error.error
            : t("fm.properties.errors.unknown", "Unknown error");
        toast.error(
          t("fm.properties.toast.createFailed", "Failed to create property: {{message}}").replace(
            "{{message}}",
            message
          ),
          { id: toastId }
        );
      }
    } catch (_error) {
      logger.error("Error creating property:", _error);
      toast.error(
        t("fm.properties.toast.createUnknown", "Error creating property. Please try again."),
        { id: toastId }
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-h-96 overflow-y-auto">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            {t("fm.properties.propertyName", "Property Name")} *
          </label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">
            {t("fm.properties.type", "Type")} *
          </label>
          <Select
            value={formData.type}
            onValueChange={(val) => setFormData({ ...formData, type: val })}
            placeholder={t("fm.properties.selectType", "Select type")}
          >
            <SelectContent>
              <SelectItem value="RESIDENTIAL">
                {t("fm.properties.residential", "Residential")}
              </SelectItem>
              <SelectItem value="COMMERCIAL">
                {t("fm.properties.commercial", "Commercial")}
              </SelectItem>
              <SelectItem value="INDUSTRIAL">
                {t("fm.properties.industrial", "Industrial")}
              </SelectItem>
              <SelectItem value="MIXED_USE">
                {t("fm.properties.mixedUse", "Mixed Use")}
              </SelectItem>
              <SelectItem value="LAND">{t("fm.properties.land", "Land")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          {t("fm.properties.description", "Description")}
        </label>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            {t("fm.properties.streetAddress", "Street Address")} *
          </label>
          <Input
            value={formData.address.street}
            onChange={(e) =>
              setFormData({
                ...formData,
                address: { ...formData.address, street: e.target.value },
              })
            }
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">
            {t("fm.properties.city", "City")} *
          </label>
          <Input
            value={formData.address.city}
            onChange={(e) =>
              setFormData({
                ...formData,
                address: { ...formData.address, city: e.target.value },
              })
            }
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            {t("fm.properties.region", "Region")} *
          </label>
          <Input
            value={formData.address.region}
            onChange={(e) =>
              setFormData({
                ...formData,
                address: { ...formData.address, region: e.target.value },
              })
            }
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">
            {t("fm.properties.postalCode", "Postal Code")}
          </label>
          <Input
            value={formData.address.postalCode}
            onChange={(e) =>
              setFormData({
                ...formData,
                address: { ...formData.address, postalCode: e.target.value },
              })
            }
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            {t("fm.properties.totalArea", "Total Area")} (sqm)
          </label>
          <Input
            type="number"
            value={formData.details.totalArea}
            onChange={(e) =>
              setFormData({
                ...formData,
                details: {
                  ...formData.details,
                  totalArea: Number(e.target.value),
                },
              })
            }
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">
            {t("fm.properties.builtArea", "Built Area")} (sqm)
          </label>
          <Input
            type="number"
            value={formData.details.builtArea}
            onChange={(e) =>
              setFormData({
                ...formData,
                details: {
                  ...formData.details,
                  builtArea: Number(e.target.value),
                },
              })
            }
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            {t("fm.properties.bedrooms", "Bedrooms")}
          </label>
          <Input
            type="number"
            value={formData.details.bedrooms}
            onChange={(e) =>
              setFormData({
                ...formData,
                details: {
                  ...formData.details,
                  bedrooms: Number(e.target.value),
                },
              })
            }
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">
            {t("fm.properties.bathrooms", "Bathrooms")}
          </label>
          <Input
            type="number"
            value={formData.details.bathrooms}
            onChange={(e) =>
              setFormData({
                ...formData,
                details: {
                  ...formData.details,
                  bathrooms: Number(e.target.value),
                },
              })
            }
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">
            {t("fm.properties.floors", "Floors")}
          </label>
          <Input
            type="number"
            value={formData.details.floors}
            onChange={(e) =>
              setFormData({
                ...formData,
                details: {
                  ...formData.details,
                  floors: Number(e.target.value),
                },
              })
            }
          />
        </div>
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button 
          type="submit" 
          className="bg-success hover:bg-success/90" 
          disabled={isSubmitting}
          aria-busy={isSubmitting}
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              {t("fm.properties.creating", "Creating...")}
            </span>
          ) : (
            t("fm.properties.createProperty", "Create Property")
          )}
        </Button>
      </div>
    </form>
  );
}
