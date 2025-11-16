'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

const bankDetailsSchema = z.object({
  bankName: z.string().min(2, 'Bank name required'),
  iban: z.string().regex(/^SA\d{2}[A-Z0-9]{18}$/, 'Invalid Saudi IBAN format'),
  accountHolderName: z.string().min(2, 'Account holder name required'),
  currency: z.string().default('SAR'),
  swiftCode: z.string().optional()
});

type BankDetailsFormData = z.infer<typeof bankDetailsSchema>;

interface Props {
  onSubmit: (_data: BankDetailsFormData) => Promise<void>;
  onBack: () => void;
}

export default function BankDetailsForm({ onSubmit, onBack }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<BankDetailsFormData>({
    resolver: zodResolver(bankDetailsSchema),
    defaultValues: {
      currency: 'SAR'
    }
  });

  const handleFormSubmit = async (data: BankDetailsFormData) => {
    try {
      setSubmitting(true);
      setError(null);
      await onSubmit(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Bank Account Details</h2>
        <p className="text-gray-600 mb-6">
          Enter your bank account details for receiving payments. This must match the business name on your CR.
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div>
        <Label htmlFor="bankName">Bank Name *</Label>
        <select 
          id="bankName"
          {...register('bankName')}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="">Select Bank</option>
          <option value="Al Rajhi Bank">Al Rajhi Bank</option>
          <option value="National Commercial Bank">National Commercial Bank (NCB)</option>
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
          <p className="text-sm text-destructive mt-1">{errors.bankName.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="iban">IBAN *</Label>
        <Input 
          id="iban"
          {...register('iban')}
          placeholder="SA0000000000000000000000"
          maxLength={24}
        />
        {errors.iban && (
          <p className="text-sm text-destructive mt-1">{errors.iban.message}</p>
        )}
        <p className="text-xs text-gray-500 mt-1">
          Format: SA followed by 2 digits and 18 alphanumeric characters
        </p>
      </div>

      <div>
        <Label htmlFor="accountHolderName">Account Holder Name *</Label>
        <Input 
          id="accountHolderName"
          {...register('accountHolderName')}
          placeholder="Must match business name on CR"
        />
        {errors.accountHolderName && (
          <p className="text-sm text-destructive mt-1">{errors.accountHolderName.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="currency">Currency *</Label>
          <select 
            id="currency"
            {...register('currency')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="SAR">SAR - Saudi Riyal</option>
            <option value="USD">USD - US Dollar</option>
            <option value="EUR">EUR - Euro</option>
          </select>
        </div>

        <div>
          <Label htmlFor="swiftCode">SWIFT Code (Optional)</Label>
          <Input 
            id="swiftCode"
            {...register('swiftCode')}
            placeholder="ABCDSARI"
          />
        </div>
      </div>

      <Alert>
        <AlertDescription>
          <strong>Important:</strong> Please ensure your bank account details are accurate. 
          Incorrect information may delay payments.
        </AlertDescription>
      </Alert>

      <div className="flex justify-between pt-4">
        <Button type="button" variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Submitting...' : 'Submit KYC'}
        </Button>
      </div>
    </form>
  );
}
