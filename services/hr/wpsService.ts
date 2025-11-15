/**
 * WPS (Wage Protection System) / Mudad File Generator
 * 
 * Generates compliant payroll files for upload to Saudi banks
 * per HRSD Mudad specifications.
 * 
 * Format: CSV file with specific columns as required by banks
 * All amounts must be in SAR (Saudi Riyals)
 * 
 * References:
 * - HRSD WPS: https://hrsd.gov.sa/en/wps
 * - Mudad Platform: https://mudad.hrsd.gov.sa
 */

import { createHash } from 'crypto';
import type { IPayslip } from '../../models/hr/Payroll';

export interface WPSRecord {
  employeeId: string; // Employee code/ID
  employeeName: string; // Full name
  bankCode: string; // Saudi bank code (e.g., '80' for Al Rajhi)
  iban: string; // SA + 22 digits
  basicSalary: number; // SAR
  housingAllowance: number; // SAR
  otherAllowances: number; // SAR
  totalDeductions: number; // SAR
  netSalary: number; // SAR
  salaryMonth: string; // Format: YYYY-MM
  workDays: number; // Days worked in the month
}

export interface WPSFile {
  filename: string; // e.g., WPS_ORG123_2025-03.csv
  content: string; // CSV content
  checksum: string; // SHA-256 hash for verification
  recordCount: number;
  totalNetSalary: number;
  generatedAt: Date;
}

/**
 * Saudi bank codes (major banks)
 * Banks may require specific codes - verify with your bank
 */
export const SAUDI_BANK_CODES: Record<string, string> = {
  'AL_RAJHI': '80',
  'NCB': '10', // National Commercial Bank (now SNB)
  'SAMBA': '40',
  'RIYAD': '20',
  'SABB': '55',
  'ALINMA': '95',
  'ANB': '25',
  'BANK_ALJAZIRA': '65',
  'BSF': '60',
  'BANQUE_SAUDI_FRANSI': '50',
} as const;

/**
 * Extract bank code from IBAN
 * Saudi IBANs: SA + 2 check digits + 2 bank code + 18 account number
 * Returns 'INVALID_IBAN' if format is wrong (safer than throwing)
 */
function extractBankCode(iban: string): string {
  if (!iban || !iban.startsWith('SA') || iban.length !== 24) {
    return 'INVALID_IBAN';
  }
  // Bank code is characters 5-6 (after SA and 2 check digits)
  return iban.substring(4, 6);
}

/**
 * Generate WPS CSV file from payslips
 * Returns both the file and any errors encountered (for robust error handling)
 */
export function generateWPSFile(
  payslips: IPayslip[],
  organizationId: string,
  periodMonth: string // Format: YYYY-MM
): { file: WPSFile; errors: string[] } {
  const records: WPSRecord[] = [];
  const errors: string[] = [];
  let totalNetSalary = 0;
  
  for (const slip of payslips) {
    // Validate IBAN before processing
    if (!slip.iban || !slip.iban.startsWith('SA') || slip.iban.length !== 24) {
      errors.push(`Invalid IBAN for employee ${slip.employeeCode}: ${slip.iban || 'missing'}`);
      continue; // Skip this record but continue processing others
    }
    
    const bankCode = extractBankCode(slip.iban);
    if (bankCode === 'INVALID_IBAN') {
      errors.push(`Could not extract bank code for employee ${slip.employeeCode}: ${slip.iban}`);
      continue;
    }
    
    // Extract earnings
    const basicSalary = slip.earnings.find(e => e.code === 'BASIC')?.amount || 0;
    const housingAllowance = slip.earnings.find(e => e.code === 'HOUSING')?.amount || 0;
    const otherAllowances = slip.earnings
      .filter(e => !['BASIC', 'HOUSING'].includes(e.code))
      .reduce((sum, e) => sum + e.amount, 0);
    
    // Total deductions
    const totalDeductions = slip.deductions.reduce((sum, d) => sum + d.amount, 0);
    
    // Calculate work days from payslip data
    // If payslip includes workDays field (from attendance calculation), use it
    // Otherwise, calculate from period: assume standard work month (typically 22-30 days)
    // Note: Caller should calculate actual attendance and include in payslip for accuracy
    let workDays = 30; // Default for full month
    if ((slip as any).workDays && typeof (slip as any).workDays === 'number') {
      workDays = (slip as any).workDays; // Use pre-calculated work days if provided
    } else if ((slip as any).attendanceDays && typeof (slip as any).attendanceDays === 'number') {
      workDays = (slip as any).attendanceDays; // Alternative field name
    }
    // Note: For accurate work days, payslip generation should query attendance/timesheet records
    // and include the calculated days in the payslip object before calling this function
    
    const record: WPSRecord = {
      employeeId: slip.employeeCode,
      employeeName: slip.employeeName,
      bankCode,
      iban: slip.iban,
      basicSalary: Math.round(basicSalary * 100) / 100,
      housingAllowance: Math.round(housingAllowance * 100) / 100,
      otherAllowances: Math.round(otherAllowances * 100) / 100,
      totalDeductions: Math.round(totalDeductions * 100) / 100,
      netSalary: Math.round(slip.netPay * 100) / 100,
      salaryMonth: periodMonth,
      workDays,
    };
    
    records.push(record);
    totalNetSalary += record.netSalary;
  }
  
  // Generate CSV content
  const csvHeader = [
    'Employee ID',
    'Employee Name',
    'Bank Code',
    'IBAN',
    'Basic Salary',
    'Housing Allowance',
    'Other Allowances',
    'Total Deductions',
    'Net Salary',
    'Salary Month',
    'Work Days',
  ].join(',');
  
  const csvRows = records.map(r => [
    escapeCsv(r.employeeId),
    escapeCsv(r.employeeName),
    r.bankCode,
    r.iban,
    r.basicSalary.toFixed(2),
    r.housingAllowance.toFixed(2),
    r.otherAllowances.toFixed(2),
    r.totalDeductions.toFixed(2),
    r.netSalary.toFixed(2),
    r.salaryMonth,
    r.workDays,
  ].join(','));
  
  const csvContent = [csvHeader, ...csvRows].join('\n');
  
  // Generate checksum using cryptographic SHA-256
  const checksum = createHash('sha256').update(csvContent, 'utf8').digest('hex');
  
  const filename = `WPS_${organizationId}_${periodMonth.replace('-', '')}.csv`;
  
  const file: WPSFile = {
    filename,
    content: csvContent,
    checksum,
    recordCount: records.length,
    totalNetSalary: Math.round(totalNetSalary * 100) / 100,
    generatedAt: new Date(),
  };
  
  return { file, errors };
}

