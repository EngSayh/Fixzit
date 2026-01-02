"use client";

/**
 * BuildingViewer - 3D Building Model Viewer Component
 *
 * @module components/building3d/BuildingViewer
 * @description Three.js-based 3D viewer for building models.
 * Renders floors, units, and rooms with interactive selection.
 *
 * @features
 * - Floor-by-floor rendering
 * - Unit and room selection
 * - Exploded view mode
 * - Floor focus/isolation
 * - Labels and tooltips
 * - Walkthrough mode (OrbitControls)
 * - Top-down view option
 */

import { useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Grid, Html, OrbitControls, PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";
import type {
  BuildingModel,
  FloorModel,
  RoomModel,
  RoomKind,
  UnitModel,
} from "@/lib/buildingModel";

// ============================================================================
// TYPES
// ============================================================================

export type BuildingSelection =
  | { kind: "unit"; unitKey: string }
  | { kind: "room"; unitKey: string; roomId: string }
  | null;

export type BuildingViewerOptions = {
  showRooms: boolean;
  exploded: boolean;
  focusFloor: number | null;
  showLabels: boolean;
  viewMode: "orbit" | "topdown";
};

export type BuildingViewerProps = {
  model: BuildingModel;
  selection: BuildingSelection;
  onSelect: (sel: BuildingSelection) => void;
  options: BuildingViewerOptions;
};

// ============================================================================
// HELPERS
// ============================================================================

function _makeMaterial(
  color: string,
  opts?: { transparent?: boolean; opacity?: number; emissive?: string }
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    transparent: opts?.transparent ?? true,
    opacity: opts?.opacity ?? 1,
    emissive: opts?.emissive ?? "#000000",
    roughness: 0.75,
    metalness: 0.05,
  });
}

function unitIsSelected(selection: BuildingSelection, unitKey: string): boolean {
  if (!selection) return false;
  return selection.unitKey === unitKey;
}

function roomIsSelected(
  selection: BuildingSelection,
  unitKey: string,
  roomId: string
): boolean {
  if (!selection) return false;
  return (
    selection.kind === "room" &&
    selection.unitKey === unitKey &&
    selection.roomId === roomId
  );
}

// ============================================================================
// ROOM MESH
// ============================================================================

