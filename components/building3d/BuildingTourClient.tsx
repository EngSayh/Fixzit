"use client";

/**
 * BuildingTourClient - Tenant 3D Building Tour View
 *
 * @module components/building3d/BuildingTourClient
 * @description Read-only 3D tour view for tenants. Shows published building model
 * with their unit highlighted. No editing capabilities.
 *
 * @access
 * - Tenants: View their unit in context of the building
 * - Public: View building model (no unit highlight)
 */

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { BuildingModel } from "@/lib/buildingModel";
import type { BuildingSelection, BuildingViewerOptions } from "@/components/building3d/BuildingViewer";
import { useBuilding3dI18n } from "./i18n";

// Dynamic import for 3D viewer (no SSR)
const BuildingViewer = dynamic(
  () => import("@/components/building3d/BuildingViewer"),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full rounded-xl border bg-white flex items-center justify-center text-sm text-gray-500">
        Loading 3D Tour…
      </div>
    ),
  }
);

// ============================================================================
// TYPES
// ============================================================================

interface BuildingTourClientProps {
  propertyId: string;
  /** If provided, this unit will be highlighted */
  highlightUnitKey?: string;
  /** If true, show controls overlay */
  showControls?: boolean;
  /** Optional property name for display */
  propertyName?: string;
}

interface BuildingModelRecord {
  id: string;
  propertyId: string;
  version: number;
  status: string;
  generator: string | null;
  input: unknown;
  model: BuildingModel | null;
  createdAt: string;
  updatedAt: string;
}

interface ApiResponse {
  success: boolean;
  data: {
    buildingModel: BuildingModelRecord | null;
    units: unknown[];
  };
}

// ============================================================================
// HELPERS
// ============================================================================

