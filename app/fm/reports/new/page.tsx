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
import { Textarea } from '@/components/ui/textarea';
import { CardGridSkeleton } from '@/components/skeletons';
import { useAutoTranslator } from '@/i18n/useAutoTranslator';
import ModuleViewTabs from '@/components/fm/ModuleViewTabs';
import { FileText, Calendar, Download } from 'lucide-react';
import { useFmOrgGuard } from '@/components/fm/useFmOrgGuard';

const REPORT_TYPES = [
  { value: 'workorders', label: 'Work Orders Summary' },
  { value: 'finance', label: 'Financial Statement' },
  { value: 'assets', label: 'Asset Inventory' },
  { value: 'compliance', label: 'Compliance Audit' },
  { value: 'occupancy', label: 'Occupancy Analysis' },
  { value: 'maintenance', label: 'Maintenance History' },
];

const DATE_RANGES = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'quarter', label: 'This Quarter' },
  { value: 'year', label: 'This Year' },
  { value: 'custom', label: 'Custom Range' },
];

const FORMATS = [
  { value: 'pdf', label: 'PDF Document' },
  { value: 'excel', label: 'Excel Spreadsheet' },
  { value: 'csv', label: 'CSV File' },
];

export default function NewReportPage() {
  const auto = useAutoTranslator('fm.reports.new');
  const { data: session } = useSession();
  const router = useRouter();
  const { hasOrgContext, guard, orgId, supportOrg } = useFmOrgGuard({ moduleId: 'reports' });
  
  if (!hasOrgContext || !orgId) {
    return guard;
  }
  const [reportType, setReportType] = useState('');
  const [title, setTitle] = useState('');
  const [dateRange, setDateRange] = useState('month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [format, setFormat] = useState('pdf');
  const [notes, setNotes] = useState('');
  const [generating, setGenerating] = useState(false);
  const [customDateError, setCustomDateError] = useState<string | null>(null);

  if (!session) {
    return <CardGridSkeleton count={1} />;
  }

  if (!hasOrgContext || !orgId) {
    return guard;
  }

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (dateRange === 'custom') {
      if (!startDate || !endDate) {
        setCustomDateError(auto('Select both start and end dates.', 'errors.dateRangeRequired'));
        return;
      }
      if (new Date(endDate) < new Date(startDate)) {
        setCustomDateError(auto('End date cannot be before the start date.', 'errors.dateOrder'));
        return;
      }
    }
    setCustomDateError(null);
    setGenerating(true);
    const toastId = toast.loading(auto('Generating report...', 'toast.loading'));

    try {
      // TODO: Replace with actual API call
      await new Promise((resolve) => setTimeout(resolve, 2000));
      toast.success(auto('Report generated successfully', 'toast.success'), { id: toastId });
      router.push('/fm/reports');
    } catch (_error) {
      toast.error(auto('Failed to generate report', 'toast.error'), { id: toastId });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <ModuleViewTabs moduleId="reports" />
      {supportBanner}
      
      <div>
        <div className="flex items-center gap-2">
          <FileText className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">
            {auto('Generate New Report', 'header.title')}
          </h1>
        </div>
        <p className="text-muted-foreground">
          {auto('Create a custom report with your preferred data range and format', 'header.subtitle')}
        </p>
      </div>

      <div className="max-w-2xl">
        <form onSubmit={handleGenerate} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{auto('Report Configuration', 'config.title')}</CardTitle>
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
                <Label htmlFor="title">{auto('Report Title', 'fields.title')}</Label>
                <Input
                  id="title"
                  placeholder={auto('e.g. Q1 2024 Financial Summary', 'fields.titlePlaceholder')}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dateRange" className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {auto('Date Range', 'fields.dateRange')}
                </Label>
                <Select
                  value={dateRange}
                  onValueChange={(value) => {
                    setDateRange(value);
                    if (value !== 'custom') {
                      setCustomDateError(null);
                      setStartDate('');
                      setEndDate('');
                    }
                  }}
                >
                  <SelectTrigger id="dateRange">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DATE_RANGES.map((range) => (
                      <SelectItem key={range.value} value={range.value}>
                        {auto(range.label, `dateRanges.${range.value}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {dateRange === 'custom' && (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">{auto('Start Date', 'fields.startDate')}</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={startDate}
                      onChange={(e) => {
                        setStartDate(e.target.value);
                        if (endDate && new Date(e.target.value) > new Date(endDate)) {
                          setCustomDateError(auto('Start date must be before the end date.', 'errors.dateOrder'));
                        } else {
                          setCustomDateError(null);
                        }
                      }}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endDate">{auto('End Date', 'fields.endDate')}</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={endDate}
                      min={startDate || undefined}
                      onChange={(e) => {
                        setEndDate(e.target.value);
                        if (startDate && new Date(e.target.value) < new Date(startDate)) {
                          setCustomDateError(auto('End date cannot be before the start date.', 'errors.dateOrder'));
                        } else {
                          setCustomDateError(null);
                        }
                      }}
                      required
                    />
                  </div>
                  {customDateError && (
                    <p className="text-sm text-destructive md:col-span-2">{customDateError}</p>
                  )}
                </div>
              )}

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

              <div className="space-y-2">
                <Label htmlFor="notes">{auto('Notes (Optional)', 'fields.notes')}</Label>
                <Textarea
                  id="notes"
                  placeholder={auto('Add any additional notes or filters...', 'fields.notesPlaceholder')}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <Button
            type="submit"
            disabled={
              generating ||
              !reportType ||
              !title ||
              (dateRange === 'custom' && (!startDate || !endDate || Boolean(customDateError)))
            }
            className="w-full"
          >
            <Download className="w-4 h-4 me-2" />
            {auto('Generate Report', 'submit')}
          </Button>
        </form>

        <div className="mt-6 p-4 border border-dashed border-border rounded-lg">
          <p className="text-sm text-muted-foreground">
            {auto('Reports will be generated via /api/reports/generate', 'info.apiEndpoint')}
          </p>
        </div>
      </div>
    </div>
  );
}
