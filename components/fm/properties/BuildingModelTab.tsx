"use client";

/**
 * BuildingModelTab - 3D Building Model Generator Tab
 *
 * @module components/fm/properties/BuildingModelTab
 * @description Tab component for generating and managing 3D building models.
 * Integrated into the property details view for owners/agents.
 *
 * @features
 * - Generation specification form
 * - 3D model viewer
 * - Unit metadata editor
 * - Publish functionality
 * - Viewer options (exploded, rooms, labels, focus floor)
 */

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  BuildingGenSpecSchema,
  type BuildingGenSpec,
  type BuildingModel,
} from "@/lib/buildingModel";
import type { BuildingSelection, BuildingViewerOptions } from "@/components/building3d/BuildingViewer";

// Dynamic import for 3D viewer (no SSR)
const BuildingViewer = dynamic(
  () => import("@/components/building3d/BuildingViewer"),
  {
    ssr: false,
    loading: () => (
      <div className="h-[520px] w-full rounded-xl border bg-white flex items-center justify-center text-sm text-gray-500">
        Loading 3D Viewer…
      </div>
    ),
  }
);

// ============================================================================
// TYPES
// ============================================================================

interface UnitData {
  _id: string;
  unitNumber?: string;
  type?: string;
  area?: number;
  sizeSqm?: number;
  bedrooms?: number;
  bathrooms?: number;
  halls?: number;
  floor?: string;
  status?: string;
  designKey?: string;
  electricityMeter?: string;
  waterMeter?: string;
  amenities?: string[];
}

interface BuildingModelRecord {
  id: string;
  propertyId: string;
  version: number;
  status: string;
  generator: string | null;
  input: BuildingGenSpec;
  model: BuildingModel | null;
  createdAt: string;
  updatedAt: string;
}

interface GetResponse {
  success: boolean;
  data: {
    buildingModel: BuildingModelRecord | null;
    units: UnitData[];
  };
}

interface PostResponse {
  success: boolean;
  data: {
    buildingModel: BuildingModelRecord;
    units: UnitData[];
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

const DEFAULT_SPEC: BuildingGenSpec = {
  floors: 3,
  apartmentsPerFloor: 4,
  layout: "grid",
  floorHeightM: 3,
  unitWidthM: 10,
  unitDepthM: 8,
  gapM: 1.2,
  slabThicknessM: 0.15,
  template: "2br",
  prompt: "Modern, neutral palette. Simple corridor access. Family-friendly 2BR units.",
};

// ============================================================================
// COMPONENT
// ============================================================================

export function BuildingModelTab({ propertyId }: { propertyId: string }) {
  const [spec, setSpec] = useState<BuildingGenSpec>(DEFAULT_SPEC);
  const [syncUnits, setSyncUnits] = useState(true);

  const [model, setModel] = useState<BuildingModel | null>(null);
  const [record, setRecord] = useState<BuildingModelRecord | null>(null);
  const [units, setUnits] = useState<UnitData[]>([]);

  const [selection, setSelection] = useState<BuildingSelection>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [savingUnit, setSavingUnit] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [viewerOptions, setViewerOptions] = useState<BuildingViewerOptions>({
    showRooms: true,
    exploded: true,
    focusFloor: null,
    showLabels: true,
    viewMode: "orbit",
  });

  // Unit lookup by designKey
  const unitsByDesignKey = useMemo(() => {
    const map = new Map<string, UnitData>();
    for (const u of units) {
      if (u.designKey) map.set(u.designKey, u);
    }
    return map;
  }, [units]);

  const selectedUnitKey = useMemo(() => {
    if (!selection) return null;
    return selection.unitKey;
  }, [selection]);

  const selectedUnitDb = useMemo(() => {
    if (!selectedUnitKey) return null;
    return unitsByDesignKey.get(selectedUnitKey) ?? null;
  }, [selectedUnitKey, unitsByDesignKey]);

  const selectedUnitFromModel = useMemo(() => {
    if (!model || !selectedUnitKey) return null;
    for (const f of model.floors) {
      const hit = f.units.find((u) => u.key === selectedUnitKey);
      if (hit) return hit;
    }
    return null;
  }, [model, selectedUnitKey]);

  // Load existing model
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/fm/properties/${propertyId}/building-model`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`Failed to load model (HTTP ${res.status})`);
      const data: GetResponse = await res.json();
      setUnits(data.data.units);
      setRecord(data.data.buildingModel);

      if (data.data.buildingModel?.input) {
        const parsed = BuildingGenSpecSchema.safeParse(data.data.buildingModel.input);
        if (parsed.success) setSpec(parsed.data);
      }
      if (data.data.buildingModel?.model) {
        const parsedModel = safeParseModel(data.data.buildingModel.model);
        setModel(parsedModel);
      } else {
        setModel(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    void load();
  }, [load]);

  // Generate model
  const generate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const validated = BuildingGenSpecSchema.parse(spec);
      const res = await fetch(`/api/fm/properties/${propertyId}/building-model`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spec: validated, syncUnits }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Generate failed (HTTP ${res.status}): ${text}`);
      }
      const data: PostResponse = await res.json();
      setUnits(data.data.units);
      setModel(safeParseModel(data.data.buildingModel.model));
      setRecord(data.data.buildingModel);
      toast.success("Building model generated successfully");
      
