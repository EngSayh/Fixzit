'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import ModuleViewTabs from '@/components/fm/ModuleViewTabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useAutoTranslator } from '@/i18n/useAutoTranslator';

const SEVERITIES = ['critical', 'high', 'medium', 'low'] as const;
const CHANNELS = ['email', 'slack', 'bridge', 'pagerduty'] as const;
type SeverityOption = typeof SEVERITIES[number];
type ChannelOption = typeof CHANNELS[number];

type EscalationForm = {
  incidentId: string;
  service: string;
  areas: string;
  severity: SeverityOption;
  detectedAt: string;
  summary: string;
  symptoms: string;
  mitigation: string;
  blockers: string;
  executiveBrief: string;
  stakeholders: string;
  preferredChannel: ChannelOption;
  requiresDowntime: boolean;
  needsCustomerComms: boolean;
  legalReview: boolean;
};

export default function NewEscalationPage() {
  const auto = useAutoTranslator('fm.support.escalations');
  const [form, setForm] = useState<EscalationForm>({
    incidentId: '',
    service: '',
    areas: '',
    severity: 'critical',
    detectedAt: '',
    summary: '',
    symptoms: '',
    mitigation: '',
    blockers: '',
    executiveBrief: '',
    stakeholders: '',
    preferredChannel: 'bridge',
    requiresDowntime: false,
    needsCustomerComms: true,
    legalReview: false,
  });
  const [submitting, setSubmitting] = useState(false);

  const updateField = <K extends keyof EscalationForm>(key: K, value: EscalationForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const canSubmit =
    form.incidentId.trim().length > 0 &&
    form.service.trim().length > 0 &&
    form.summary.trim().length > 30 &&
    form.symptoms.trim().length > 20;

  const handleSubmit = async () => {
    setSubmitting(true);
    const toastId = toast.loading(auto('Submitting escalation…', 'toast.submitting'));
    try {
      await new Promise((resolve) => setTimeout(resolve, 1400));
      toast.success(auto('Escalation sent to duty manager', 'toast.success'), { id: toastId });
    } catch (error) {
      toast.error(auto('Failed to escalate. Please try again.', 'toast.error'), { id: toastId });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <ModuleViewTabs moduleId="support" />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {auto('Escalations', 'breadcrumbs.scope')}
          </p>
          <h1 className="text-3xl font-semibold text-foreground">
            {auto('Major incident escalation', 'header.title')}
          </h1>
          <p className="text-muted-foreground">
            {auto(
              'Summarize customer impact, mitigation timeline, and stakeholder comms.',
              'header.subtitle'
            )}
          </p>
        </div>
        <Button onClick={handleSubmit} disabled={!canSubmit || submitting}>
          {submitting ? auto('Escalating…', 'actions.submitting') : auto('Send escalation', 'actions.submit')}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{auto('Incident context', 'sections.context.title')}</CardTitle>
            <CardDescription>
              {auto('Reference IDs and impacted services.', 'sections.context.desc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <Label>{auto('Incident ID', 'fields.incidentId.label')}</Label>
                <Input
                  value={form.incidentId}
                  placeholder="INC-2045"
                  onChange={(event) => updateField('incidentId', event.target.value)}
                />
              </div>
              <div>
                <Label>{auto('Service / module', 'fields.service.label')}</Label>
                <Input
                  value={form.service}
                  placeholder={auto('e.g., Work Orders API', 'fields.service.placeholder')}
                  onChange={(event) => updateField('service', event.target.value)}
                />
              </div>
              <div>
                <Label>{auto('Impacted areas', 'fields.areas.label')}</Label>
                <Input
                  value={form.areas}
                  placeholder={auto('Tower A, mobile app, API clients…', 'fields.areas.placeholder')}
                  onChange={(event) => updateField('areas', event.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>{auto('Severity', 'fields.severity.label')}</Label>
                <Select
                  value={form.severity}
                  onValueChange={(value: string) => updateField('severity', value as SeverityOption)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SEVERITIES.map((option) => (
                      <SelectItem key={option} value={option}>
                        {auto(option, `severities.${option}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{auto('Detected at', 'fields.detectedAt.label')}</Label>
                <Input
                  type="datetime-local"
                  value={form.detectedAt}
                  onChange={(event) => updateField('detectedAt', event.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{auto('Readiness checklist', 'sections.readiness.title')}</CardTitle>
            <CardDescription>
              {auto('Operations toggles for command center review.', 'sections.readiness.desc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-border/70 px-3 py-2">
              <div>
                <p className="font-medium text-sm">
                  {auto('Downtime required', 'fields.requiresDowntime.label')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {auto('Customer impact expected during mitigation.', 'fields.requiresDowntime.desc')}
                </p>
              </div>
              <Switch
                checked={form.requiresDowntime}
                onCheckedChange={(value) => updateField('requiresDowntime', Boolean(value))}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/70 px-3 py-2">
              <div>
                <p className="font-medium text-sm">
                  {auto('Customer communications needed', 'fields.needsCustomerComms.label')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {auto('Status page or email must be sent.', 'fields.needsCustomerComms.desc')}
                </p>
              </div>
              <Switch
                checked={form.needsCustomerComms}
                onCheckedChange={(value) => updateField('needsCustomerComms', Boolean(value))}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/70 px-3 py-2">
              <div>
                <p className="font-medium text-sm">
                  {auto('Legal / compliance review', 'fields.legalReview.label')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {auto('Data breach or policy concerns involved.', 'fields.legalReview.desc')}
                </p>
              </div>
              <Switch
                checked={form.legalReview}
                onCheckedChange={(value) => updateField('legalReview', Boolean(value))}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{auto('Timeline & actions', 'sections.timeline.title')}</CardTitle>
          <CardDescription>
            {auto('Summaries consumed by executives and incident managers.', 'sections.timeline.desc')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>{auto('Executive summary', 'fields.summary.label')}</Label>
            <Textarea
              rows={4}
              value={form.summary}
              placeholder={auto(
                'Two-sentence view: what broke, who is impacted, when we expect recovery.',
                'fields.summary.placeholder'
              )}
              onChange={(event) => updateField('summary', event.target.value)}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>{auto('Symptoms / alarms', 'fields.symptoms.label')}</Label>
              <Textarea
                rows={4}
                value={form.symptoms}
                placeholder={auto('Include monitors, dashboards, or user reports.', 'fields.symptoms.placeholder')}
                onChange={(event) => updateField('symptoms', event.target.value)}
              />
            </div>
            <div>
              <Label>{auto('Mitigation plan', 'fields.mitigation.label')}</Label>
              <Textarea
                rows={4}
                value={form.mitigation}
                placeholder={auto('Actions taken, owners, and ETA for next update.', 'fields.mitigation.placeholder')}
                onChange={(event) => updateField('mitigation', event.target.value)}
              />
            </div>
          </div>
          <div>
            <Label>{auto('Blockers / requests', 'fields.blockers.label')}</Label>
            <Textarea
              rows={3}
              value={form.blockers}
              placeholder={auto('List tooling gaps, approvals needed, or resource requests.', 'fields.blockers.placeholder')}
              onChange={(event) => updateField('blockers', event.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{auto('Communications', 'sections.comms.title')}</CardTitle>
            <CardDescription>
              {auto('Craft updates for executives and customer stakeholders.', 'sections.comms.desc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>{auto('Executive brief', 'fields.executiveBrief.label')}</Label>
              <Textarea
                rows={4}
                value={form.executiveBrief}
                placeholder={auto('Message for CEO/VP distribution', 'fields.executiveBrief.placeholder')}
                onChange={(event) => updateField('executiveBrief', event.target.value)}
              />
            </div>
            <div>
              <Label>{auto('Stakeholders to notify', 'fields.stakeholders.label')}</Label>
              <Input
                value={form.stakeholders}
                placeholder="ops@company.com, leadership@company.com"
                onChange={(event) => updateField('stakeholders', event.target.value)}
              />
            </div>
            <div>
              <Label>{auto('Preferred channel', 'fields.preferredChannel.label')}</Label>
                <Select
                  value={form.preferredChannel}
                  onValueChange={(value: string) => updateField('preferredChannel', value as ChannelOption)}
                >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CHANNELS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {auto(option, `channels.${option}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{auto('Brief preview', 'sections.preview.title')}</CardTitle>
            <CardDescription>
              {auto('Snapshot forwarded to duty manager.', 'sections.preview.desc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              <span className="font-semibold text-foreground">{auto('Incident:', 'sections.preview.incident')}</span>{' '}
              {form.incidentId || auto('Pending incident ID', 'sections.preview.emptyIncident')}
            </p>
            <p>
              <span className="font-semibold text-foreground">{auto('Severity:', 'sections.preview.severity')}</span>{' '}
              {auto(form.severity, `severities.${form.severity}`)}
            </p>
            <p>
              <span className="font-semibold text-foreground">{auto('Summary:', 'sections.preview.summary')}</span>{' '}
              {form.summary || auto('Summary will populate here once provided.', 'sections.preview.emptySummary')}
            </p>
            <p>
              <span className="font-semibold text-foreground">{auto('Next action:', 'sections.preview.next')}</span>{' '}
              {form.mitigation || auto('Awaiting mitigation details', 'sections.preview.emptyNext')}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
