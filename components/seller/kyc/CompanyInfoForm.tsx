'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

const companyInfoSchema = z.object({
  businessNameEn: z.string().min(2, 'Business name required'),
  businessNameAr: z.string().min(2, 'Arabic business name required'),
  crNumber: z.string().regex(/^\d{10}$/, 'CR number must be 10 digits'),
  vatNumber: z.string().optional(),
  businessType: z.enum(['individual', 'llc', 'corporation']),
  addressLine1: z.string().min(5, 'Address required'),
  addressLine2: z.string().optional(),
  city: z.string().min(2, 'City required'),
  province: z.string().min(2, 'Province required'),
  postalCode: z.string().min(5, 'Postal code required'),
  country: z.string().default('SA'),
  contactPhone: z.string().min(10, 'Phone number required'),
  contactEmail: z.string().email('Valid email required')
});

type CompanyInfoFormData = z.infer<typeof companyInfoSchema>;

interface Props {
  onSubmit: (_data: CompanyInfoFormData) => Promise<void>;
}

export default function CompanyInfoForm({ onSubmit }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<CompanyInfoFormData>({
    resolver: zodResolver(companyInfoSchema),
    defaultValues: {
      country: 'SA',
      businessType: 'llc'
    }
  });

  const handleFormSubmit = async (data: CompanyInfoFormData) => {
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
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Company Information</h2>
        <p className="text-gray-600 mb-6">
          Please provide your business details exactly as they appear on your Commercial Registration.
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
          <Label htmlFor="businessNameEn">Business Name (English) *</Label>
          <Input 
            id="businessNameEn"
            {...register('businessNameEn')}
            placeholder="ABC Trading Company"
          />
          {errors.businessNameEn && (
            <p className="text-sm text-red-500 mt-1">{errors.businessNameEn.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="businessNameAr">Business Name (Arabic) *</Label>
          <Input 
            id="businessNameAr"
            {...register('businessNameAr')}
            placeholder="شركة ABC التجارية"
            dir="rtl"
          />
          {errors.businessNameAr && (
            <p className="text-sm text-red-500 mt-1">{errors.businessNameAr.message}</p>
          )}
        </div>
      </div>

      {/* CR & VAT */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="crNumber">Commercial Registration (CR) Number *</Label>
          <Input 
            id="crNumber"
            {...register('crNumber')}
            placeholder="1234567890"
            maxLength={10}
          />
          {errors.crNumber && (
            <p className="text-sm text-red-500 mt-1">{errors.crNumber.message}</p>
          )}
          <p className="text-xs text-gray-500 mt-1">10-digit CR number</p>
        </div>

        <div>
          <Label htmlFor="vatNumber">VAT Number (Optional)</Label>
          <Input 
            id="vatNumber"
            {...register('vatNumber')}
            placeholder="300000000000003"
          />
          {errors.vatNumber && (
            <p className="text-sm text-red-500 mt-1">{errors.vatNumber.message}</p>
          )}
        </div>
      </div>

      {/* Business Type */}
      <div>
        <Label htmlFor="businessType">Business Type *</Label>
        <select 
          id="businessType"
          {...register('businessType')}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="individual">Individual/Sole Proprietor</option>
          <option value="llc">Limited Liability Company (LLC)</option>
          <option value="corporation">Corporation</option>
        </select>
      </div>

      {/* Address */}
      <div>
        <Label htmlFor="addressLine1">Street Address *</Label>
        <Input 
          id="addressLine1"
          {...register('addressLine1')}
          placeholder="123 Main Street"
        />
        {errors.addressLine1 && (
          <p className="text-sm text-red-500 mt-1">{errors.addressLine1.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="addressLine2">Address Line 2 (Optional)</Label>
        <Input 
          id="addressLine2"
          {...register('addressLine2')}
          placeholder="Building 5, Unit 201"
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="city">City *</Label>
          <Input 
            id="city"
            {...register('city')}
            placeholder="Riyadh"
          />
          {errors.city && (
            <p className="text-sm text-red-500 mt-1">{errors.city.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="province">Province *</Label>
          <Input 
            id="province"
            {...register('province')}
            placeholder="Riyadh"
          />
          {errors.province && (
            <p className="text-sm text-red-500 mt-1">{errors.province.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="postalCode">Postal Code *</Label>
          <Input 
            id="postalCode"
            {...register('postalCode')}
            placeholder="12345"
          />
          {errors.postalCode && (
            <p className="text-sm text-red-500 mt-1">{errors.postalCode.message}</p>
          )}
        </div>
      </div>

      {/* Contact */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="contactPhone">Contact Phone *</Label>
          <Input 
            id="contactPhone"
            {...register('contactPhone')}
            placeholder="+966 50 123 4567"
          />
          {errors.contactPhone && (
            <p className="text-sm text-red-500 mt-1">{errors.contactPhone.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="contactEmail">Contact Email *</Label>
          <Input 
            id="contactEmail"
            type="email"
            {...register('contactEmail')}
            placeholder="contact@example.com"
          />
          {errors.contactEmail && (
            <p className="text-sm text-red-500 mt-1">{errors.contactEmail.message}</p>
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Submitting...' : 'Continue to Documents'}
        </Button>
      </div>
    </form>
  );
}
