'use client';

import ModuleViewTabs from '@/components/fm/ModuleViewTabs';
import { useFmOrgGuard } from '@/components/fm/useFmOrgGuard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAutoTranslator } from '@/i18n/useAutoTranslator';
import { CalendarCheck2, ClipboardSignature } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { FormEvent, useMemo, useState } from 'react';
import { toast } from 'sonner';

type AuditFormState = {
  name: string;
  owner: string;
  start: string;
  end: string;
  scope: string;
};

export default function ComplianceAuditPlanPage() {
  const { hasOrgContext, guard, supportBanner, orgId } = useFmOrgGuard({ moduleId: 'compliance' });
  const auto = useAutoTranslator('fm.compliance.audits.new');
  const router = useRouter();
  const [formState, setFormState] = useState<AuditFormState>({
    name: '',
    owner: '',
    start: '',
    end: '',
    scope: '',
  });
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof AuditFormState, string>>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setSubmitting] = useState(false);

  const hasErrors = useMemo(() => Object.keys(fieldErrors).length > 0, [fieldErrors]);

  const handleFieldChange =
    (field: keyof AuditFormState) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setFormState((prev) => ({ ...prev, [field]: event.target.value }));
    };

  const validate = () => {
    const errors: Partial<Record<keyof AuditFormState, string>> = {};
    if (!formState.name.trim()) {
      errors.name = auto('An audit name is required.', 'validation.name');
    }
    if (!formState.owner.trim()) {
      errors.owner = auto('Assign an owner for accountability.', 'validation.owner');
    }
    if (!formState.start) {
      errors.start = auto('Select a start date.', 'validation.start');
    }
    if (!formState.end) {
      errors.end = auto('Select an end date.', 'validation.end');
    }
    if (formState.start && formState.end) {
      const startDate = new Date(formState.start);
      const endDate = new Date(formState.end);
      if (endDate < startDate) {
        errors.end = auto('End date must be after the start date.', 'validation.order');
      }
    }
    if (!formState.scope.trim()) {
      errors.scope = auto('Detail the scope for the audit.', 'validation.scope');
    }
    return errors;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError(null);
    const validationErrors = validate();
    setFieldErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        name: formState.name.trim(),
        owner: formState.owner.trim(),
        startDate: formState.start,
        endDate: formState.end,
        scope: formState.scope.trim(),
      };

      const response = await fetch('/api/compliance/audits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(orgId && { 'x-tenant-id': orgId }),
        } as HeadersInit,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body?.error ?? auto('Failed to save audit plan.', 'feedback.error'));
      }

      toast.success(auto('Audit plan published successfully.', 'feedback.success'));
      setFormState({ name: '', owner: '', start: '', end: '', scope: '' });
      setFieldErrors({});
      router.push('/fm/compliance/audits');
    } catch (error) {
      const message = error instanceof Error ? error.message : auto('Unable to submit audit.', 'feedback.error');
      setSubmitError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!hasOrgContext || !orgId) {
    return guard;
  }

  return (
    <div className="space-y-6">
      <ModuleViewTabs moduleId="compliance" />
      {supportBanner}

      <header className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{auto('Audit program', 'header.kicker')}</p>
        <h1 className="text-3xl font-semibold">{auto('Create a new audit plan', 'header.title')}</h1>
        <p className="text-muted-foreground">
          {auto('Schedule internal or external audits with owners and timelines.', 'header.subtitle')}
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>{auto('Audit scope', 'form.title')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">{auto('Audit name', 'form.name')}</Label>
                <Input
                  id="name"
                  placeholder={auto('ISO 27001 Surveillance', 'form.name.placeholder')}
                  value={formState.name}
                  onChange={handleFieldChange('name')}
                  disabled={isSubmitting}
                  aria-invalid={Boolean(fieldErrors.name)}
                />
                {fieldErrors.name && <p className="text-sm text-destructive">{fieldErrors.name}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="owner">{auto('Owner', 'form.owner')}</Label>
                <Input
                  id="owner"
                  placeholder="Information Security"
                  value={formState.owner}
                  onChange={handleFieldChange('owner')}
                  disabled={isSubmitting}
                  aria-invalid={Boolean(fieldErrors.owner)}
                />
                {fieldErrors.owner && <p className="text-sm text-destructive">{fieldErrors.owner}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="start">{auto('Start date', 'form.start')}</Label>
                <Input
                  id="start"
                  type="date"
                  value={formState.start}
                  onChange={handleFieldChange('start')}
                  disabled={isSubmitting}
                  aria-invalid={Boolean(fieldErrors.start)}
                />
                {fieldErrors.start && <p className="text-sm text-destructive">{fieldErrors.start}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="end">{auto('End date', 'form.end')}</Label>
                <Input
                  id="end"
                  type="date"
                  value={formState.end}
                  min={formState.start || undefined}
                  onChange={handleFieldChange('end')}
                  disabled={isSubmitting}
                  aria-invalid={Boolean(fieldErrors.end)}
                />
                {fieldErrors.end && <p className="text-sm text-destructive">{fieldErrors.end}</p>}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="scope">{auto('Scope & objectives', 'form.scope')}</Label>
              <Textarea
                id="scope"
                rows={4}
                placeholder={auto('Include assets, teams, regulations…', 'form.scope.placeholder')}
                value={formState.scope}
                onChange={handleFieldChange('scope')}
                disabled={isSubmitting}
                aria-invalid={Boolean(fieldErrors.scope)}
              />
              {fieldErrors.scope && <p className="text-sm text-destructive">{fieldErrors.scope}</p>}
            </div>
            {submitError && (
              <p className="text-sm text-destructive" role="alert">
                {submitError}
              </p>
            )}
            {hasErrors && !submitError && (
              <p className="text-sm text-muted-foreground">{auto('Resolve the highlighted fields to continue.', 'validation.resolve')}</p>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/fm/compliance/audits')}
            disabled={isSubmitting}
          >
            <CalendarCheck2 className="me-2 h-4 w-4" />
            {auto('Cancel and go back', 'actions.cancel')}
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              auto('Publishing...', 'actions.publishing')
            ) : (
              <>
                <ClipboardSignature className="me-2 h-4 w-4" />
                {auto('Publish plan', 'actions.publish')}
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
