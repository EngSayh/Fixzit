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

type BankDetailsFormData = {
  bankName: string;
  iban: string;
  accountHolderName: string;
  currency: string;
  swiftCode?: string;
};

interface Props {
  onSubmit: (_data: BankDetailsFormData) => Promise<void>;
  onBack: () => void;
}

export default function BankDetailsForm({ onSubmit, onBack }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const auto = useAutoTranslator("seller.kyc.bankDetails");
  const bankDetailsSchema = useMemo(
    () =>
      z.object({
        bankName: z
          .string()
          .min(2, auto("Bank name required", "validation.bankName")),
        iban: z
          .string()
          .regex(
            /^SA\d{2}[A-Z0-9]{18}$/,
            auto("Invalid Saudi IBAN format", "validation.iban"),
          ),
        accountHolderName: z
          .string()
          .min(
            2,
            auto("Account holder name required", "validation.accountHolder"),
          ),
        currency: z.string().default("SAR"),
        swiftCode: z.string().optional(),
      }),
    [auto],
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BankDetailsFormData>({
    resolver: zodResolver(bankDetailsSchema),
    defaultValues: {
      currency: "SAR",
    },
  });

  const handleFormSubmit = async (data: BankDetailsFormData) => {
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
          {auto("Bank Account Details", "header.title")}
        </h2>
        <p className="text-gray-600 mb-6">
          {auto(
            "Enter your bank account details for receiving payments. This must match the business name on your CR.",
            "header.description",
          )}
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div>
        <Label htmlFor="bankName">
          {auto("Bank Name *", "fields.bankName.label")}
        </Label>
        <select
          id="bankName"
          {...register("bankName")}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="">
            {auto("Select Bank", "fields.bankName.placeholder")}
          </option>
          <option value="Al Rajhi Bank">Al Rajhi Bank</option>
          <option value="National Commercial Bank">
            National Commercial Bank (NCB)
          </option>
          <option value="Riyad Bank">Riyad Bank</option>
          <option value="Samba Financial Group">Samba Financial Group</option>
          <option value="Saudi British Bank">Saudi British Bank (SABB)</option>
          <option value="Alinma Bank">Alinma Bank</option>
          <option value="Bank AlJazira">Bank AlJazira</option>
          <option value="Bank Albilad">Bank Albilad</option>
          <option value="Saudi Investment Bank">Saudi Investment Bank</option>
          <option value="Arab National Bank">Arab National Bank</option>
        </select>
        {errors.bankName && (
          <p className="text-sm text-destructive mt-1">
            {errors.bankName.message}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="iban">{auto("IBAN *", "fields.iban.label")}</Label>
        <Input
          id="iban"
          {...register("iban")}
          placeholder={auto(
            "SA0000000000000000000000",
            "fields.iban.placeholder",
          )}
          maxLength={24}
        />
        {errors.iban && (
          <p className="text-sm text-destructive mt-1">{errors.iban.message}</p>
        )}
        <p className="text-xs text-gray-500 mt-1">
          {auto(
            "Format: SA followed by 2 digits and 18 alphanumeric characters",
            "fields.iban.helper",
          )}
        </p>
      </div>

      <div>
        <Label htmlFor="accountHolderName">
          {auto("Account Holder Name *", "fields.accountHolder.label")}
        </Label>
        <Input
          id="accountHolderName"
          {...register("accountHolderName")}
          placeholder={auto(
            "Must match business name on CR",
            "fields.accountHolder.placeholder",
          )}
        />
        {errors.accountHolderName && (
          <p className="text-sm text-destructive mt-1">
            {errors.accountHolderName.message}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="currency">
            {auto("Currency *", "fields.currency.label")}
          </Label>
          <select
            id="currency"
            {...register("currency")}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="SAR">
              {auto("SAR - Saudi Riyal", "fields.currency.sar")}
            </option>
            <option value="USD">
              {auto("USD - US Dollar", "fields.currency.usd")}
            </option>
            <option value="EUR">
              {auto("EUR - Euro", "fields.currency.eur")}
            </option>
          </select>
        </div>

        <div>
          <Label htmlFor="swiftCode">
            {auto("SWIFT Code (Optional)", "fields.swift.label")}
          </Label>
          <Input
            id="swiftCode"
            {...register("swiftCode")}
            placeholder={auto("ABCDSARI", "fields.swift.placeholder")}
          />
        </div>
      </div>

      <Alert>
        <AlertDescription>
          <strong>{auto("Important:", "alert.title")} </strong>
          {auto(
            "Please ensure your bank account details are accurate. Incorrect information may delay payments.",
            "alert.message",
          )}
        </AlertDescription>
      </Alert>

      <div className="flex justify-between pt-4">
        <Button type="button" variant="outline" onClick={onBack} aria-label={auto("Back", "actions.back")}>
          {auto("Back", "actions.back")}
        </Button>
        <Button type="submit" disabled={submitting} aria-label={submitting ? auto("Submitting...", "actions.submitting") : auto("Submit KYC", "actions.submit")}>
          {submitting
            ? auto("Submitting...", "actions.submitting")
            : auto("Submit KYC", "actions.submit")}
        </Button>
      </div>
    </form>
  );
}
