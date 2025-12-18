/**
 * Filter Presets Dropdown
 * 
 * UI component for saving, loading, and deleting filter presets.
 * Integrates with table filters via useFilterPresets hook.
 * 
 * @module components/common/FilterPresetsDropdown
 */

"use client";

import { useState, useCallback } from "react";
import { Star, StarOff, Trash2, Plus, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useFilterPresets, type EntityType } from "@/hooks/useFilterPresets";
import { logger } from "@/lib/logger";
import { useToast } from "@/hooks/use-toast";

export interface FilterPresetsDropdownProps {
  entityType: EntityType;
  currentFilters: Record<string, unknown>;
  currentSort?: { field: string; direction: "asc" | "desc" };
  onLoadPreset: (filters: Record<string, unknown>, sort?: { field: string; direction: "asc" | "desc" }) => void;
}

export function FilterPresetsDropdown({
  entityType,
  currentFilters,
  currentSort,
  onLoadPreset,
}: FilterPresetsDropdownProps) {
  const { presets, createPreset, deletePreset, isLoading } = useFilterPresets({ entityType });
  const { toast } = useToast();
  const [showPresetsDialog, setShowPresetsDialog] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [presetName, setPresetName] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSavePreset = useCallback(async () => {
    if (!presetName.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a name for the preset",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      await createPreset({
        entity_type: entityType,
        name: presetName.trim(),
        filters: currentFilters,
        sort: currentSort,
        is_default: isDefault,
      });

      toast({
        title: "Preset saved",
        description: `${presetName} has been saved`,
      });

      setShowSaveDialog(false);
      setPresetName("");
      setIsDefault(false);
    } catch (error) {
      logger.error("[FilterPresetsDropdown] Save failed", { error });
      toast({
        title: "Save failed",
        description: error instanceof Error ? error.message : "Failed to save preset",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }, [presetName, entityType, currentFilters, currentSort, isDefault, createPreset, toast]);

  const handleDeletePreset = useCallback(
    async (id: string, name: string) => {
      try {
        await deletePreset(id);
        toast({
          title: "Preset deleted",
          description: `${name} has been removed`,
        });
      } catch (error) {
        logger.error("[FilterPresetsDropdown] Delete failed", { error, presetId: id });
        toast({
          title: "Delete failed",
          description: error instanceof Error ? error.message : "Failed to delete preset",
          variant: "destructive",
        });
      }
    },
    [deletePreset, toast]
  );

  const handleLoadPreset = useCallback(
    (filters: Record<string, unknown>, sort?: { field: string; direction: "asc" | "desc" }) => {
      onLoadPreset(filters, sort);
      setShowPresetsDialog(false);
      toast({
        title: "Preset loaded",
        description: "Filters have been applied",
      });
    },
    [onLoadPreset, toast]
  );

  const hasActiveFilters = Object.keys(currentFilters).length > 0;

  return (
    <>
      <Button 
        variant="outline" 
        size="sm" 
        disabled={isLoading}
        onClick={() => setShowPresetsDialog(true)}
      >
        <Star className="w-4 h-4 me-2" />
        Presets
        <ChevronDown className="w-4 h-4 ms-2" />
      </Button>

      {/* Presets List Dialog */}
      <Dialog open={showPresetsDialog} onOpenChange={setShowPresetsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Filter Presets</DialogTitle>
            <DialogDescription>
              Load a saved filter configuration or save the current filters.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-2 max-h-[400px] overflow-y-auto">
            {(!presets || presets.length === 0) && (
              <div className="text-center py-8 text-muted-foreground">
                No saved presets. Save your current filters to get started.
              </div>
            )}

            {presets && presets.length > 0 && (
              <div className="space-y-1">
                {presets.map((preset) => (
                  <div
                    key={preset._id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent cursor-pointer"
                    onClick={() => handleLoadPreset(preset.filters, preset.sort)}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      {preset.is_default ? (
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400 flex-shrink-0" />
                      ) : (
                        <StarOff className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      )}
                      <span className="truncate">{preset.name}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePreset(preset._id, preset.name);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPresetsDialog(false)}>
              Close
            </Button>
            <Button
              onClick={() => {
                setShowPresetsDialog(false);
                setShowSaveDialog(true);
              }}
              disabled={!hasActiveFilters}
            >
              <Plus className="w-4 h-4 me-2" />
              Save Current Filters
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Save Preset Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Filter Preset</DialogTitle>
            <DialogDescription>
              Save your current filters for quick access later. You can create up to 20 presets per list type.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="preset-name">Preset Name</Label>
              <Input
                id="preset-name"
                placeholder="e.g., High Priority Overdue"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                maxLength={100}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="is-default"
                checked={isDefault}
                onCheckedChange={(checked) => setIsDefault(checked === true)}
              />
              <Label htmlFor="is-default" className="text-sm font-normal cursor-pointer">
                Set as default (auto-load on page open)
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSavePreset} disabled={isSaving || !presetName.trim()}>
              {isSaving ? "Saving..." : "Save Preset"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