function RoomMesh({
  unit,
  room,
  floorY,
  color,
  selected,
  onSelect,
  showLabels,
}: {
  unit: UnitModel;
  room: RoomModel;
  floorY: number;
  color: string;
  selected: boolean;
  onSelect: () => void;
  showLabels: boolean;
}) {
  const height = 0.08;
  const x = unit.position.x + room.rect.x + room.rect.width / 2;
  const z = unit.position.z + room.rect.z + room.rect.depth / 2;
  const y = floorY + height / 2;

  return (
    <mesh
      position={[x, y, z]}
      onPointerDown={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      <boxGeometry args={[room.rect.width, height, room.rect.depth]} />
      <meshStandardMaterial
        color={color}
        transparent
        opacity={selected ? 0.95 : 0.75}
        emissive={selected ? "#ffffff" : "#000000"}
      />
      {showLabels && (
        <Html
          position={[0, 0.08, 0]}
          center
          distanceFactor={16}
          style={{ pointerEvents: "none" }}
        >
          <div className="rounded bg-white/90 px-2 py-0.5 text-[10px] text-gray-900 shadow">
            {room.label}
          </div>
        </Html>
      )}
    </mesh>
  );
}

// ============================================================================
// UNIT MESH
// ============================================================================

function UnitMesh({
  unit,
  floorY,
  baseColor,
  accentColor,
  selection,
  onSelectUnit,
  showRooms,
  showLabels,
}: {
  unit: UnitModel;
  floorY: number;
  baseColor: string;
  accentColor: string;
  selection: BuildingSelection;
  onSelectUnit: () => void;
  showRooms: boolean;
  showLabels: boolean;
}) {
  const isUnitSelected = unitIsSelected(selection, unit.key);

  const unitOpacity = showRooms ? 0.35 : 0.9;
  const unitColor = isUnitSelected ? accentColor : baseColor;

  const cx = unit.position.x;
  const cz = unit.position.z;
  const cy = floorY + unit.size.height / 2;

  return (
    <group>
      <mesh
        position={[cx, cy, cz]}
        onPointerDown={(e) => {
          e.stopPropagation();
          onSelectUnit();
        }}
      >
        <boxGeometry args={[unit.size.width, unit.size.height, unit.size.depth]} />
        <meshStandardMaterial
          color={unitColor}
          transparent
          opacity={unitOpacity}
          emissive={isUnitSelected ? "#222222" : "#000000"}
        />
        {showLabels && (
          <Html
            position={[0, unit.size.height / 2 + 0.2, 0]}
            center
            distanceFactor={18}
            style={{ pointerEvents: "none" }}
          >
            <div className="rounded bg-white/90 px-2 py-0.5 text-[10px] text-gray-900 shadow">
              {unit.metadata.unitNumber}
            </div>
          </Html>
        )}
      </mesh>
    </group>
  );
}

// ============================================================================
// FLOOR GROUP
// ============================================================================

function FloorGroup({
  floor,
  yOffset,
  selection,
  onSelect,
  options,
}: {
  floor: FloorModel;
  yOffset: number;
  selection: BuildingSelection;
  onSelect: (sel: BuildingSelection) => void;
  options: BuildingViewerOptions;
}) {
  const slabY = yOffset + floor.slab.thickness / 2;
  const unitFloorY = yOffset + floor.slab.thickness;

  return (
    <group>
      {/* Floor slab */}
      <mesh position={[0, slabY, 0]}>
        <boxGeometry
          args={[floor.slab.width, floor.slab.thickness, floor.slab.depth]}
        />
        <meshStandardMaterial color="#e5e7eb" />
      </mesh>

      {/* Units */}
      {floor.units.map((unit) => (
        <group key={unit.key}>
          <UnitMesh
            unit={unit}
            floorY={unitFloorY}
            baseColor={floor.theme.baseColor}
            accentColor={floor.theme.accentColor}
            selection={selection}
            onSelectUnit={() => onSelect({ kind: "unit", unitKey: unit.key })}
            showRooms={options.showRooms}
            showLabels={options.showLabels}
          />

          {/* Rooms */}
          {options.showRooms &&
            unit.rooms.map((room) => {
              const roomSelected = roomIsSelected(selection, unit.key, room.id);
              const color = floor.theme.roomColors[room.kind];
              return (
                <RoomMesh
                  key={`${unit.key}:${room.id}`}
                  unit={unit}
                  room={room}
                  floorY={unitFloorY}
                  color={color}
                  selected={roomSelected}
                  showLabels={options.showLabels}
                  onSelect={() =>
                    onSelect({ kind: "room", unitKey: unit.key, roomId: room.id })
                  }
                />
              );
            })}
        </group>
      ))}

      {/* Floor label */}
      {options.showLabels && (
        <Html
          position={[0, yOffset + floor.slab.thickness + 0.2, -floor.slab.depth / 2 - 0.6]}
          center
          distanceFactor={18}
          style={{ pointerEvents: "none" }}
        >
          <div className="rounded bg-white/90 px-2 py-0.5 text-[10px] text-gray-900 shadow">
            {floor.label}
          </div>
        </Html>
      )}
    </group>
  );
}

// ============================================================================
// MAIN VIEWER
// ============================================================================

export default function BuildingViewer({
  model,
  selection,
  onSelect,
  options,
}: BuildingViewerProps) {
  const [hovered, _setHovered] = useState<
    { kind: "unit"; unitKey: string } | { kind: "room"; unitKey: string; roomId: string } | null
  >(null);

  const visibleFloors = useMemo(() => {
    if (options.focusFloor === null) return model.floors;
    return model.floors.filter((f) => f.index === options.focusFloor);
  }, [model.floors, options.focusFloor]);

  const explodedGap = model.spec.floorHeightM * 0.55;

  const hoverLabel = useMemo(() => {
    if (!hovered) return null;
    if (hovered.kind === "unit") return `Unit ${hovered.unitKey}`;
    return `Room ${hovered.roomId}`;
  }, [hovered]);

  // Camera position based on view mode
  const cameraPosition = useMemo(() => {
    if (options.viewMode === "topdown") {
      return [0, model.bounds.height + 15, 0] as [number, number, number];
    }
    return [
      model.bounds.width * 0.8,
      model.bounds.height * 0.6 + 6,
      model.bounds.depth * 0.9,
    ] as [number, number, number];
  }, [options.viewMode, model.bounds]);

  return (
    <div className="relative w-full h-full">
      <Canvas>
        <PerspectiveCamera makeDefault position={cameraPosition} fov={55} />
        <ambientLight intensity={0.55} />
        <directionalLight position={[12, 18, 8]} intensity={0.95} />
        <directionalLight position={[-10, 14, -10]} intensity={0.35} />

        <Grid
          args={[model.bounds.width * 2, model.bounds.depth * 2]}
          cellSize={1}
          cellThickness={1}
          sectionSize={5}
          sectionThickness={1.5}
          fadeDistance={70}
        />
        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={0.12}
          maxPolarAngle={options.viewMode === "topdown" ? Math.PI / 2 : Math.PI}
          minPolarAngle={options.viewMode === "topdown" ? 0 : 0}
        />

        {/* Building */}
        <group onPointerMissed={() => onSelect(null)}>
          {visibleFloors.map((floor) => {
            const y =
              floor.elevationM + (options.exploded ? floor.index * explodedGap : 0);

            return (
              <FloorGroup
                key={floor.index}
                floor={floor}
                yOffset={y}
                selection={selection}
                onSelect={onSelect}
                options={options}
              />
            );
          })}
        </group>
      </Canvas>

      {/* Hover legend (DOM overlay) */}
      {hoverLabel && (
        <div className="pointer-events-none absolute start-2 top-2 inline-flex items-center gap-2 rounded-md bg-white/90 px-2 py-1 text-xs text-gray-900 shadow">
          {hoverLabel}
        </div>
      )}

      {/* Room legend (DOM overlay) */}
      {options.showRooms && (
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          {(
            [
              ["living", "Living"],
              ["bedroom", "Bedroom"],
              ["bathroom", "Bathroom"],
              ["kitchen", "Kitchen"],
              ["hall", "Hall"],
            ] as Array<[RoomKind, string]>
          ).map(([k, label]) => (
            <div
              key={k}
              className="inline-flex items-center gap-2 rounded border bg-white px-2 py-1"
            >
              <span
                className="inline-block h-3 w-3 rounded"
                style={{
                  background: model.floors[0]?.theme.roomColors[k] ?? "#999",
                }}
              />
              <span>{label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
