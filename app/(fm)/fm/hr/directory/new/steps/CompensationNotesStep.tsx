"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { EmployeeDraft, Lookups, TranslateFn } from "../types";

type Props = {
  t: TranslateFn;
  draft: EmployeeDraft;
  lookups: Lookups;
  onChange: (field: keyof EmployeeDraft, value: string) => void;
  onOpenLookups: () => void;
  loading: boolean;
};

export default function CompensationNotesStep({
  t,
  draft,
  lookups,
  onChange,
  onOpenLookups,
  loading,
}: Props) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>
            {t(
              "auto.fm.hr.directory.new.form.compensationType.label",
              "Compensation type",
            )}
          </Label>
          <Select
            value={draft.compensationType}
            onValueChange={(value) => onChange("compensationType", value)}
            disabled={loading && lookups.compensationTypes.length === 0}
            onFocus={onOpenLookups}
            placeholder={t(
              "auto.fm.hr.directory.new.form.compensationType.placeholder",
              "Select compensation type",
            )}
            className="w-full sm:w-40 bg-muted border-input text-foreground"
          >
            <SelectTrigger></SelectTrigger>
            <SelectContent>
              {lookups.compensationTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="salary">
            {t("auto.fm.hr.directory.new.form.salary.label", "Base pay")}
          </Label>
          <Input
            id="salary"
            name="salary"
            type="number"
            min="0"
            step="100"
            placeholder="18000"
            value={draft.salary}
            onChange={(event) => onChange("salary", event.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">
          {t(
            "auto.fm.hr.directory.new.form.notes.label",
            "Notes & onboarding checklist",
          )}
        </Label>
        <Textarea
          id="notes"
          name="notes"
          rows={4}
          placeholder={t(
            "auto.fm.hr.directory.new.form.notes.placeholder",
            "Entry permit ready, IT ticket submitted, add to payroll before 1 Dec.",
          )}
          value={draft.notes}
          onChange={(event) => onChange("notes", event.target.value)}
        />
      </div>
    </div>
  );
}
