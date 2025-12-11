"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { EmployeeDraft, TranslateFn } from "../types";

type Props = {
  t: TranslateFn;
  draft: EmployeeDraft;
  onChange: (field: keyof EmployeeDraft, value: string) => void;
};

export default function ProfileBasicsStep({ t, draft, onChange }: Props) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="firstName">
          {t(
            "auto.fm.hr.directory.new.form.firstName.label",
            "First name",
          )}
        </Label>
        <Input
          id="firstName"
          name="firstName"
          placeholder={t(
            "auto.fm.hr.directory.new.form.firstName.placeholder",
            "Nora",
          )}
          value={draft.firstName}
          onChange={(event) => onChange("firstName", event.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="lastName">
          {t("auto.fm.hr.directory.new.form.lastName.label", "Last name")}
        </Label>
        <Input
          id="lastName"
          name="lastName"
          placeholder={t(
            "auto.fm.hr.directory.new.form.lastName.placeholder",
            "Al Hashmi",
          )}
          value={draft.lastName}
          onChange={(event) => onChange("lastName", event.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="workEmail">
          {t("auto.fm.hr.directory.new.form.workEmail.label", "Work email")}
        </Label>
        <Input
          id="workEmail"
          name="workEmail"
          type="email"
          placeholder="nora.alhashmi@example.com"
          value={draft.workEmail}
          onChange={(event) => onChange("workEmail", event.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">
          {t("auto.fm.hr.directory.new.form.phone.label", "Phone number")}
        </Label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          placeholder="+966 50 555 0102"
          value={draft.phone}
          onChange={(event) => onChange("phone", event.target.value)}
        />
      </div>

      <div className="space-y-2 lg:col-span-2">
        <Label htmlFor="reportsTo">
          {t(
            "auto.fm.hr.directory.new.form.reportsTo.label",
            "Manager / Reports to",
          )}
        </Label>
        <Input
          id="reportsTo"
          name="reportsTo"
          placeholder={t(
            "auto.fm.hr.directory.new.form.reportsTo.placeholder",
            "e.g. Mariam Al Nuaimi",
          )}
          value={draft.reportsTo}
          onChange={(event) => onChange("reportsTo", event.target.value)}
        />
      </div>

    </div>
  );
}
