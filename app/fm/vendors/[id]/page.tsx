'use client';

import useSWR from 'swr';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CardGridSkeleton } from '@/components/skeletons';
import {
  Building2, MapPin, Phone, Mail, User, FileText,
  ChevronLeft, Edit, Trash2, Star, Clock, Shield, Award
} from 'lucide-react';
import Link from 'next/link';

interface Vendor {
  _id: string;
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
  rating?: number;
  responseTime?: string;
  createdAt?: string;
  updatedAt?: string;
}

const statusColors: Record<string, string> = {
  APPROVED: 'bg-green-100 text-green-800',
  PENDING: 'bg-yellow-100 text-yellow-800',
  SUSPENDED: 'bg-red-100 text-red-800',
  REJECTED: 'bg-gray-100 text-gray-800',
  BLACKLISTED: 'bg-red-200 text-red-900',
};

export default function VendorDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const orgId = session?.user?.orgId;

  const handleDelete = async () => {
    if (!confirm(`Delete vendor "${vendor?.name}"? This cannot be undone.`)) return;
    if (!orgId) return toast.error('Organization ID missing');

    const toastId = toast.loading('Deleting vendor...');
    try {
      const res = await fetch(`/api/vendors/${params.id}`, {
        method: 'DELETE',
        headers: { 'x-tenant-id': orgId }
      });
      if (!res.ok) throw new Error('Failed to delete vendor');
      toast.success('Vendor deleted successfully', { id: toastId });
      router.push('/fm/vendors');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete vendor', { id: toastId });
    }
  };

  const fetcher = (url: string) => {
    if (!orgId) {
      return Promise.reject(new Error('No organization ID'));
    }
    return fetch(url, { 
      headers: { 'x-tenant-id': orgId } 
    }).then(r => r.json());
  };

  const { data: vendor, error, isLoading } = useSWR<Vendor>(
    orgId ? `/api/vendors/${params.id}` : null, 
    fetcher
  );

  if (!session) return <CardGridSkeleton count={3} />;
  if (!orgId) return <div>Error: No organization ID found in session</div>;
  if (error) return <div>Failed to load vendor</div>;
  if (isLoading || !vendor) return <CardGridSkeleton count={3} />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/fm/vendors">
            <Button variant="ghost" size="sm">
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
          </Link>
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-3xl font-bold">{vendor.name}</h1>
              <Badge className={statusColors[vendor.status] || 'bg-gray-100'}>
                {vendor.status}
              </Badge>
            </div>
            <p className="text-gray-600">{vendor.code}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline"
            onClick={() => router.push(`/fm/vendors/${params.id}/edit`)}
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
          <Button 
            variant="outline" 
            className="text-[var(--fixzit-danger)] hover:text-[var(--fixzit-danger-dark)]"
            onClick={handleDelete}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Overview Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Building2 className="w-5 h-5 mr-2" />
                Vendor Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Vendor Type</p>
                  <p className="font-medium">{vendor.type || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <Badge className={statusColors[vendor.status] || 'bg-gray-100'}>
                    {vendor.status}
                  </Badge>
                </div>
                {vendor.rating && (
                  <div>
                    <p className="text-sm text-gray-600">Rating</p>
                    <div className="flex items-center">
                      <Star className="w-4 h-4 text-yellow-500 mr-1" />
                      <p className="font-medium">{vendor.rating.toFixed(1)} / 5.0</p>
                    </div>
                  </div>
                )}
                {vendor.responseTime && (
                  <div>
                    <p className="text-sm text-gray-600">Response Time</p>
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 text-blue-500 mr-1" />
                      <p className="font-medium">{vendor.responseTime}</p>
                    </div>
                  </div>
                )}
              </div>
              
              {vendor.business?.description && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Description</p>
                    <p className="text-gray-800">{vendor.business.description}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Business Information */}
          {vendor.business && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="w-5 h-5 mr-2" />
                  Business Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {vendor.business.crNumber && (
                    <div>
                      <p className="text-sm text-gray-600">CR Number</p>
                      <p className="font-medium">{vendor.business.crNumber}</p>
                    </div>
                  )}
                  {vendor.business.taxNumber && (
                    <div>
                      <p className="text-sm text-gray-600">Tax Number</p>
                      <p className="font-medium">{vendor.business.taxNumber}</p>
                    </div>
                  )}
                  {vendor.business.licenseNumber && (
                    <div>
                      <p className="text-sm text-gray-600">License Number</p>
                      <p className="font-medium">{vendor.business.licenseNumber}</p>
                    </div>
                  )}
                  {vendor.business.licenseExpiry && (
                    <div>
                      <p className="text-sm text-gray-600">License Expiry</p>
                      <p className="font-medium">
                        {new Date(vendor.business.licenseExpiry).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                  {vendor.business.insuranceExpiry && (
                    <div>
                      <p className="text-sm text-gray-600">Insurance Expiry</p>
                      <p className="font-medium">
                        {new Date(vendor.business.insuranceExpiry).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>

                {vendor.business.specializations && vendor.business.specializations.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm text-gray-600 mb-2 flex items-center">
                        <Award className="w-4 h-4 mr-1" />
                        Specializations
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {vendor.business.specializations.map((spec, index) => (
                          <Badge key={index} variant="outline">
                            {spec}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Contact Information */}
          {vendor.contact?.primary && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="w-5 h-5 mr-2" />
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  {vendor.contact.primary.name && (
                    <div className="flex items-center">
                      <User className="w-4 h-4 text-gray-500 mr-2" />
                      <div>
                        <p className="text-sm text-gray-600">Contact Person</p>
                        <p className="font-medium">{vendor.contact.primary.name}</p>
                      </div>
                    </div>
                  )}
                  {vendor.contact.primary.email && (
                    <div className="flex items-center">
                      <Mail className="w-4 h-4 text-gray-500 mr-2" />
                      <div>
                        <p className="text-sm text-gray-600">Email</p>
                        <a 
                          href={`mailto:${vendor.contact.primary.email}`}
                          className="font-medium text-blue-600 hover:underline"
                        >
                          {vendor.contact.primary.email}
                        </a>
                      </div>
                    </div>
                  )}
                  {vendor.contact.primary.phone && (
                    <div className="flex items-center">
                      <Phone className="w-4 h-4 text-gray-500 mr-2" />
                      <div>
                        <p className="text-sm text-gray-600">Phone</p>
                        <a 
                          href={`tel:${vendor.contact.primary.phone}`}
                          className="font-medium text-blue-600 hover:underline"
                        >
                          {vendor.contact.primary.phone}
                        </a>
                      </div>
                    </div>
                  )}
                  {vendor.contact.primary.mobile && (
                    <div className="flex items-center">
                      <Phone className="w-4 h-4 text-gray-500 mr-2" />
                      <div>
                        <p className="text-sm text-gray-600">Mobile</p>
                        <a 
                          href={`tel:${vendor.contact.primary.mobile}`}
                          className="font-medium text-blue-600 hover:underline"
                        >
                          {vendor.contact.primary.mobile}
                        </a>
                      </div>
                    </div>
                  )}
                </div>

                {vendor.contact.address && (
                  <>
                    <Separator />
                    <div className="flex items-start">
                      <MapPin className="w-4 h-4 text-gray-500 mr-2 mt-1" />
                      <div>
                        <p className="text-sm text-gray-600">Address</p>
                        <p className="font-medium">
                          {[
                            vendor.contact.address.street,
                            vendor.contact.address.city,
                            vendor.contact.address.region,
                            vendor.contact.address.postalCode
                          ].filter(Boolean).join(', ') || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Stats & Quick Info */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {vendor.rating && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Rating</span>
                  <div className="flex items-center">
                    <Star className="w-4 h-4 text-yellow-500 mr-1" />
                    <span className="font-medium">{vendor.rating.toFixed(1)}</span>
                  </div>
                </div>
              )}
              {vendor.responseTime && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Avg. Response</span>
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 text-blue-500 mr-1" />
                    <span className="font-medium">{vendor.responseTime}</span>
                  </div>
                </div>
              )}
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Status</span>
                <Badge className={statusColors[vendor.status] || 'bg-gray-100'}>
                  {vendor.status}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Verification Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center">
                <Shield className="w-4 h-4 mr-2" />
                Verification Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">CR Verified</span>
                <Badge variant={vendor.business?.crNumber ? "default" : "outline"}>
                  {vendor.business?.crNumber ? 'Yes' : 'Pending'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">License Valid</span>
                <Badge variant={vendor.business?.licenseNumber ? "default" : "outline"}>
                  {vendor.business?.licenseNumber ? 'Yes' : 'Pending'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Insurance Active</span>
                <Badge variant={vendor.business?.insuranceExpiry ? "default" : "outline"}>
                  {vendor.business?.insuranceExpiry ? 'Yes' : 'No'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Timestamps */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Record Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {vendor.createdAt && (
                <div>
                  <p className="text-sm text-gray-600">Created</p>
                  <p className="text-sm font-medium">
                    {new Date(vendor.createdAt).toLocaleDateString()}
                  </p>
                </div>
              )}
              {vendor.updatedAt && (
                <div>
                  <p className="text-sm text-gray-600">Last Updated</p>
                  <p className="text-sm font-medium">
                    {new Date(vendor.updatedAt).toLocaleDateString()}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
