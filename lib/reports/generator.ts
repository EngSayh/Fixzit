import { Readable } from "stream";

export type ReportJobInput = {
  id: string;
  name: string;
  type: string;
  format: "csv" | "pdf";
  dateRange?: string;
  startDate?: string;
  endDate?: string;
  notes?: string;
};

export type GeneratedReport = {
  buffer: Buffer;
  mime: string;
  filename: string;
  size: number;
};

/**
 * Minimal report generator.
 * Currently outputs CSV; easily extended with PDF later.
 */
export async function generateReport(
  job: ReportJobInput,
): Promise<GeneratedReport> {
  const rows = [
    ["Report ID", job.id],
    ["Name", job.name],
    ["Type", job.type],
    ["Format", job.format],
    ["DateRange", job.dateRange || "", job.startDate || "", job.endDate || ""],
    ["Notes", job.notes || ""],
    ["GeneratedAt", new Date().toISOString()],
    [],
    ["Section", "Metric", "Value"],
    ["Summary", "Total Records", "0"],
    ["Summary", "Total Amount", "0"],
  ];

  const csv = rows.map((r) => r.map(escapeCsv).join(",")).join("\n");
  const buffer = Buffer.from(csv, "utf-8");
  return {
    buffer,
    mime: "text/csv",
    filename: `${job.name || "report"}-${job.id}.csv`,
    size: buffer.length,
  };
}

function escapeCsv(value: unknown): string {
  const str = value === undefined || value === null ? "" : String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// Utility to stream buffer if needed by callers
export function bufferToStream(buffer: Buffer): Readable {
  const stream = new Readable();
  stream.push(buffer);
  stream.push(null);
  return stream;
}
