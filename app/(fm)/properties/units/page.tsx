"use client";

import React from "react";
import { useTranslation } from "@/contexts/TranslationContext";

export default function PropertiesUnitsPage() {
  const { t } = useTranslation();
  const units = [
    {
      id: "U-001",
      unitNumber: "1204",
      property: "Tower A",
      type: "2BR Apartment",
      size: "120 sqm",
      tenant: "John Smith",
      leaseStatus: "Active",
      monthlyRent: "SAR 8,500",
      occupancy: "occupied",
    },
    {
      id: "U-002",
      unitNumber: "1205",
      property: "Tower A",
      type: "3BR Apartment",
      size: "150 sqm",
      tenant: "Sarah Johnson",
      leaseStatus: "Active",
      monthlyRent: "SAR 12,000",
      occupancy: "occupied",
    },
    {
      id: "U-003",
      unitNumber: "901",
      property: "Tower B",
      type: "Studio",
      size: "45 sqm",
      tenant: "Available",
      leaseStatus: "Vacant",
      monthlyRent: "SAR 4,500",
      occupancy: "vacant",
    },
    {
      id: "U-004",
      unitNumber: "V-009",
      property: "Villa Complex",
      type: "4BR Villa",
      size: "300 sqm",
      tenant: "Ahmed Al-Rashid",
      leaseStatus: "Active",
      monthlyRent: "SAR 25,000",
      occupancy: "occupied",
    },
  ];
  const propertyOptions = [
    {
      value: "all",
      key: "properties.filters.allProperties",
      fallback: "All Properties",
    },
    { value: "tower-a", key: "properties.filters.towerA", fallback: "Tower A" },
    { value: "tower-b", key: "properties.filters.towerB", fallback: "Tower B" },
    {
      value: "villa-complex",
      key: "properties.filters.villaComplex",
      fallback: "Villa Complex",
    },
  ];

  const unitTypeOptions = [
    {
      value: "all",
      key: "properties.units.filters.types.all",
      fallback: "All Types",
    },
    {
      value: "studio",
      key: "properties.units.filters.types.studio",
      fallback: "Studio",
    },
    {
      value: "1br",
      key: "properties.units.filters.types.1br",
      fallback: "1BR Apartment",
    },
    {
      value: "2br",
      key: "properties.units.filters.types.2br",
      fallback: "2BR Apartment",
    },
    {
      value: "3br",
      key: "properties.units.filters.types.3br",
      fallback: "3BR Apartment",
    },
    {
      value: "villa",
      key: "properties.units.filters.types.villa",
      fallback: "Villa",
    },
  ];

  const unitStatusOptions = [
    {
      value: "all",
      key: "properties.units.filters.status.all",
      fallback: "All Status",
    },
    {
      value: "occupied",
      key: "properties.units.filters.status.occupied",
      fallback: "Occupied",
    },
    {
      value: "vacant",
      key: "properties.units.filters.status.vacant",
      fallback: "Vacant",
    },
    {
      value: "maintenance",
      key: "properties.units.filters.status.maintenance",
      fallback: "Maintenance",
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active":
        return "bg-success/10 text-success-foreground border-success/20";
      case "Expiring":
        return "bg-warning/10 text-warning-foreground border-warning/20";
      case "Expired":
        return "bg-destructive/10 text-destructive-foreground border-destructive/20";
      case "Vacant":
        return "bg-muted text-foreground border-border";
      default:
        return "bg-muted text-foreground border-border";
    }
  };

  const getOccupancyColor = (occupancy: string) => {
    switch (occupancy) {
      case "occupied":
        return "bg-success/10 text-success-foreground border-success/20";
      case "vacant":
        return "bg-destructive/10 text-destructive-foreground border-destructive/20";
      case "maintenance":
        return "bg-warning/10 text-warning-foreground border-warning/20";
      default:
        return "bg-muted text-foreground border-border";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Units & Tenants
          </h1>
          <p className="text-muted-foreground">
            Manage property units and tenant information
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn-secondary">Import Units</button>
          <button type="button" className="btn-primary">+ Add Unit</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Total Units
              </p>
              <p className="text-2xl font-bold text-primary">156</p>
            </div>
            <div className="text-primary">🏢</div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Occupied
              </p>
              <p className="text-2xl font-bold text-success">142</p>
            </div>
            <div className="text-success">👥</div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Vacant
              </p>
              <p className="text-2xl font-bold text-destructive">14</p>
            </div>
            <div className="text-[hsl(var(--destructive)) / 0.1]">🏠</div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Occupancy Rate
              </p>
              <p className="text-2xl font-bold text-[hsl(var(--secondary))]">
                91%
              </p>
            </div>
            <div className="text-secondary">📊</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-48">
            <select className="w-full px-3 py-2 border border-border rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent">
              {propertyOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {t(option.key, option.fallback)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-48">
            <select className="w-full px-3 py-2 border border-border rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent">
              {unitTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {t(option.key, option.fallback)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-48">
            <select className="w-full px-3 py-2 border border-border rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent">
              {unitStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {t(option.key, option.fallback)}
                </option>
              ))}
            </select>
          </div>
          <button type="button" className="btn-primary">
            {t("common.filter", "Filter")}
          </button>
        </div>
      </div>

      {/* Units Table */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Units Overview</h3>
          <div className="flex gap-2">
            <button type="button" className="btn-ghost">📄 Export</button>
            <button type="button" className="btn-ghost">📊 Analytics</button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-3 text-start text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Unit ID
                </th>
                <th className="px-4 py-3 text-start text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Property
                </th>
                <th className="px-4 py-3 text-start text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Type
                </th>
                <th className="px-4 py-3 text-start text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Size
                </th>
                <th className="px-4 py-3 text-start text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Tenant
                </th>
                <th className="px-4 py-3 text-start text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Monthly Rent
                </th>
                <th className="px-4 py-3 text-start text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Lease Status
                </th>
                <th className="px-4 py-3 text-start text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Occupancy
                </th>
                <th className="px-4 py-3 text-start text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-border">
              {units.map((unit) => (
                <tr key={unit.id} className="hover:bg-muted">
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                    {unit.unitNumber}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {unit.property}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {unit.type}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {unit.size}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {unit.tenant}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {unit.monthlyRent}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(unit.leaseStatus)}`}
                    >
                      {unit.leaseStatus}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getOccupancyColor(unit.occupancy)}`}
                    >
                      {unit.occupancy}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex gap-2">
                      <button type="button" className="text-primary hover:text-primary">
                        {t("common.edit", "Edit")}
                      </button>
                      <button type="button" className="text-success hover:text-success-foreground">
                        View Tenant
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <button type="button" className="btn-ghost text-center">
            <div className="text-2xl mb-2">➕</div>
            <div className="text-sm font-medium">Add Unit</div>
          </button>
          <button type="button" className="btn-ghost text-center">
            <div className="text-2xl mb-2">👥</div>
            <div className="text-sm font-medium">Add Tenant</div>
          </button>
          <button type="button" className="btn-ghost text-center">
            <div className="text-2xl mb-2">📋</div>
            <div className="text-sm font-medium">Lease Management</div>
          </button>
          <button type="button" className="btn-ghost text-center">
            <div className="text-2xl mb-2">💰</div>
            <div className="text-sm font-medium">Rent Collection</div>
          </button>
          <button type="button" className="btn-ghost text-center">
            <div className="text-2xl mb-2">📊</div>
            <div className="text-sm font-medium">Reports</div>
          </button>
          <button type="button" className="btn-ghost text-center">
            <div className="text-2xl mb-2">⚙️</div>
            <div className="text-sm font-medium">Settings</div>
          </button>
        </div>
      </div>
    </div>
  );
}