function safeParseModel(payload: unknown): BuildingModel | null {
  if (!payload || typeof payload !== "object") return null;
  const anyObj = payload as { schemaVersion?: unknown };
  if (anyObj.schemaVersion !== 1) return null;
  return payload as BuildingModel;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function BuildingTourClient({
  propertyId,
  highlightUnitKey,
  showControls = true,
  propertyName,
}: BuildingTourClientProps) {
  const { t } = useBuilding3dI18n();
  const [model, setModel] = useState<BuildingModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selection, setSelection] = useState<BuildingSelection>(null);

  const [viewerOptions, setViewerOptions] = useState<BuildingViewerOptions>({
    showRooms: true,
    exploded: true,
    focusFloor: null,
    showLabels: true,
    viewMode: "orbit",
  });

  // Set initial selection to highlighted unit
  useEffect(() => {
    if (highlightUnitKey && !selection) {
      setSelection({ kind: "unit", unitKey: highlightUnitKey });
    }
  }, [highlightUnitKey, selection]);

  // Load published building model
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/fm/properties/${propertyId}/building-model`, {
        cache: "no-store",
      });
      if (!res.ok) {
        if (res.status === 404) {
          setError(t("errorNoModel"));
        } else {
          throw new Error(`Failed to load model (HTTP ${res.status})`);
        }
        return;
      }

      const data: ApiResponse = await res.json();
      if (!data.data.buildingModel?.model) {
        setError(t("errorNoModelAvailable"));
        return;
      }

      // Only show published models to tenants
      if (data.data.buildingModel.status !== "PUBLISHED") {
        setError(t("errorNotPublished"));
        return;
      }

      const parsedModel = safeParseModel(data.data.buildingModel.model);
      setModel(parsedModel);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("errorUnknown"));
    } finally {
      setLoading(false);
    }
  }, [propertyId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  // Floor list for focus selector
  const floorsList = useMemo(() => {
    if (!model) return [];
    return model.floors.map((f) => ({ index: f.index, label: f.label }));
  }, [model]);

  // Selected unit info
  const selectedUnitInfo = useMemo(() => {
    if (!model || !selection) return null;
    for (const f of model.floors) {
      const unit = f.units.find((u) => u.key === selection.unitKey);
      if (unit) {
        return {
          key: unit.key,
          unitNumber: unit.metadata.unitNumber,
          floor: f.label,
          bedrooms: unit.metadata.bedrooms,
          bathrooms: unit.metadata.bathrooms,
          areaSqm: unit.metadata.areaSqm,
          rooms: unit.rooms.length,
        };
      }
    }
    return null;
  }, [model, selection]);

  // Loading state
  if (loading) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <div className="text-sm text-gray-600">Loading 3D Tour…</div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !model) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="rounded-xl border bg-white p-8 max-w-md text-center shadow-sm">
          <div className="text-4xl mb-3">🏠</div>
          <div className="font-semibold text-gray-900 mb-2">3D Tour Unavailable</div>
          <div className="text-sm text-gray-600">
            {error ?? t("errorDefault")}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full relative bg-gradient-to-br from-gray-50 to-gray-100">
      {/* 3D Viewer */}
      <div className="absolute inset-0">
        <BuildingViewer
          model={model}
          selection={selection}
          onSelect={setSelection}
          options={viewerOptions}
        />
      </div>

      {/* Controls Overlay */}
      {showControls && (
        <>
          {/* Top bar */}
          <div className="absolute top-4 inset-x-4 flex items-center justify-between pointer-events-none">
            <div className="rounded-xl bg-white/90 backdrop-blur shadow-lg px-4 py-3 pointer-events-auto">
              <div className="font-semibold text-gray-900">
                {propertyName ?? "Building Tour"}
              </div>
              <div className="text-xs text-gray-600">
                {model.spec.floors} floors · {model.spec.apartmentsPerFloor} units/floor
              </div>
            </div>

            {/* View mode toggle */}
            <div className="rounded-xl bg-white/90 backdrop-blur shadow-lg px-3 py-2 pointer-events-auto">
              <div className="flex items-center gap-1">
                <button
                  onClick={() =>
                    setViewerOptions((v) => ({ ...v, viewMode: "orbit" }))
                  }
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    viewerOptions.viewMode === "orbit"
                      ? "bg-blue-600 text-white"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  Walkthrough
                </button>
                <button
                  onClick={() =>
                    setViewerOptions((v) => ({ ...v, viewMode: "topdown" }))
                  }
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    viewerOptions.viewMode === "topdown"
                      ? "bg-blue-600 text-white"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  Top-Down
                </button>
              </div>
            </div>
          </div>

          {/* Left controls panel */}
          <div className="absolute start-4 top-24 pointer-events-none">
            <div className="rounded-xl bg-white/90 backdrop-blur shadow-lg p-3 pointer-events-auto space-y-3 w-48">
              <div className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                View Options
              </div>

              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={viewerOptions.showRooms}
                  onChange={(e) =>
                    setViewerOptions((v) => ({ ...v, showRooms: e.target.checked }))
                  }
                  className="rounded"
                />
                <span>Show Rooms</span>
              </label>

              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={viewerOptions.exploded}
                  onChange={(e) =>
                    setViewerOptions((v) => ({ ...v, exploded: e.target.checked }))
                  }
                  className="rounded"
                />
                <span>Exploded View</span>
              </label>

              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={viewerOptions.showLabels}
                  onChange={(e) =>
                    setViewerOptions((v) => ({ ...v, showLabels: e.target.checked }))
                  }
                  className="rounded"
                />
                <span>Show Labels</span>
              </label>

              <div className="pt-2 border-t">
                <label className="text-xs text-gray-600">
                  Focus Floor
                  <select
                    value={
                      viewerOptions.focusFloor === null
                        ? "all"
                        : String(viewerOptions.focusFloor)
                    }
                    onChange={(e) => {
                      const val = e.target.value;
                      setViewerOptions((v) => ({
                        ...v,
                        focusFloor: val === "all" ? null : Number(val),
                      }));
                    }}
                    className="mt-1 w-full rounded-md border px-2 py-1.5 text-sm bg-white"
                  >
                    <option value="all">All Floors</option>
                    {floorsList.map((f) => (
                      <option key={f.index} value={String(f.index)}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
          </div>

          {/* Right info panel - selected unit */}
          {selectedUnitInfo && (
            <div className="absolute end-4 top-24 pointer-events-none">
              <div className="rounded-xl bg-white/90 backdrop-blur shadow-lg p-4 pointer-events-auto w-56">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Selected Unit
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Unit</span>
                    <span className="font-semibold text-gray-900">
                      {selectedUnitInfo.unitNumber}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Floor</span>
                    <span className="font-semibold text-gray-900">
                      {selectedUnitInfo.floor}
                    </span>
                  </div>
                  {selectedUnitInfo.areaSqm > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Area</span>
                      <span className="font-semibold text-gray-900">
                        {selectedUnitInfo.areaSqm} sqm
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Bedrooms</span>
                    <span className="font-semibold text-gray-900">
                      {selectedUnitInfo.bedrooms}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Bathrooms</span>
                    <span className="font-semibold text-gray-900">
                      {selectedUnitInfo.bathrooms}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Rooms</span>
                    <span className="font-semibold text-gray-900">
                      {selectedUnitInfo.rooms}
                    </span>
                  </div>
                </div>

                {highlightUnitKey === selectedUnitInfo.key && (
                  <div className="mt-3 pt-3 border-t">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-xs text-green-700 font-medium">
                        Your Unit
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Bottom instructions */}
          <div className="absolute bottom-4 inset-x-4 flex justify-center pointer-events-none">
            <div className="rounded-xl bg-white/90 backdrop-blur shadow-lg px-4 py-2 pointer-events-auto">
              <div className="text-sm text-gray-600">
                <span className="font-medium">Click</span> to select unit ·{" "}
                <span className="font-medium">Drag</span> to rotate ·{" "}
                <span className="font-medium">Scroll</span> to zoom
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default BuildingTourClient;
