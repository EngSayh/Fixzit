'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import ModuleViewTabs from '@/components/fm/ModuleViewTabs';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAutoTranslator } from '@/i18n/useAutoTranslator';

type EmployeeDraft = {
  firstName: string;
  lastName: string;
  workEmail: string;
  jobTitle: string;
  department: string;
  employmentType: string;
  workModel: string;
  reportsTo: string;
  startDate: string;
  phone: string;
  compensationType: string;
  salary: string;
  notes: string;
};

const departments = [
  'Operations',
  'Facilities',
  'Finance',
  'Human Resources',
  'Procurement',
  'Technology',
  'Legal',
];

const employmentTypes = ['Full-time', 'Part-time', 'Contract', 'Internship'];
const workModels = ['On-site', 'Hybrid', 'Remote'];
const compensationTypes = ['Salary', 'Hourly', 'Contract'];

const defaultDraft: EmployeeDraft = {
  firstName: '',
  lastName: '',
  workEmail: '',
  jobTitle: '',
  department: '',
  employmentType: '',
  workModel: 'On-site',
  reportsTo: '',
  startDate: '',
  phone: '',
  compensationType: 'Salary',
  salary: '',
  notes: '',
};

export default function HRDirectoryCreatePage() {
  const auto = useAutoTranslator('fm.hr.directory.new');
  const router = useRouter();
  const [draft, setDraft] = useState<EmployeeDraft>(defaultDraft);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (field: keyof EmployeeDraft, value: string) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => setDraft(defaultDraft);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const response = await fetch('/api/hr/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || 'Failed to create employee');
      }

      toast.success(auto('Employee added to directory', 'toast.success'));
      resetForm();
      router.push('/fm/hr/directory');
    } catch (error) {
      const description = error instanceof Error ? error.message : undefined;
      toast.error(auto('Unable to create employee', 'toast.error'), { description });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <ModuleViewTabs moduleId="hr" />

      <div className="space-y-2">
        <p className="text-sm text-muted-foreground uppercase tracking-wide">
          {auto('HR / Directory', 'breadcrumbs')}
        </p>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            {auto('Add employee to directory', 'header.title')}
          </h1>
          <p className="text-muted-foreground">
            {auto(
              'Capture onboarding details, reporting lines, and compensation visibility in one flow.',
              'header.subtitle'
            )}
          </p>
        </div>
      </div>

      <form className="space-y-6" onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{auto('Profile basics', 'sections.profile.title')}</CardTitle>
              <CardDescription>
                {auto(
                  'Used for the employee directory, approvals, and payroll integrations.',
                  'sections.profile.description'
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName">{auto('First name', 'form.firstName.label')}</Label>
                  <Input
                    id="firstName"
                    name="firstName"
                    placeholder={auto('Nora', 'form.firstName.placeholder')}
                    value={draft.firstName}
                    onChange={(event) => handleChange('firstName', event.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">{auto('Last name', 'form.lastName.label')}</Label>
                  <Input
                    id="lastName"
                    name="lastName"
                    placeholder={auto('Al Hashmi', 'form.lastName.placeholder')}
                    value={draft.lastName}
                    onChange={(event) => handleChange('lastName', event.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="workEmail">{auto('Work email', 'form.workEmail.label')}</Label>
                <Input
                  id="workEmail"
                  name="workEmail"
                  type="email"
                  placeholder="nora.alhashmi@example.com"
                  value={draft.workEmail}
                  onChange={(event) => handleChange('workEmail', event.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">{auto('Phone number', 'form.phone.label')}</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="+971 50 555 0102"
                  value={draft.phone}
                  onChange={(event) => handleChange('phone', event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reportsTo">{auto('Manager / Reports to', 'form.reportsTo.label')}</Label>
                <Input
                  id="reportsTo"
                  name="reportsTo"
                  placeholder={auto('e.g. Mariam Al Nuaimi', 'form.reportsTo.placeholder')}
                  value={draft.reportsTo}
                  onChange={(event) => handleChange('reportsTo', event.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{auto('Role details', 'sections.role.title')}</CardTitle>
              <CardDescription>
                {auto('Appears in dashboards, workflows, and approval routing.', 'sections.role.description')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="jobTitle">{auto('Job title', 'form.jobTitle.label')}</Label>
                <Input
                  id="jobTitle"
                  name="jobTitle"
                  placeholder={auto('Facilities Coordinator', 'form.jobTitle.placeholder')}
                  value={draft.jobTitle}
                  onChange={(event) => handleChange('jobTitle', event.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>{auto('Department', 'form.department.label')}</Label>
                <Select value={draft.department} onValueChange={(value) => handleChange('department', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder={auto('Select department', 'form.department.placeholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((department) => (
                      <SelectItem key={department} value={department}>
                        {department}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>{auto('Employment type', 'form.employmentType.label')}</Label>
                  <Select
                    value={draft.employmentType}
                    onValueChange={(value) => handleChange('employmentType', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={auto('Select type', 'form.employmentType.placeholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      {employmentTypes.map((employmentType) => (
                        <SelectItem key={employmentType} value={employmentType}>
                          {employmentType}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{auto('Work model', 'form.workModel.label')}</Label>
                  <Select value={draft.workModel} onValueChange={(value) => handleChange('workModel', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder={auto('Select model', 'form.workModel.placeholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      {workModels.map((workModel) => (
                        <SelectItem key={workModel} value={workModel}>
                          {workModel}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="startDate">{auto('Start date', 'form.startDate.label')}</Label>
                <Input
                  id="startDate"
                  name="startDate"
                  type="date"
                  value={draft.startDate}
                  onChange={(event) => handleChange('startDate', event.target.value)}
                  required
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{auto('Compensation & notes', 'sections.compensation.title')}</CardTitle>
            <CardDescription>
              {auto(
                'This data helps payroll and finance teams forecast expenses and approvals.',
                'sections.compensation.description'
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>{auto('Compensation type', 'form.compensationType.label')}</Label>
                <Select
                  value={draft.compensationType}
                  onValueChange={(value) => handleChange('compensationType', value)}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={auto('Select compensation type', 'form.compensationType.placeholder')}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {compensationTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="salary">{auto('Base pay', 'form.salary.label')}</Label>
                <Input
                  id="salary"
                  name="salary"
                  type="number"
                  min="0"
                  step="100"
                  placeholder="18000"
                  value={draft.salary}
                  onChange={(event) => handleChange('salary', event.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">{auto('Notes & onboarding checklist', 'form.notes.label')}</Label>
              <Textarea
                id="notes"
                name="notes"
                rows={4}
                placeholder={auto(
                  'Entry permit ready, IT ticket submitted, add to payroll before 1 Dec.',
                  'form.notes.placeholder'
                )}
                value={draft.notes}
                onChange={(event) => handleChange('notes', event.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/fm/hr/directory')}
            disabled={submitting}
          >
            {auto('Cancel', 'actions.cancel')}
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? auto('Saving...', 'actions.saving') : auto('Create employee', 'actions.submit')}
          </Button>
        </div>
      </form>
    </div>
  );
}
