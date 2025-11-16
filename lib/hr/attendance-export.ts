export interface AttendanceExportEntry {
  date: string | Date;
  status: string;
  clockIn?: string | Date;
  clockOut?: string | Date;
  overtimeMinutes?: number;
  source?: string;
  notes?: string;
}

export interface AttendanceExportMetadata {
  employeeCode?: string;
  dateFrom: string;
  dateTo: string;
}

const CSV_HEADERS = [
  'Date',
  'Status',
  'Clock-in',
  'Clock-out',
  'Overtime (min)',
  'Source',
  'Notes',
] as const;

function formatCell(value: string | number | undefined): string {
  if (value === undefined || value === null) {
    return '';
  }
  const str = String(value);
  if (str.includes('"') || str.includes(',') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

export function buildAttendanceCsv(
  entries: AttendanceExportEntry[],
  metadata: AttendanceExportMetadata
): string {
  const rows: string[] = [];
  rows.push(`# Attendance export for ${metadata.employeeCode || 'employee'} (${metadata.dateFrom} → ${metadata.dateTo})`);
  rows.push(CSV_HEADERS.map((header) => `"${header}"`).join(','));

  entries.forEach((entry) => {
    rows.push([
      formatCell(new Date(entry.date).toISOString()),
      formatCell(entry.status),
      formatCell(entry.clockIn ? new Date(entry.clockIn).toISOString() : ''),
      formatCell(entry.clockOut ? new Date(entry.clockOut).toISOString() : ''),
      formatCell(entry.overtimeMinutes ?? 0),
      formatCell(entry.source ?? ''),
      formatCell(entry.notes ?? ''),
    ].join(','));
  });

  return rows.join('\n');
}
