'use client';

import ModuleViewTabs from '@/components/fm/ModuleViewTabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAutoTranslator } from '@/i18n/useAutoTranslator';
import { FileText, Stamp } from 'lucide-react';
import { FormEvent, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

type ContractFormState = {
  vendor: string;
  effective: string;
  expiry: string;
  sla: string;
  obligations: string;
};

export default function ComplianceContractPage() {
  const auto = useAutoTranslator('fm.compliance.contracts.new');
  const [form, setForm] = useState<ContractFormState>({
    vendor: '',
    effective: '',
    expiry: '',
    sla: '',
    obligations: '',
  });
  const [attachments, setAttachments] = useState<File[]>([]);
  const [errors, setErrors] = useState<Partial<Record<keyof ContractFormState, string>>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const hasErrors = useMemo(() => Object.keys(errors).length > 0, [errors]);

  const handleFieldChange =
    (field: keyof ContractFormState) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { value } = event.target;
      setForm((prev) => ({ ...prev, [field]: value }));
    };

  const validate = () => {
    const validationErrors: Partial<Record<keyof ContractFormState, string>> = {};
    if (!form.vendor.trim()) {
      validationErrors.vendor = auto('Vendor name is required.', 'form.validation.vendor');
    }
    if (!form.effective) {
      validationErrors.effective = auto('Provide an effective date.', 'form.validation.effective');
    }
    if (!form.expiry) {
      validationErrors.expiry = auto('Provide an expiry date.', 'form.validation.expiry');
    }
    if (form.effective && form.expiry && new Date(form.expiry) < new Date(form.effective)) {
      validationErrors.expiry = auto('Expiry must be after the effective date.', 'form.validation.order');
    }
    if (!form.sla.trim() || !/\d+/.test(form.sla)) {
      validationErrors.sla = auto('Enter SLA details with a numeric target (e.g., "2-hour response").', 'form.validation.sla');
    }
    if (form.obligations.trim().length < 20) {
      validationErrors.obligations = auto('Obligation summary should be at least 20 characters.', 'form.validation.obligations');
    }
    return validationErrors;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setGeneralError(null);
    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      return;
    }
    setSubmitting(true);
    let toastId: string | number | undefined;
    try {
      const payload = {
        scope: 'PROPERTY',
        scopeRef: form.vendor.trim(),
        contractorType: 'FM_COMPANY',
        contractorRef: form.vendor.trim(),
        startDate: form.effective,
        endDate: form.expiry,
        terms: form.obligations.trim(),
        sla: { critical: form.sla.trim() },
      };
      const formData = new FormData();
      formData.append('metadata', JSON.stringify(payload));
      attachments.forEach((file) => formData.append('certificates', file));

      toastId = toast.loading(auto('Submitting contract...', 'actions.progress'));
      const response = await fetch('/api/contracts', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error ?? 'Failed to submit contract');
      }
      toast.success(auto('Contract submitted for review.', 'actions.success'), { id: toastId });
      setForm({ vendor: '', effective: '', expiry: '', sla: '', obligations: '' });
      setAttachments([]);
      setErrors({});
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Request failed';
      setGeneralError(message);
      if (toastId) {
        toast.error(message, { id: toastId });
      } else {
        toast.error(message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleAttachmentClick = () => {
    fileInputRef.current?.click();
  };

  const handleAttachmentChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files ? Array.from(event.target.files) : [];
    if (!files.length) {
      return;
    }
    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg'];
    const maxSizeBytes = 10 * 1024 * 1024;
    const invalid = files.find((file) => !allowedTypes.includes(file.type) || file.size > maxSizeBytes);
    if (invalid) {
      toast.error(
        auto('Certificates must be PDF or image files smaller than 10MB.', 'form.validation.attachments'),
      );
      return;
    }
    setAttachments(files);
  };

  return (
    <div className="space-y-6">
      <ModuleViewTabs moduleId="compliance" />

      <header className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{auto('Vendor compliance', 'header.kicker')}</p>
        <h1 className="text-3xl font-semibold">{auto('Register a new contract', 'header.title')}</h1>
        <p className="text-muted-foreground">
          {auto('Log obligations, SLAs, and certifications for legal / compliance teams.', 'header.subtitle')}
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-4" encType="multipart/form-data">
        <Card>
          <CardHeader>
            <CardTitle>{auto('Contract metadata', 'form.title')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="vendor">{auto('Vendor name', 'form.vendor')}</Label>
                <Input
                  id="vendor"
                  placeholder="Example FM Services"
                  value={form.vendor}
                  onChange={handleFieldChange('vendor')}
                  disabled={submitting}
                  aria-invalid={Boolean(errors.vendor)}
                />
                {errors.vendor && <p className="text-sm text-destructive">{errors.vendor}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="effective">{auto('Effective date', 'form.effective')}</Label>
                <Input
                  id="effective"
                  type="date"
                  value={form.effective}
                  onChange={handleFieldChange('effective')}
                  disabled={submitting}
                  aria-invalid={Boolean(errors.effective)}
                />
                {errors.effective && <p className="text-sm text-destructive">{errors.effective}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="expiry">{auto('Expiry date', 'form.expiry')}</Label>
                <Input
                  id="expiry"
                  type="date"
                  value={form.expiry}
                  min={form.effective || undefined}
                  onChange={handleFieldChange('expiry')}
                  disabled={submitting}
                  aria-invalid={Boolean(errors.expiry)}
                />
                {errors.expiry && <p className="text-sm text-destructive">{errors.expiry}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="sla">{auto('Critical SLA', 'form.sla')}</Label>
                <Input
                  id="sla"
                  placeholder="2-hour emergency response"
                  value={form.sla}
                  onChange={handleFieldChange('sla')}
                  disabled={submitting}
                  aria-invalid={Boolean(errors.sla)}
                />
                {errors.sla && <p className="text-sm text-destructive">{errors.sla}</p>}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="obligations">{auto('Key obligations', 'form.obligations')}</Label>
              <Textarea
                id="obligations"
                rows={4}
                placeholder={auto('Provide quick summary of compliance clauses…', 'form.obligations.placeholder')}
                value={form.obligations}
                onChange={handleFieldChange('obligations')}
                disabled={submitting}
                aria-invalid={Boolean(errors.obligations)}
              />
              {errors.obligations && <p className="text-sm text-destructive">{errors.obligations}</p>}
            </div>
            <div className="space-y-2">
              <Label>{auto('Certificates', 'form.attachments')}</Label>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                multiple
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={handleAttachmentChange}
              />
              <Button type="button" variant="outline" onClick={handleAttachmentClick} disabled={submitting}>
                <FileText className="mr-2 h-4 w-4" />
                {auto('Attach certificates', 'actions.attach')}
              </Button>
              {attachments.length > 0 && (
                <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {attachments.map((file) => (
                    <li key={`${file.name}-${file.lastModified}`}>{file.name}</li>
                  ))}
                </ul>
              )}
            </div>
            {generalError && <p className="text-sm text-destructive">{generalError}</p>}
            {hasErrors && !generalError && (
              <p className="text-sm text-muted-foreground">
                {auto('Please resolve validation issues before submitting.', 'form.validation.resolve')}
              </p>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" disabled={submitting}>
            <Stamp className="mr-2 h-4 w-4" />
            {submitting ? auto('Submitting...', 'actions.submitting') : auto('Submit for legal review', 'actions.submit')}
          </Button>
        </div>
      </form>
    </div>
  );
}
