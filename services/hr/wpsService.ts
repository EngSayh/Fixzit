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

import Decimal from 'decimal.js';
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
    
    const record: WPSRecord = {
      employeeId: slip.employeeCode,
      employeeName: slip.employeeName,
      bankCode,
      iban: slip.iban,
      basicSalary: new Decimal(basicSalary).toDecimalPlaces(2).toNumber(),
      housingAllowance: new Decimal(housingAllowance).toDecimalPlaces(2).toNumber(),
      otherAllowances: new Decimal(otherAllowances).toDecimalPlaces(2).toNumber(),
      totalDeductions: new Decimal(totalDeductions).toDecimalPlaces(2).toNumber(),
      netSalary: new Decimal(slip.netPay).toDecimalPlaces(2).toNumber(),
      salaryMonth: periodMonth,
      workDays: 30, // TODO: Calculate actual work days from attendance
    };
    
    records.push(record);
    totalNetSalary = new Decimal(totalNetSalary).plus(record.netSalary).toNumber();
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
    totalNetSalary: new Decimal(totalNetSalary).toDecimalPlaces(2).toNumber(),
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
