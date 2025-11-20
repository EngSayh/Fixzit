'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CardGridSkeleton } from '@/components/skeletons';
import { useAutoTranslator } from '@/i18n/useAutoTranslator';
import ModuleViewTabs from '@/components/fm/ModuleViewTabs';
import { Clock, Calendar, Mail } from 'lucide-react';
import { useFmOrgGuard } from '@/components/fm/useFmOrgGuard';

const REPORT_TYPES = [
  { value: 'workorders', label: 'Work Orders Summary' },
  { value: 'finance', label: 'Financial Statement' },
  { value: 'assets', label: 'Asset Inventory' },
  { value: 'compliance', label: 'Compliance Audit' },
  { value: 'occupancy', label: 'Occupancy Analysis' },
  { value: 'maintenance', label: 'Maintenance History' },
];

const FREQUENCIES = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
];

const FORMATS = [
  { value: 'pdf', label: 'PDF Document' },
  { value: 'excel', label: 'Excel Spreadsheet' },
  { value: 'csv', label: 'CSV File' },
];

export default function NewSchedulePage() {
  const auto = useAutoTranslator('fm.reports.schedules.new');
  const { data: session } = useSession();
  const router = useRouter();
  const { hasOrgContext, guard, orgId, supportBanner } = useFmOrgGuard({ moduleId: 'reports' });
  const [reportType, setReportType] = useState('');
  const [title, setTitle] = useState('');
  const [frequency, setFrequency] = useState('monthly');
  const [format, setFormat] = useState('pdf');
  const [recipients, setRecipients] = useState('');
  const [startDate, setStartDate] = useState('');
  const [creating, setCreating] = useState(false);

  if (!session) {
    return <CardGridSkeleton count={1} />;
  }

  if (!hasOrgContext || !orgId) {
    return guard;
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    const toastId = toast.loading(auto('Creating schedule...', 'toast.loading'));

    try {
      const res = await fetch('/api/fm/reports/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          reportType,
          frequency,
          format,
          recipients,
          startDate,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Failed to create schedule');
      }

      toast.success(auto('Schedule created successfully', 'toast.success'), { id: toastId });
      router.push('/fm/reports');
    } catch (error) {
      const message = error instanceof Error ? error.message : auto('Failed to create schedule', 'toast.error');
      toast.error(message, { id: toastId });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <ModuleViewTabs moduleId="reports" />
      {supportBanner}
      
      <div>
        <div className="flex items-center gap-2">
          <Clock className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">
            {auto('Schedule Recurring Report', 'header.title')}
          </h1>
        </div>
        <p className="text-muted-foreground">
          {auto('Automatically generate and deliver reports on a regular schedule', 'header.subtitle')}
        </p>
      </div>

      <div className="max-w-2xl">
        <form onSubmit={handleCreate} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{auto('Schedule Configuration', 'config.title')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reportType">{auto('Report Type', 'fields.type')}</Label>
                <Select value={reportType} onValueChange={setReportType} required>
                  <SelectTrigger id="reportType">
                    <SelectValue placeholder={auto('Select report type...', 'fields.typePlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {REPORT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {auto(type.label, `types.${type.value}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">{auto('Schedule Name', 'fields.title')}</Label>
                <Input
                  id="title"
                  placeholder={auto('e.g. Monthly Financial Report', 'fields.titlePlaceholder')}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="frequency" className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {auto('Frequency', 'fields.frequency')}
                </Label>
                <Select value={frequency} onValueChange={setFrequency}>
                  <SelectTrigger id="frequency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FREQUENCIES.map((freq) => (
                      <SelectItem key={freq.value} value={freq.value}>
                        {auto(freq.label, `frequencies.${freq.value}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="startDate">{auto('Start Date', 'fields.startDate')}</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="format">{auto('Output Format', 'fields.format')}</Label>
                <Select value={format} onValueChange={setFormat}>
                  <SelectTrigger id="format">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FORMATS.map((fmt) => (
                      <SelectItem key={fmt.value} value={fmt.value}>
                        {auto(fmt.label, `formats.${fmt.value}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                {auto('Delivery', 'delivery.title')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="recipients">{auto('Email Recipients', 'fields.recipients')}</Label>
                <Input
                  id="recipients"
                  type="email"
                  placeholder={auto('user1@example.com, user2@example.com', 'fields.recipientsPlaceholder')}
                  value={recipients}
                  onChange={(e) => setRecipients(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  {auto('Separate multiple emails with commas', 'fields.recipientsHint')}
                </p>
              </div>
            </CardContent>
          </Card>

          <Button type="submit" disabled={creating || !reportType || !title || !recipients} className="w-full">
            <Clock className="w-4 h-4 me-2" />
            {auto('Create Schedule', 'submit')}
          </Button>
        </form>

        <div className="mt-6 p-4 border border-dashed border-border rounded-lg">
          <p className="text-sm text-muted-foreground">
            {auto('Schedules will be created via /api/reports/schedules', 'info.apiEndpoint')}
          </p>
        </div>
      </div>
    </div>
  );
}