      // Keep selection stable if possible
      if (selection && selection.kind === "unit") {
        const exists = (safeParseModel(data.data.buildingModel.model)?.floors ?? []).some(
          (f) => f.units.some((u) => u.key === selection.unitKey)
        );
        if (!exists) setSelection(null);
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unknown error";
      setError(message);
      toast.error(`Generation failed: ${message}`);
    } finally {
      setGenerating(false);
    }
  };

  // Unit form state
  const [unitForm, setUnitForm] = useState({
    unitNumber: "",
    bedrooms: 0,
    bathrooms: 0,
    halls: 0,
    sizeSqm: 0,
    electricityMeter: "",
    waterMeter: "",
  });

  // Sync unit form when selection changes
  useEffect(() => {
    if (!selectedUnitKey) return;

    const fallback = selectedUnitFromModel?.metadata;
    setUnitForm({
      unitNumber: selectedUnitDb?.unitNumber ?? fallback?.unitNumber ?? "",
      bedrooms: selectedUnitDb?.bedrooms ?? fallback?.bedrooms ?? 0,
      bathrooms: selectedUnitDb?.bathrooms ?? fallback?.bathrooms ?? 0,
      halls: selectedUnitDb?.halls ?? fallback?.halls ?? 0,
      sizeSqm: selectedUnitDb?.sizeSqm ?? fallback?.areaSqm ?? 0,
      electricityMeter: selectedUnitDb?.electricityMeter ?? fallback?.electricityMeter ?? "",
      waterMeter: selectedUnitDb?.waterMeter ?? fallback?.waterMeter ?? "",
    });
  }, [selectedUnitKey, selectedUnitDb, selectedUnitFromModel]);

  // Save unit
  const saveUnit = async () => {
    if (!selectedUnitKey || !selectedUnitDb) return;
    setSavingUnit(true);
    setError(null);
    try {
      const payload = {
        unitNumber: unitForm.unitNumber,
        bedrooms: unitForm.bedrooms,
        bathrooms: unitForm.bathrooms,
        halls: unitForm.halls,
        sizeSqm: unitForm.sizeSqm,
        electricityMeter: unitForm.electricityMeter || null,
        waterMeter: unitForm.waterMeter || null,
      };

      const res = await fetch(
        `/api/fm/properties/${propertyId}/units/${selectedUnitDb._id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) throw new Error(`Unit save failed (HTTP ${res.status})`);
      
      toast.success("Unit saved successfully");
      await load();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unknown error";
      setError(message);
      toast.error(`Save failed: ${message}`);
    } finally {
      setSavingUnit(false);
    }
  };

  // Publish model
  const publish = async () => {
    setPublishing(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/fm/properties/${propertyId}/building-model/publish`,
        { method: "POST" }
      );
      if (!res.ok) throw new Error(`Publish failed (HTTP ${res.status})`);
      const _data = await res.json();
      if (record) {
        setRecord({ ...record, status: "PUBLISHED" });
      }
      toast.success("Building model published successfully");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unknown error";
      setError(message);
      toast.error(`Publish failed: ${message}`);
    } finally {
      setPublishing(false);
    }
  };

  // Spec validation
  const specErrors = useMemo(() => {
    const parsed = BuildingGenSpecSchema.safeParse(spec);
    return parsed.success ? [] : parsed.error.issues.map((i) => i.message);
  }, [spec]);

  const floorsList = useMemo(() => {
    if (!model) return [];
    return model.floors.map((f) => ({ index: f.index, label: f.label }));
  }, [model]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-lg font-semibold text-gray-900">3D Building Designer</h3>
          <a
            href={`/fm/properties/${propertyId}/tour`}
            className="px-3 py-2 rounded-lg border bg-white hover:bg-gray-50 text-sm"
          >
            Open 3D Tour
          </a>
        </div>
        <p className="text-sm text-gray-600">
          Generate a 3D building model per floor and apartment. Select a unit in
          the model to edit its metadata (unit number, meters, bedrooms, bathrooms,
          area). Publish the model to expose it via the public 3D Tour.
        </p>
      </div>

      {/* Error display */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Generator */}
        <div className="lg:col-span-4 space-y-4">
          <div className="rounded-xl border bg-white p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="font-semibold text-gray-900">Generator</div>
                <div className="text-xs text-gray-500">
                  Status:{" "}
                  <span
                    className={`font-semibold ${
                      record?.status === "PUBLISHED"
                        ? "text-emerald-700"
                        : record?.status === "DRAFT"
                        ? "text-amber-700"
                        : "text-gray-600"
                    }`}
                  >
                    {record?.status ?? "—"}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={generate}
                  disabled={generating || specErrors.length > 0}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-semibold disabled:opacity-50"
                >
                  {generating ? "Generating…" : "Generate"}
                </button>
                <button
                  onClick={publish}
                  disabled={!model || publishing || record?.status === "PUBLISHED"}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold disabled:opacity-50"
                >
                  {publishing
                    ? "Publishing…"
                    : record?.status === "PUBLISHED"
                    ? "Published"
                    : "Publish"}
                </button>
              </div>
            </div>

            {/* Spec form */}
            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs text-gray-600">
                Floors
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={spec.floors}
                  onChange={(e) =>
                    setSpec((s) => ({ ...s, floors: Number(e.target.value) }))
                  }
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                />
              </label>
              <label className="text-xs text-gray-600">
                Apartments / Floor
                <input
                  type="number"
                  min={1}
                  max={200}
                  value={spec.apartmentsPerFloor}
                  onChange={(e) =>
                    setSpec((s) => ({
                      ...s,
                      apartmentsPerFloor: Number(e.target.value),
                    }))
                  }
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                />
              </label>
              <label className="text-xs text-gray-600">
                Floor Height (m)
                <input
                  type="number"
                  min={2.2}
                  max={6}
                  step={0.1}
                  value={spec.floorHeightM}
                  onChange={(e) =>
                    setSpec((s) => ({ ...s, floorHeightM: Number(e.target.value) }))
                  }
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                />
              </label>
              <label className="text-xs text-gray-600">
                Slab (m)
                <input
                  type="number"
                  min={0.05}
                  max={0.6}
                  step={0.01}
                  value={spec.slabThicknessM}
                  onChange={(e) =>
                    setSpec((s) => ({
                      ...s,
                      slabThicknessM: Number(e.target.value),
                    }))
                  }
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                />
              </label>
              <label className="text-xs text-gray-600">
                Unit Width (m)
                <input
                  type="number"
                  min={4}
                  max={30}
                  step={0.5}
                  value={spec.unitWidthM}
                  onChange={(e) =>
                    setSpec((s) => ({ ...s, unitWidthM: Number(e.target.value) }))
                  }
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                />
              </label>
              <label className="text-xs text-gray-600">
                Unit Depth (m)
                <input
                  type="number"
                  min={4}
                  max={30}
                  step={0.5}
                  value={spec.unitDepthM}
                  onChange={(e) =>
                    setSpec((s) => ({ ...s, unitDepthM: Number(e.target.value) }))
                  }
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                />
              </label>
              <label className="text-xs text-gray-600">
                Gap (m)
                <input
                  type="number"
                  min={0.1}
                  max={10}
                  step={0.1}
                  value={spec.gapM}
                  onChange={(e) =>
                    setSpec((s) => ({ ...s, gapM: Number(e.target.value) }))
                  }
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                />
              </label>
            </div>

            <label className="text-xs text-gray-600">
              Unit Template
              <select
                value={spec.template}
                onChange={(e) =>
                  setSpec((s) => ({
                    ...s,
                    template: e.target.value as BuildingGenSpec["template"],
                  }))
                }
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              >
                <option value="studio">Studio</option>
                <option value="1br">1 Bedroom</option>
                <option value="2br">2 Bedrooms</option>
                <option value="3br">3 Bedrooms</option>
                <option value="mixed">Mixed</option>
              </select>
            </label>

            <label className="text-xs text-gray-600">
              Designer Prompt (optional)
              <textarea
                value={spec.prompt ?? ""}
                onChange={(e) => setSpec((s) => ({ ...s, prompt: e.target.value }))}
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                rows={4}
                placeholder="e.g., 6 floors, 4 apartments per floor, modern neutral palette, family-friendly layout…"
              />
            </label>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={syncUnits}
                onChange={(e) => setSyncUnits(e.target.checked)}
              />
              <span>Sync apartments as Units in the system</span>
            </label>

            {specErrors.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                <div className="font-semibold mb-1">Fix generator inputs:</div>
                <ul className="list-disc ps-5 space-y-1">
                  {specErrors.map((m) => (
                    <li key={m}>{m}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Viewer options */}
          <div className="rounded-xl border bg-white p-4 space-y-3">
            <div className="font-semibold text-gray-900">Viewer</div>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={viewerOptions.showRooms}
                  onChange={(e) =>
                    setViewerOptions((v) => ({ ...v, showRooms: e.target.checked }))
                  }
                />
                <span>Show Rooms</span>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={viewerOptions.exploded}
                  onChange={(e) =>
                    setViewerOptions((v) => ({ ...v, exploded: e.target.checked }))
                  }
                />
                <span>Exploded Floors</span>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={viewerOptions.showLabels}
                  onChange={(e) =>
                    setViewerOptions((v) => ({ ...v, showLabels: e.target.checked }))
                  }
                />
                <span>Show Labels</span>
              </label>
            </div>

            <label className="text-xs text-gray-600">
              View Mode
              <select
                value={viewerOptions.viewMode}
                onChange={(e) =>
                  setViewerOptions((v) => ({
                    ...v,
                    viewMode: e.target.value as "orbit" | "topdown",
                  }))
                }
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              >
                <option value="orbit">Walkthrough (Orbit)</option>
                <option value="topdown">Top-Down View</option>
              </select>
            </label>

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
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              >
                <option value="all">All Floors</option>
                {floorsList.map((f) => (
                  <option key={f.index} value={String(f.index)}>
                    {f.label}
                  </option>
                ))}
              </select>
            </label>

            <button
              onClick={load}
              className="w-full px-3 py-2 rounded-lg border text-sm hover:bg-gray-50"
              disabled={loading}
            >
              {loading ? "Refreshing…" : "Refresh from Server"}
            </button>
          </div>
        </div>

        {/* Middle: 3D Viewer */}
        <div className="lg:col-span-5">
          {loading && !model ? (
            <div className="h-[520px] w-full rounded-xl border bg-white flex items-center justify-center text-sm text-gray-500">
              Loading…
            </div>
          ) : model ? (
            <div className="rounded-xl border bg-white p-3">
              <div className="h-[520px] w-full">
                <BuildingViewer
                  model={model}
                  selection={selection}
                  onSelect={setSelection}
                  options={viewerOptions}
                />
              </div>
            </div>
          ) : (
            <div className="h-[520px] w-full rounded-xl border bg-white flex flex-col items-center justify-center text-sm text-gray-600 p-6 text-center">
              <div className="font-semibold text-gray-900 mb-2">No 3D model yet</div>
              <div className="max-w-sm">
                Set floors and apartments per floor, then click{" "}
                <span className="font-semibold">Generate</span>.
              </div>
            </div>
          )}
        </div>

        {/* Right: Unit metadata panel */}
        <div className="lg:col-span-3 space-y-4">
          <div className="rounded-xl border bg-white p-4 space-y-3">
            <div className="font-semibold text-gray-900">Selected</div>
            {!selectedUnitKey ? (
              <div className="text-sm text-gray-600">
                Click an apartment (or room) in the 3D model.
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-sm">
                  <span className="text-gray-500">Node:</span>{" "}
                  <span className="font-semibold">{selectedUnitKey}</span>
                </div>
                {selection?.kind === "room" && (
                  <div className="text-sm">
                    <span className="text-gray-500">Room:</span>{" "}
                    <span className="font-semibold">{selection.roomId}</span>
                  </div>
                )}
                <div className="text-xs text-gray-500">
                  Units are editable fields; rooms are view-only.
                </div>
              </div>
            )}
          </div>

          <div className="rounded-xl border bg-white p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="font-semibold text-gray-900">Unit Metadata</div>
              <button
                onClick={saveUnit}
                disabled={!selectedUnitKey || !selectedUnitDb || savingUnit}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold disabled:opacity-50"
              >
                {savingUnit ? "Saving…" : "Save"}
              </button>
            </div>

            {!selectedUnitKey || !selectedUnitDb ? (
              <div className="text-sm text-gray-600">Select a unit to edit.</div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs text-gray-600">
                  Unit Number
                  <input
                    value={unitForm.unitNumber}
                    onChange={(e) =>
                      setUnitForm((u) => ({ ...u, unitNumber: e.target.value }))
                    }
                    className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                    placeholder={selectedUnitFromModel?.metadata.unitNumber}
                  />
                </label>
                <label className="text-xs text-gray-600">
                  Area (sqm)
                  <input
                    type="number"
                    value={unitForm.sizeSqm}
                    onChange={(e) =>
                      setUnitForm((u) => ({ ...u, sizeSqm: Number(e.target.value) }))
                    }
                    className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                  />
                </label>
                <label className="text-xs text-gray-600">
                  Bedrooms
                  <input
                    type="number"
                    min={0}
                    value={unitForm.bedrooms}
                    onChange={(e) =>
                      setUnitForm((u) => ({ ...u, bedrooms: Number(e.target.value) }))
                    }
                    className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                  />
                </label>
                <label className="text-xs text-gray-600">
                  Bathrooms
                  <input
                    type="number"
                    min={0}
                    value={unitForm.bathrooms}
                    onChange={(e) =>
                      setUnitForm((u) => ({
                        ...u,
                        bathrooms: Number(e.target.value),
                      }))
                    }
                    className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                  />
                </label>
                <label className="text-xs text-gray-600">
                  Hall / Living
                  <input
                    type="number"
                    min={0}
                    value={unitForm.halls}
                    onChange={(e) =>
                      setUnitForm((u) => ({ ...u, halls: Number(e.target.value) }))
                    }
                    className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                  />
                </label>
                <div />
                <label className="text-xs text-gray-600 col-span-2">
                  Electricity Meter
                  <input
                    value={unitForm.electricityMeter}
                    onChange={(e) =>
                      setUnitForm((u) => ({
                        ...u,
                        electricityMeter: e.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                    placeholder="e.g., SEC meter #"
                  />
                </label>
                <label className="text-xs text-gray-600 col-span-2">
                  Water Meter
                  <input
                    value={unitForm.waterMeter}
                    onChange={(e) =>
                      setUnitForm((u) => ({ ...u, waterMeter: e.target.value }))
                    }
                    className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                    placeholder="e.g., NWC meter #"
                  />
                </label>
              </div>
            )}

            {selectedUnitDb && (
              <div className="rounded-lg border bg-gray-50 p-3 text-xs text-gray-600">
                <div className="font-semibold text-gray-800 mb-1">DB Record</div>
                <div>
                  <span className="text-gray-500">Unit ID:</span> {selectedUnitDb._id}
                </div>
              </div>
            )}
          </div>

          {/* Quick list */}
          <div className="rounded-xl border bg-white p-4 space-y-3">
            <div className="font-semibold text-gray-900">Units</div>
            {units.length === 0 ? (
              <div className="text-sm text-gray-600">No units found.</div>
            ) : (
              <div className="max-h-[220px] overflow-auto border rounded-lg">
                {units.map((u) => (
                  <button
                    key={u._id}
                    onClick={() =>
                      u.designKey && setSelection({ kind: "unit", unitKey: u.designKey })
                    }
                    className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-gray-50"
                  >
                    <div className="text-start">
                      <div className="font-medium text-gray-900">
                        {u.unitNumber ?? u._id}
                      </div>
                      <div className="text-xs text-gray-500">
                        Floor {u.floor ?? "—"} · {u.sizeSqm ?? u.area ?? "—"} sqm
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">{u.designKey ?? ""}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Build info */}
      {model && (
        <div className="rounded-xl border bg-white p-4 text-xs text-gray-600">
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <div>
              <span className="text-gray-500">Floors:</span> {model.spec.floors}
            </div>
            <div>
              <span className="text-gray-500">Apts/Floor:</span>{" "}
              {model.spec.apartmentsPerFloor}
            </div>
            <div>
              <span className="text-gray-500">Template:</span> {model.spec.template}
            </div>
            <div>
              <span className="text-gray-500">Bounds:</span>{" "}
              {Math.round(model.bounds.width)}m × {Math.round(model.bounds.depth)}m ×{" "}
              {Math.round(model.bounds.height)}m
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BuildingModelTab;
