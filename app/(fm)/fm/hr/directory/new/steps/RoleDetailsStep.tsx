"use client";

import {
  Select,
  SelectItem,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { EmployeeDraft, Lookups, TranslateFn } from "../types";

type Props = {
  t: TranslateFn;
  draft: EmployeeDraft;
  lookups: Lookups;
  onChange: (field: keyof EmployeeDraft, value: string) => void;
  onOpenLookups: () => void;
  loading: boolean;
};

export default function RoleDetailsStep({
  t,
  draft,
  lookups,
  onChange,
  onOpenLookups,
  loading,
}: Props) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="jobTitle">
          {t("auto.fm.hr.directory.new.form.jobTitle.label", "Job title")}
        </Label>
        <Input
          id="jobTitle"
          name="jobTitle"
          placeholder={t(
            "auto.fm.hr.directory.new.form.jobTitle.placeholder",
            "Facilities Coordinator",
          )}
          value={draft.jobTitle}
          onChange={(event) => onChange("jobTitle", event.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label>
          {t("auto.fm.hr.directory.new.form.department.label", "Department")}
        </Label>
        <Select
          value={draft.department}
          onValueChange={(value) => onChange("department", value)}
          disabled={loading && lookups.departments.length === 0}
          onFocus={onOpenLookups}
          placeholder={t(
            "auto.fm.hr.directory.new.form.department.placeholder",
            "Select department",
          )}
          className="w-full bg-muted border-input text-foreground"
        >
          {lookups.departments.map((department) => (
            <SelectItem key={department} value={department}>
              {department}
            </SelectItem>
          ))}
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>
            {t(
              "auto.fm.hr.directory.new.form.employmentType.label",
              "Employment type",
            )}
          </Label>
          <Select
            value={draft.employmentType}
            onValueChange={(value) => onChange("employmentType", value)}
            disabled={loading && lookups.employmentTypes.length === 0}
            onFocus={onOpenLookups}
            placeholder={t(
              "auto.fm.hr.directory.new.form.employmentType.placeholder",
              "Select type",
            )}
            className="w-full bg-muted border-input text-foreground"
          >
            {lookups.employmentTypes.map((employmentType) => (
              <SelectItem key={employmentType} value={employmentType}>
                {employmentType}
              </SelectItem>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label>
            {t("auto.fm.hr.directory.new.form.workModel.label", "Work model")}
          </Label>
          <Select
            value={draft.workModel}
            onValueChange={(value) => onChange("workModel", value)}
            disabled={loading && lookups.workModels.length === 0}
            onFocus={onOpenLookups}
            placeholder={t(
              "auto.fm.hr.directory.new.form.workModel.placeholder",
              "Select model",
            )}
            className="w-full bg-muted border-input text-foreground"
          >
            {lookups.workModels.map((workModel) => (
              <SelectItem key={workModel} value={workModel}>
                {workModel}
              </SelectItem>
            ))}
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="startDate">
          {t("auto.fm.hr.directory.new.form.startDate.label", "Start date")}
        </Label>
        <Input
          id="startDate"
          name="startDate"
          type="date"
          value={draft.startDate}
          onChange={(event) => onChange("startDate", event.target.value)}
          required
        />
      </div>
    </div>
  );
}
