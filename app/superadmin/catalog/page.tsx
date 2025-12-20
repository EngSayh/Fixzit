"use client";

/**
 * Superadmin Marketplace Catalog Management
 * Manage all marketplace products, categories, and catalog settings
 * 
 * @module app/superadmin/catalog/page
 */

import { Package } from "lucide-react";
import { PlannedFeature } from "@/components/superadmin/PlannedFeature";

export default function SuperadminCatalogPage() {
  return (
    <PlannedFeature
      title="Marketplace Catalog"
      description="Manage all marketplace products, categories, and catalog settings"
      icon={<Package className="h-6 w-6" />}
      status="planned"
      plannedRelease="Q2 2026"
      features={[
        "Product approval workflow and moderation",
        "Category and taxonomy management",
        "SKU and inventory administration",
        "Bulk product operations",
        "Catalog-wide pricing and discount rules",
      ]}
    />
  );
}