/**
 * Escape CSV field (handle commas and quotes)
 */
function escapeCsv(value: string): string {
  if (!value) return '""';
  // If value contains comma, quote, or newline, wrap in quotes and escape internal quotes
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Validate WPS file before upload
 */
export interface WPSValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateWPSFile(wpsFile: WPSFile): WPSValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Check record count
  if (wpsFile.recordCount === 0) {
    errors.push('WPS file contains no records');
  }
  
  // Check total net salary
  if (wpsFile.totalNetSalary <= 0) {
    errors.push('Total net salary must be greater than zero');
  }
  
  // Parse CSV and validate each record
  const lines = wpsFile.content.split('\n');
  if (lines.length < 2) {
    errors.push('WPS file must contain header and at least one data row');
  } else {
    // Skip header
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;
      
      const fields = line.split(',');
      
      // Validate IBAN (field 3)
      const iban = fields[3]?.trim();
      if (!iban || !iban.startsWith('SA') || iban.length !== 24) {
        errors.push(`Row ${i}: Invalid IBAN format: ${iban}`);
      }
      
      // Validate net salary (field 8) is positive
      const netSalary = parseFloat(fields[8] || '0');
      if (netSalary <= 0) {
        warnings.push(`Row ${i}: Net salary is zero or negative`);
      }
      
      // Validate salary month format (field 9)
      const salaryMonth = fields[9]?.trim();
      if (!salaryMonth || !/^\d{4}-\d{2}$/.test(salaryMonth)) {
        errors.push(`Row ${i}: Invalid salary month format: ${salaryMonth} (expected YYYY-MM)`);
      }
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Calculate actual work days from attendance/timesheet records
 * 
 * This function counts the number of days an employee worked in a given month
 * by querying approved timesheets. Use this before generating payslips to get
 * accurate work days for WPS file generation.
 * 
 * @param employeeId - Employee's unique ID
 * @param orgId - Organization ID
 * @param yearMonth - Format: "YYYY-MM" (e.g., "2025-03")
 * @returns Promise<number> - Number of work days (0-31)
 * 
 * @example
 * const workDays = await calculateWorkDaysFromAttendance(
 *   employeeId,
 *   orgId,
 *   "2025-03"
 * );
 * // Use workDays when creating payslip object
 * const payslip = {
 *   ...otherFields,
 *   workDays: workDays,
 * };
 */
export async function calculateWorkDaysFromAttendance(
  employeeId: string,
  orgId: string,
  yearMonth: string
): Promise<number> {
  try {
    // Dynamic import to avoid circular dependencies
    const { Timesheet } = await import('../../models/hr/Attendance');
    const { default: mongoose } = await import('mongoose');
    
    // Parse yearMonth to get start and end of month
    const [year, month] = yearMonth.split('-').map(Number);
    if (!year || !month || month < 1 || month > 12) {
      throw new Error(`Invalid yearMonth format: ${yearMonth}. Expected YYYY-MM`);
    }
    
    const monthStart = new Date(year, month - 1, 1); // Month is 0-indexed
    const monthEnd = new Date(year, month, 0, 23, 59, 59, 999); // Last day of month
    
    // Query approved timesheets for the month
    const timesheets = await Timesheet.find({
      orgId: new mongoose.Types.ObjectId(orgId),
      employeeId: new mongoose.Types.ObjectId(employeeId),
      status: 'APPROVED',
      weekStart: { $gte: monthStart },
      weekEnd: { $lte: monthEnd },
    });
    
    if (timesheets.length === 0) {
      // No approved timesheets - return 0 (employee didn't work or timesheets not approved)
      return 0;
    }
    
    // Calculate total work days from hours
    // Assumption: 8 hours = 1 work day (standard in Saudi Arabia)
    const totalHours = timesheets.reduce((sum, ts) => {
      return sum + (ts.regularHours || 0) + (ts.overtimeHours || 0);
    }, 0);
    
    const workDays = Math.round(totalHours / 8);
    
    // Cap at days in month (safety check)
    const daysInMonth = monthEnd.getDate();
    return Math.min(workDays, daysInMonth);
  } catch (error) {
    // If calculation fails, return default (caller should handle this)
    console.error('[WPS] Failed to calculate work days from attendance:', error);
    return 30; // Default fallback
  }
}
