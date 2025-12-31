/**
 * Property 3D Building Tour Page
 *
 * @module app/(fm)/properties/[id]/tour/page
 * @description Public/tenant view for 3D building model tour.
 * Shows the published building model with optional unit highlight.
 *
 * @access
 * - Tenants: Can view with their unit highlighted
 * - Public: Can view building model without highlight
 * - Owners/Agents: Redirect to property detail tab for editing
 */

import { Metadata } from "next";
import { notFound } from "next/navigation";
import { BuildingTourClient } from "@/components/building3d/BuildingTourClient";

interface TourPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ unit?: string }>;
}

export const metadata: Metadata = {
  title: "3D Building Tour | Fixzit",
  description: "Explore the building in 3D. View floors, apartments, and find your unit.",
};

export default async function TourPage({ params, searchParams }: TourPageProps) {
  const { id } = await params;
  const { unit } = await searchParams;

  if (!id || !/^[a-fA-F0-9]{24}$/.test(id)) {
    notFound();
  }

  return (
    <div className="h-screen w-full">
      <BuildingTourClient
        propertyId={id}
        highlightUnitKey={unit}
        showControls={true}
        propertyName="Building Tour"
      />
    </div>
  );
}
