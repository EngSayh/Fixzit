'use client';

import useSWR from 'swr';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import GoogleMap from '@/components/GoogleMap';
import {
  Building2, MapPin, DollarSign, Users, Home,
  Wrench, Shield, ChevronLeft, Edit, Trash2, CheckCircle, AlertCircle
} from 'lucide-react';
import Link from 'next/link';

interface MaintenanceIssue {
  resolved?: boolean;
  severity?: string;
  description?: string;
}

interface PropertyUnit {
  unitNumber?: string;
  type?: string;
  area?: number;
  bedrooms?: number;
  bathrooms?: number;
  status?: string;
  tenant?: {
    name?: string;
  };
}

export default function PropertyDetailsPage() {
  const params = useParams();
  const { data: session } = useSession();
  const orgId = session?.user?.orgId;

  const fetcher = (url: string) => {
    if (!orgId) {
      return Promise.reject(new Error('No organization ID'));
    }
    return fetch(url, { 
      headers: { 'x-tenant-id': orgId } 
    }).then(r => r.json());
  };

  const { data: property, error } = useSWR(
    orgId ? `/api/properties/${params.id}` : null, 
    fetcher
  );

  if (!session) return <div>Loading session...</div>;
  if (!orgId) return <div>Error: No organization ID found in session</div>;
  if (error) return <div>Failed to load property</div>;
  if (!property) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/fm/properties">
            <Button variant="ghost" size="sm">
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">{property.name}</h1>
            <p className="text-gray-600">{property.code}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline">
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
          <Button variant="outline" className="text-[var(--fixzit-danger)] hover:text-[var(--fixzit-danger-dark)]">
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
                Property Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Type</p>
                  <p className="font-medium">{property.type}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Subtype</p>
                  <p className="font-medium">{property.subtype || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Area</p>
                  <p className="font-medium">{property.details?.totalArea || 'N/A'} sqm</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Built Area</p>
                  <p className="font-medium">{property.details?.builtArea || 'N/A'} sqm</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Year Built</p>
                  <p className="font-medium">{property.details?.yearBuilt || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Floors</p>
                  <p className="font-medium">{property.details?.floors || 'N/A'}</p>
                </div>
              </div>

              {property.description && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Description</p>
                    <p className="text-sm">{property.description}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Location Card with Map */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MapPin className="w-5 h-5 mr-2" />
                Location
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="font-medium">{property.address?.street}</p>
                <p className="text-sm text-gray-600">
                  {property.address?.district && `${property.address.district}, `}
                  {property.address?.city}, {property.address?.region}
                </p>
                {property.address?.postalCode && (
                  <p className="text-sm text-gray-600">Postal Code: {property.address.postalCode}</p>
                )}
                {property.address?.nationalAddress && (
                  <p className="text-sm text-gray-600">National Address: {property.address.nationalAddress}</p>
                )}
              </div>

              {property.address?.coordinates && (
                <GoogleMap
                  center={{
                    lat: property.address.coordinates.lat,
                    lng: property.address.coordinates.lng
                  }}
                  markers={[{
                    position: {
                      lat: property.address.coordinates.lat,
                      lng: property.address.coordinates.lng
                    },
                    title: property.name,
                    info: property.address.street
                  }]}
                  height="300px"
                />
              )}
            </CardContent>
          </Card>

          {/* Units */}
          {property.units && property.units.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Home className="w-5 h-5 mr-2" />
                  Units ({property.units.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(property.units as PropertyUnit[]).map((unit, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">{unit.unitNumber}</p>
                        <p className="text-sm text-gray-600">
                          {unit.type} • {unit.area} sqm • {unit.bedrooms}BR/{unit.bathrooms}BA
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge className={
                          unit.status === 'OCCUPIED' ? 'bg-green-100 text-green-800' :
                          unit.status === 'VACANT' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }>
                          {unit.status}
                        </Badge>
                        {unit.tenant?.name && (
                          <p className="text-sm text-gray-600 mt-1">{unit.tenant.name}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Summary */}
        <div className="space-y-6">
          {/* Financial Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <DollarSign className="w-5 h-5 mr-2" />
                Financial Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Purchase Price</span>
                <span className="font-medium">
                  {property.financial?.purchasePrice?.toLocaleString() || 'N/A'} SAR
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Current Value</span>
                <span className="font-medium">
                  {property.financial?.currentValue?.toLocaleString() || 'N/A'} SAR
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Monthly Rent</span>
                <span className="font-medium">
                  {property.financial?.monthlyRent?.toLocaleString() || 'N/A'} SAR
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Annual Yield</span>
                <span className="font-medium">
                  {property.financial?.annualYield || 'N/A'}%
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Ownership */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="w-5 h-5 mr-2" />
                Ownership
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Type</p>
                <p className="font-medium">{property.ownership?.type || 'N/A'}</p>
              </div>
              {property.ownership?.owner && (
                <div>
                  <p className="text-sm text-gray-600">Owner</p>
                  <p className="font-medium">{property.ownership.owner.name}</p>
                  {property.ownership.owner.contact && (
                    <p className="text-sm text-gray-500">{property.ownership.owner.contact}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Compliance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="w-5 h-5 mr-2" />
                Compliance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {property.compliance?.buildingPermit && (
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-[var(--fixzit-success)]" />
                  <span className="text-sm">Building Permit: {property.compliance.buildingPermit}</span>
                </div>
              )}
              {property.compliance?.occupancyCertificate && (
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-[var(--fixzit-success)]" />
                  <span className="text-sm">Occupancy Certificate</span>
                </div>
              )}
              {property.compliance?.insurance?.policyNumber && (
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-[var(--fixzit-success)]" />
                  <span className="text-sm">Insurance: {property.compliance.insurance.provider}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Maintenance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Wrench className="w-5 h-5 mr-2" />
                Maintenance Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Last Inspection</p>
                <p className="font-medium">
                  {property.maintenance?.lastInspection 
                    ? new Date(property.maintenance.lastInspection).toLocaleDateString()
                    : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Next Inspection</p>
                <p className="font-medium">
                  {property.maintenance?.nextInspection 
                    ? new Date(property.maintenance.nextInspection).toLocaleDateString()
                    : 'N/A'}
                </p>
              </div>
              {property.maintenance?.issues && property.maintenance.issues.length > 0 && (
                <div>
                  <p className="text-sm text-gray-600 mb-2">Open Issues</p>
                  {(property.maintenance.issues as MaintenanceIssue[])
                    .filter((issue) => !issue.resolved)
                    .map((issue, index: number) => (
                      <div key={index} className="flex items-center space-x-2 text-sm">
                        <AlertCircle className={`w-4 h-4 ${
                          issue.severity === 'HIGH' ? 'text-red-600' :
                          issue.severity === 'MEDIUM' ? 'text-yellow-600' :
                          'text-gray-600'
                        }`} />
                        <span>{issue.description}</span>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

