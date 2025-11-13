'use client';
import { logger } from '@/lib/logger';

import { useState } from 'react';
import useSWR from 'swr';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CardGridSkeleton } from '@/components/skeletons';
import { ChevronLeft, Save } from 'lucide-react';
import Link from 'next/link';
import { UpdateVendorSchema, type UpdateVendorInput } from '@/lib/validations/forms';
import { z } from 'zod';

// ✅ FIX 1: Helper to convert empty strings to undefined for optional fields
const getOptionalString = (value: string | File | null): string | undefined => {
  const str = typeof value === 'string' ? value : null;
  return (str && str.trim()) ? str : undefined;
};

// ✅ FIX 2: Safe date formatter to prevent crashes on invalid dates
const toInputDate = (dateString: string | undefined | null): string => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return ''; // Check for invalid date
    return date.toISOString().split('T')[0];
  } catch {
    return '';
  }
};

interface Vendor {
  id: string;
  code: string;
  name: string;
  type: string;
  status: 'PENDING' | 'APPROVED' | 'SUSPENDED' | 'REJECTED' | 'BLACKLISTED';
  contact?: {
    primary?: {
      name?: string;
      email?: string;
      phone?: string;
      mobile?: string;
    };
    address?: {
      street?: string;
      city?: string;
      region?: string;
      postalCode?: string;
    };
  };
  business?: {
    specializations?: string[];
    crNumber?: string;
    taxNumber?: string;
    licenseNumber?: string;
    licenseExpiry?: string;
    insuranceExpiry?: string;
    description?: string;
  };
}

