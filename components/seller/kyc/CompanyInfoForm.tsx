'use client';
"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAutoTranslator } from "@/i18n/useAutoTranslator";

type CompanyInfoFormData = {
  businessNameEn: string;
  businessNameAr: string;
  crNumber: string;
  vatNumber?: string;
  businessType: "individual" | "llc" | "corporation";
  addressLine1: string;
  addressLine2?: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  contactPhone: string;
  contactEmail: string;
};

interface Props {
  onSubmit: (_data: CompanyInfoFormData) => Promise<void>;
}

export default function CompanyInfoForm({ onSubmit }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const auto = useAutoTranslator("seller.kyc.companyInfo");
  const companyInfoSchema = useMemo(
    () =>
      z.object({
        businessNameEn: z
          .string()
          .min(2, auto("Business name required", "validation.businessNameEn")),
        businessNameAr: z
          .string()
          .min(
            2,
            auto("Arabic business name required", "validation.businessNameAr"),
          ),
        crNumber: z
          .string()
          .regex(
            /^\d{10}$/,
            auto("CR number must be 10 digits", "validation.crNumber"),
          ),
        vatNumber: z.string().optional(),
        businessType: z.enum(["individual", "llc", "corporation"]),
        addressLine1: z
          .string()
          .min(5, auto("Address required", "validation.addressLine1")),
        addressLine2: z.string().optional(),
        city: z.string().min(2, auto("City required", "validation.city")),
        province: z
          .string()
          .min(2, auto("Province required", "validation.province")),
        postalCode: z
          .string()
          .min(5, auto("Postal code required", "validation.postalCode")),
        country: z.string().default("SA"),
        contactPhone: z
          .string()
          .min(10, auto("Phone number required", "validation.phone")),
        contactEmail: z
          .string()
          .email(auto("Valid email required", "validation.email")),
      }),
    [auto],
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CompanyInfoFormData>({
    resolver: zodResolver(companyInfoSchema),
    defaultValues: {
      country: "SA",
      businessType: "llc",
    },
  });

  const handleFormSubmit = async (data: CompanyInfoFormData) => {
    try {
      setSubmitting(true);
      setError(null);
      await onSubmit(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : auto("Failed to submit", "errors.submit"),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          {auto("Company Information", "header.title")}
        </h2>
        <p className="text-gray-600 mb-6">
          {auto(
            "Please provide your business details exactly as they appear on your Commercial Registration.",
            "header.description",
          )}
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Business Name */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="businessNameEn">
            {auto("Business Name (English) *", "fields.businessNameEn.label")}
          </Label>
          <Input
            id="businessNameEn"
            {...register("businessNameEn")}
            placeholder={auto(
              "ABC Trading Company",
              "fields.businessNameEn.placeholder",
            )}
          />
          {errors.businessNameEn && (
            <p className="text-sm text-destructive mt-1">
              {errors.businessNameEn.message}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="businessNameAr">
            {auto("Business Name (Arabic) *", "fields.businessNameAr.label")}
          </Label>
          <Input
            id="businessNameAr"
            {...register("businessNameAr")}
            placeholder={auto(
              "شركة ABC التجارية",
              "fields.businessNameAr.placeholder",
            )}
            dir="rtl"
          />
          {errors.businessNameAr && (
            <p className="text-sm text-destructive mt-1">
              {errors.businessNameAr.message}
            </p>
          )}
        </div>
      </div>

      {/* CR & VAT */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="crNumber">
            {auto(
              "Commercial Registration (CR) Number *",
              "fields.crNumber.label",
            )}
          </Label>
          <Input
            id="crNumber"
            {...register("crNumber")}
            placeholder={auto("1234567890", "fields.crNumber.placeholder")}
            maxLength={10}
          />
          {errors.crNumber && (
            <p className="text-sm text-destructive mt-1">
              {errors.crNumber.message}
            </p>
          )}
          <p className="text-xs text-gray-500 mt-1">
            {auto("10-digit CR number", "fields.crNumber.helper")}
          </p>
        </div>

        <div>
          <Label htmlFor="vatNumber">
            {auto("VAT Number (Optional)", "fields.vatNumber.label")}
          </Label>
          <Input
            id="vatNumber"
            {...register("vatNumber")}
            placeholder={auto(
              "300000000000003",
              "fields.vatNumber.placeholder",
            )}
          />
          {errors.vatNumber && (
            <p className="text-sm text-destructive mt-1">
              {errors.vatNumber.message}
            </p>
          )}
        </div>
      </div>

      {/* Business Type */}
      <div>
        <Label htmlFor="businessType">
          {auto("Business Type *", "fields.businessType.label")}
        </Label>
        <select
          id="businessType"
          {...register("businessType")}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="individual">
            {auto(
              "Individual/Sole Proprietor",
              "fields.businessType.individual",
            )}
          </option>
          <option value="llc">
            {auto("Limited Liability Company (LLC)", "fields.businessType.llc")}
          </option>
          <option value="corporation">
            {auto("Corporation", "fields.businessType.corporation")}
          </option>
        </select>
      </div>

      {/* Address */}
      <div>
        <Label htmlFor="addressLine1">
          {auto("Street Address *", "fields.addressLine1.label")}
        </Label>
        <Input
          id="addressLine1"
          {...register("addressLine1")}
          placeholder={auto(
            "123 Main Street",
            "fields.addressLine1.placeholder",
          )}
        />
        {errors.addressLine1 && (
          <p className="text-sm text-destructive mt-1">
            {errors.addressLine1.message}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="addressLine2">
          {auto("Address Line 2 (Optional)", "fields.addressLine2.label")}
        </Label>
        <Input
          id="addressLine2"
          {...register("addressLine2")}
          placeholder={auto(
            "Building 5, Unit 201",
            "fields.addressLine2.placeholder",
          )}
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="city">{auto("City *", "fields.city.label")}</Label>
          <Input
            id="city"
            {...register("city")}
            placeholder={auto("Riyadh", "fields.city.placeholder")}
          />
          {errors.city && (
            <p className="text-sm text-destructive mt-1">
              {errors.city.message}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="province">
            {auto("Province *", "fields.province.label")}
          </Label>
          <Input
            id="province"
            {...register("province")}
            placeholder={auto("Riyadh", "fields.province.placeholder")}
          />
          {errors.province && (
            <p className="text-sm text-destructive mt-1">
              {errors.province.message}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="postalCode">
            {auto("Postal Code *", "fields.postalCode.label")}
          </Label>
          <Input
            id="postalCode"
            {...register("postalCode")}
            placeholder={auto("12345", "fields.postalCode.placeholder")}
          />
          {errors.postalCode && (
            <p className="text-sm text-destructive mt-1">
              {errors.postalCode.message}
            </p>
          )}
        </div>
      </div>

      {/* Contact */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="contactPhone">
            {auto("Contact Phone *", "fields.contactPhone.label")}
          </Label>
          <Input
            id="contactPhone"
            {...register("contactPhone")}
            placeholder={auto(
              "+966 50 123 4567",
              "fields.contactPhone.placeholder",
            )}
          />
          {errors.contactPhone && (
            <p className="text-sm text-destructive mt-1">
              {errors.contactPhone.message}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="contactEmail">
            {auto("Contact Email *", "fields.contactEmail.label")}
          </Label>
          <Input
            id="contactEmail"
            type="email"
            {...register("contactEmail")}
            placeholder={auto(
              "contact@example.com",
              "fields.contactEmail.placeholder",
            )}
          />
          {errors.contactEmail && (
            <p className="text-sm text-destructive mt-1">
              {errors.contactEmail.message}
            </p>
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={submitting}>
          {submitting
            ? auto("Submitting...", "actions.submitting")
            : auto("Continue to Documents", "actions.continue")}
        </Button>
      </div>
    </form>
  );
}
