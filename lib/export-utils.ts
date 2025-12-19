/**
 * CSV and PDF Export Utilities
 *
 * Provides reusable functions for exporting data to CSV and PDF formats.
 * Uses papaparse for CSV and jsPDF with autoTable for PDF.
 */

import { logger } from "@/lib/logger";

type ExportValue =
  | string
  | number
  | boolean
  | Date
  | Record<string, unknown>
  | null
  | undefined;
type ExportRow = Record<string, ExportValue>;

/**
 * Convert array of objects to CSV string
 */
export function arrayToCSV<T extends ExportRow>(
  data: T[],
  columns?: { key: keyof T; label: string }[],
): string {
  if (data.length === 0) {
    return "";
  }

  // If columns not specified, use all keys from first object
  const cols =
    columns || Object.keys(data[0]).map((key) => ({ key, label: key }));

  // Create header row
  const headers = cols.map((col) => escapeCsvValue(col.label)).join(",");

  // Create data rows
  const rows = data.map((row) => {
    return cols
      .map((col) => {
        const value = row[col.key];
        return escapeCsvValue(formatValue(value));
      })
      .join(",");
  });

  return [headers, ...rows].join("\n");
}

/**
 * Escape CSV value (handle commas, quotes, newlines)
 */
function escapeCsvValue(value: string): string {
  if (value == null) return "";
  const stringValue = String(value);

  // If contains comma, quote, or newline, wrap in quotes and escape quotes
  if (
    stringValue.includes(",") ||
    stringValue.includes('"') ||
    stringValue.includes("\n")
  ) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

/**
 * Format value for CSV (dates, booleans, etc.)
 */
function formatValue(value: ExportValue): string {
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

/**
 * Download CSV file (client-side)
 * BUG-002 FIX: Add BOM (Byte Order Mark) for proper Excel UTF-8 detection
 * Without BOM, Arabic text displays as garbled characters in Excel (e.g., "Ø§ÙØ¬Ø§Ø±")
 */
export function downloadCSV(csvContent: string, filename: string): void {
  // Add UTF-8 BOM (\uFEFF) so Excel properly detects UTF-8 encoding
  // This fixes Arabic text rendering in Excel without affecting other text editors
  const BOM = "\uFEFF";
  const csvWithBOM = BOM + csvContent;
  
  const blob = new Blob([csvWithBOM], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
  logger.info("[Export] CSV downloaded with UTF-8 BOM", { filename });
}

/**
 * Export array to CSV and download
 */
export function exportToCSV<T extends ExportRow>(
  data: T[],
  filename: string,
  columns?: { key: keyof T; label: string }[],
): void {
  try {
    const csv = arrayToCSV(data, columns);
    downloadCSV(csv, filename);
  } catch (_error) {
    const error = _error instanceof Error ? _error : new Error(String(_error));
    void error;
    logger.error("[Export] Failed to export CSV", { error, filename });
    throw error;
  }
}

/**
 * PDF export configuration
 */
export interface PDFExportConfig {
  title: string;
  subtitle?: string;
  orientation?: "portrait" | "landscape";
  pageSize?: "a4" | "letter";
  includeDate?: boolean;
}

/**
 * Generate PDF from table data (client-side using browser print)
 * Creates a printable HTML document and triggers print dialog
 */
export async function generatePDF<T extends ExportRow>(
  data: T[],
  columns: { key: keyof T; label: string }[],
  config: PDFExportConfig,
): Promise<void> {
  try {
    // Create HTML table
    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${config.title}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { font-size: 24px; margin-bottom: 5px; }
          h2 { font-size: 14px; color: #666; margin-bottom: 10px; font-weight: normal; }
          .date { font-size: 12px; color: #999; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background: #428bca; color: white; padding: 8px; text-align: left; font-weight: bold; }
          td { border: 1px solid #ddd; padding: 8px; }
          tr:nth-child(even) { background: #f9f9f9; }
          @media print {
            body { margin: 0; }
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <h1>${config.title}</h1>
    `;

    if (config.subtitle) {
      html += `<h2>${config.subtitle}</h2>`;
    }

    if (config.includeDate) {
      html += `<div class="date">Generated: ${new Date().toLocaleString()}</div>`;
    }

    html += "<table><thead><tr>";
    columns.forEach((col) => {
      html += `<th>${col.label}</th>`;
    });
    html += "</tr></thead><tbody>";

    data.forEach((row) => {
      html += "<tr>";
      columns.forEach((col) => {
        html += `<td>${formatValue(row[col.key])}</td>`;
      });
      html += "</tr>";
    });

    html += "</tbody></table>";
    html += `
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;

    // Open in new window and trigger print
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
    } else {
      throw new Error("Failed to open print window. Please allow popups.");
    }

    logger.info("[Export] PDF print dialog opened", { config });
  } catch (_error) {
    const error = _error instanceof Error ? _error : new Error(String(_error));
    void error;
    logger.error("[Export] Failed to generate PDF", { error, config });
    throw error;
  }
}

/**
 * Export to PDF using browser print (no server-side generation needed)
 */
export async function exportToPDF<T extends ExportRow>(
  data: T[],
  columns: { key: keyof T; label: string }[],
  filename: string,
  config: Omit<PDFExportConfig, "includeDate"> & { includeDate?: boolean } = {
    title: "Export",
  },
): Promise<void> {
  try {
    const fullConfig: PDFExportConfig = {
      ...config,
      includeDate: config.includeDate ?? true,
    };

    await generatePDF(data, columns, fullConfig);
  } catch (_error) {
    const error = _error instanceof Error ? _error : new Error(String(_error));
    void error;
    logger.error("[Export] Failed to export PDF", { error, filename });
    throw error;
  }
}