export default function EditVendorPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const orgId = session?.user?.orgId;
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ✅ FIX 3: Handle HTTP errors properly to prevent crash on 404/500
  const fetcher = (url: string) => {
    if (!orgId) {
      return Promise.reject(new Error('No organization ID'));
    }
    return fetch(url, { 
      headers: { 'x-tenant-id': orgId } 
    })
      .then(async (r) => {
        if (!r.ok) {
          const errorData = await r.json().catch(() => ({ message: 'Failed to fetch vendor' }));
          throw new Error(errorData.message || `Error ${r.status}`);
        }
        return r.json();
      })
      .catch(error => {
        logger.error('FM vendor edit fetch error', { error });
        throw error;
      });
  };

  const { data: vendor, error, isLoading } = useSWR<Vendor>(
    orgId ? `/api/vendors/${params.id}` : null, 
    fetcher
  );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!orgId) return toast.error('Organization ID missing');
    
    setIsSaving(true);
    setErrors({});

    const formData = new FormData(e.currentTarget);
    const specializationsStr = getOptionalString(formData.get('specializations'));
    const specializations = specializationsStr ? specializationsStr.split(',').map(s => s.trim()).filter(Boolean) : undefined;
    
    // ✅ FIX 4: Use getOptionalString for all optional fields to match validation schema
    const data: Partial<UpdateVendorInput> = {
      id: params.id as string,
      name: formData.get('name')?.toString() || '', // Required field
      code: getOptionalString(formData.get('code')),
      type: getOptionalString(formData.get('type')),
      status: formData.get('status')?.toString() as 'PENDING' | 'APPROVED' | 'SUSPENDED' | 'REJECTED' | 'BLACKLISTED',
      contact: {
        primary: {
          name: formData.get('contactName')?.toString() || '', // Required field
          email: getOptionalString(formData.get('contactEmail')),
          phone: getOptionalString(formData.get('contactPhone')),
          mobile: getOptionalString(formData.get('contactMobile')),
        },
        address: {
          street: getOptionalString(formData.get('addressStreet')),
          city: getOptionalString(formData.get('addressCity')),
          region: getOptionalString(formData.get('addressRegion')),
          postalCode: getOptionalString(formData.get('addressPostalCode')),
        },
      },
      business: {
        specializations,
        crNumber: getOptionalString(formData.get('crNumber')),
        taxNumber: getOptionalString(formData.get('taxNumber')),
        licenseNumber: getOptionalString(formData.get('licenseNumber')),
        licenseExpiry: getOptionalString(formData.get('licenseExpiry')),
        insuranceExpiry: getOptionalString(formData.get('insuranceExpiry')),
        description: getOptionalString(formData.get('businessDescription')),
      },
    };

    try {
      // Validate with Zod
      UpdateVendorSchema.parse(data);

      const res = await fetch(`/api/vendors/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': orgId,
        },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to update vendor');
      }

      toast.success('Vendor updated successfully');
      router.push(`/fm/vendors/${params.id}`);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.issues.forEach((err: z.ZodIssue) => {
          if (err.path.length > 0) {
            fieldErrors[err.path.join('.')] = err.message;
          }
        });
        setErrors(fieldErrors);
        toast.error('Please fix validation errors');
      } else {
        toast.error(error instanceof Error ? error.message : 'Failed to update vendor');
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (!session) return <CardGridSkeleton count={1} />;
  if (!orgId) return <div>Error: No organization ID found in session</div>;
  if (error) return <div>Failed to load vendor</div>;
  if (isLoading || !vendor) return <CardGridSkeleton count={1} />;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/fm/vendors/${params.id}`}>
          <Button variant="ghost" size="icon">
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Edit Vendor</h1>
          <p className="text-muted-foreground">Update vendor information</p>
        </div>
      </div>

      {/* Edit Form */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Vendor Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Vendor Name *</Label>
              <Input
                id="name"
                name="name"
                defaultValue={vendor.name}
                placeholder="Enter vendor name"
                required
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name}</p>
              )}
            </div>

            {/* Vendor Code */}
            <div className="space-y-2">
              <Label htmlFor="code">Vendor Code *</Label>
              <Input
                id="code"
                name="code"
                defaultValue={vendor.code}
                placeholder="e.g., VEN-001"
                required
              />
              {errors.code && (
                <p className="text-sm text-destructive">{errors.code}</p>
              )}
            </div>

            {/* Type & Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Type *</Label>
                <Input
                  id="type"
                  name="type"
                  defaultValue={vendor.type}
                  placeholder="e.g., Contractor, Supplier"
                  required
                />
                {errors.type && (
                  <p className="text-sm text-destructive">{errors.type}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status *</Label>
                <Select name="status" defaultValue={vendor.status}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="APPROVED">Approved</SelectItem>
                    <SelectItem value="SUSPENDED">Suspended</SelectItem>
                    <SelectItem value="REJECTED">Rejected</SelectItem>
                    <SelectItem value="BLACKLISTED">Blacklisted</SelectItem>
                  </SelectContent>
                </Select>
                {errors.status && (
                  <p className="text-sm text-destructive">{errors.status}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Contact Name */}
            <div className="space-y-2">
              <Label htmlFor="contactName">Contact Person Name</Label>
              <Input
                id="contactName"
                name="contactName"
                defaultValue={vendor.contact?.primary?.name || ''}
                placeholder="Enter contact person name"
              />
              {errors['contact.primary.name'] && (
                <p className="text-sm text-destructive">{errors['contact.primary.name']}</p>
              )}
            </div>

            {/* Email & Phone */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contactEmail">Email</Label>
                <Input
                  id="contactEmail"
                  name="contactEmail"
                  type="email"
                  defaultValue={vendor.contact?.primary?.email || ''}
                  placeholder="email@example.com"
                />
                {errors['contact.primary.email'] && (
                  <p className="text-sm text-destructive">{errors['contact.primary.email']}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactPhone">Phone</Label>
                <Input
                  id="contactPhone"
                  name="contactPhone"
                  defaultValue={vendor.contact?.primary?.phone || ''}
                  placeholder="+966XXXXXXXXX"
                />
                {errors['contact.primary.phone'] && (
                  <p className="text-sm text-destructive">{errors['contact.primary.phone']}</p>
                )}
              </div>
            </div>

            {/* Mobile */}
            <div className="space-y-2">
              <Label htmlFor="contactMobile">Mobile</Label>
              <Input
                id="contactMobile"
                name="contactMobile"
                defaultValue={vendor.contact?.primary?.mobile || ''}
                placeholder="+966XXXXXXXXX"
              />
              {errors['contact.primary.mobile'] && (
                <p className="text-sm text-destructive">{errors['contact.primary.mobile']}</p>
              )}
            </div>

            {/* Address */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Address</h3>
              
              <div className="space-y-2">
                <Label htmlFor="addressStreet">Street</Label>
                <Input
                  id="addressStreet"
                  name="addressStreet"
                  defaultValue={vendor.contact?.address?.street || ''}
                  placeholder="Street address"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="addressCity">City</Label>
                  <Input
                    id="addressCity"
                    name="addressCity"
                    defaultValue={vendor.contact?.address?.city || ''}
                    placeholder="City"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="addressRegion">Region</Label>
                  <Input
                    id="addressRegion"
                    name="addressRegion"
                    defaultValue={vendor.contact?.address?.region || ''}
                    placeholder="Region"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="addressPostalCode">Postal Code</Label>
                  <Input
                    id="addressPostalCode"
                    name="addressPostalCode"
                    defaultValue={vendor.contact?.address?.postalCode || ''}
                    placeholder="12345"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Business Information */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Business Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Specializations */}
            <div className="space-y-2">
              <Label htmlFor="specializations">Specializations</Label>
              <Input
                id="specializations"
                name="specializations"
                defaultValue={vendor.business?.specializations?.join(', ') || ''}
                placeholder="e.g., Electrical, Plumbing, HVAC (comma-separated)"
              />
              <p className="text-sm text-muted-foreground">
                Enter multiple specializations separated by commas
              </p>
            </div>

            {/* CR Number & Tax Number */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="crNumber">CR Number</Label>
                <Input
                  id="crNumber"
                  name="crNumber"
                  defaultValue={vendor.business?.crNumber || ''}
                  placeholder="Commercial Registration Number"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="taxNumber">Tax Number</Label>
                <Input
                  id="taxNumber"
                  name="taxNumber"
                  defaultValue={vendor.business?.taxNumber || ''}
                  placeholder="Tax Registration Number"
                />
              </div>
            </div>

            {/* License */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="licenseNumber">License Number</Label>
                <Input
                  id="licenseNumber"
                  name="licenseNumber"
                  defaultValue={vendor.business?.licenseNumber || ''}
                  placeholder="License Number"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="licenseExpiry">License Expiry</Label>
                <Input
                  id="licenseExpiry"
                  name="licenseExpiry"
                  type="date"
                  defaultValue={toInputDate(vendor.business?.licenseExpiry)}
                />
              </div>
            </div>

            {/* Insurance Expiry */}
            <div className="space-y-2">
              <Label htmlFor="insuranceExpiry">Insurance Expiry</Label>
              <Input
                id="insuranceExpiry"
                name="insuranceExpiry"
                type="date"
                defaultValue={toInputDate(vendor.business?.insuranceExpiry)}
              />
            </div>

            {/* Business Description */}
            <div className="space-y-2">
              <Label htmlFor="businessDescription">Business Description</Label>
              <Textarea
                id="businessDescription"
                name="businessDescription"
                defaultValue={vendor.business?.description || ''}
                placeholder="Describe the vendor's business, services, and capabilities..."
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-4 mt-6">
          <Link href={`/fm/vendors/${params.id}`}>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={isSaving}>
            <Save className="h-4 w-4 me-2" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  );
}
