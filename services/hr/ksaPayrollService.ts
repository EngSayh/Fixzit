/**
 * KSA Payroll Compliance Service
 * 
 * Implements Saudi Arabia labor law requirements:
 * - GOSI (General Organization for Social Insurance) contributions
 * - SANED (Unemployment Insurance)
 * - Overtime calculations (150% per HRSD)
 * - End of Service Benefits (ESB)
 * 
 * References:
 * - HRSD Labor Law: https://hrsd.gov.sa
 * - GOSI Contributions: https://www.gosi.gov.sa
 */

import Decimal from 'decimal.js';

// GOSI Rates (as of 2025) - These should be configurable in admin settings
export const GOSI_RATES = {
  // Annuities (Pension)
  ANNUITIES_EMPLOYEE: 0.09, // 9% for Saudi nationals
  ANNUITIES_EMPLOYER: 0.09, // 9% for Saudi nationals
  // New entrant rates (gradual increase 2024-2028)
  ANNUITIES_EMPLOYEE_NEW: 0.095, // 9.5% (2025)
  ANNUITIES_EMPLOYER_NEW: 0.095, // 9.5% (2025)
  
  // Occupational Hazards (employer only)
  OCCUPATIONAL_HAZARDS: 0.02, // 2% (for all employees)
  
  // SANED (Unemployment Insurance)
  SANED_EMPLOYEE: 0.0075, // 0.75%
  SANED_EMPLOYER: 0.0075, // 0.75%
} as const;

// KSA Labor Law: Overtime is 150% of hourly basic wage
export const OVERTIME_MULTIPLIER = 1.5;

// Standard work hours for hourly rate calculation
const STANDARD_MONTHLY_DAYS = 30;
const STANDARD_DAILY_HOURS = 8;

/**
 * Calculate hourly rate from monthly basic salary
 * Formula: Monthly Basic / 30 days / 8 hours
 */
export function calculateHourlyRate(monthlyBasic: number): number {
  return monthlyBasic / STANDARD_MONTHLY_DAYS / STANDARD_DAILY_HOURS;
}

/**
 * Calculate overtime pay per HRSD regulations
 * Overtime = Hourly Rate × 1.5 × Hours
 */
export function calculateOvertimePay(
  monthlyBasic: number,
  overtimeHours: number
): number {
  const hourlyRate = calculateHourlyRate(monthlyBasic);
  return Math.round(hourlyRate * OVERTIME_MULTIPLIER * overtimeHours * 100) / 100;
}

/**
 * Calculate GOSI contributions for an employee
 * Returns employee deduction and employer contribution
 */
export interface GOSICalculation {
  employeeDeduction: number; // Amount deducted from employee salary
  employerContribution: number; // Amount paid by employer
  breakdown: {
    annuitiesEmployee: number;
    annuitiesEmployer: number;
    occupationalHazards: number;
    sanedEmployee: number;
    sanedEmployer: number;
  };
}

export function calculateGOSI(
  baseSalary: number,
  housingAllowance: number,
  isSaudiNational: boolean,
  isNewEntrant: boolean = false // Post-2024 hires
): GOSICalculation {
  // GOSI base: Basic + Housing (as per GOSI regulations)
  const gosiBase = new Decimal(baseSalary).plus(housingAllowance).toNumber();
  
  if (!isSaudiNational) {
    // Non-Saudi: Only Occupational Hazards (employer pays)
    return {
      employeeDeduction: 0,
      employerContribution: Math.round(gosiBase * GOSI_RATES.OCCUPATIONAL_HAZARDS * 100) / 100,
      breakdown: {
        annuitiesEmployee: 0,
        annuitiesEmployer: 0,
        occupationalHazards: Math.round(gosiBase * GOSI_RATES.OCCUPATIONAL_HAZARDS * 100) / 100,
        sanedEmployee: 0,
        sanedEmployer: 0,
      },
    };
  }
  
  // Saudi National: Full GOSI + SANED
  const annuitiesRate = isNewEntrant 
    ? { employee: GOSI_RATES.ANNUITIES_EMPLOYEE_NEW, employer: GOSI_RATES.ANNUITIES_EMPLOYER_NEW }
    : { employee: GOSI_RATES.ANNUITIES_EMPLOYEE, employer: GOSI_RATES.ANNUITIES_EMPLOYER };
  
  const annuitiesEmployee = Math.round(gosiBase * annuitiesRate.employee * 100) / 100;
  const annuitiesEmployer = Math.round(gosiBase * annuitiesRate.employer * 100) / 100;
  const occupationalHazards = Math.round(gosiBase * GOSI_RATES.OCCUPATIONAL_HAZARDS * 100) / 100;
  const sanedEmployee = Math.round(gosiBase * GOSI_RATES.SANED_EMPLOYEE * 100) / 100;
  const sanedEmployer = Math.round(gosiBase * GOSI_RATES.SANED_EMPLOYER * 100) / 100;
  
  return {
    employeeDeduction: annuitiesEmployee + sanedEmployee,
    employerContribution: annuitiesEmployer + occupationalHazards + sanedEmployer,
    breakdown: {
      annuitiesEmployee,
      annuitiesEmployer,
      occupationalHazards,
      sanedEmployee,
      sanedEmployer,
    },
  };
}

/**
 * Calculate End of Service Benefits (ESB) per KSA Labor Law
 * 
 * Formula:
 * - First 5 years: 0.5 month salary per year
 * - After 5 years: 1 month salary per year
 * 
 * Adjustments:
 * - Resignation before 2 years: No ESB
 * - Resignation 2-5 years: 1/3 of calculated amount
 * - Resignation 5-10 years: 2/3 of calculated amount
 * - Resignation 10+ years or termination: Full amount
 */
export interface ESBCalculation {
  totalMonths: number; // Months of salary owed
  amount: number; // SAR
  breakdown: {
    first5YearsMonths: number;
    after5YearsMonths: number;
    adjustmentFactor: number; // 0, 0.33, 0.67, or 1.0
    reason: string;
  };
}

export function calculateESB(
  lastMonthlySalary: number,
  serviceYears: number,
  serviceMonths: number = 0,
  serviceDays: number = 0,
  reason: 'RESIGNATION' | 'TERMINATION' | 'END_OF_CONTRACT' = 'TERMINATION'
): ESBCalculation {
  // Convert to total years (including fractional)
  const totalYears = serviceYears + serviceMonths / 12 + serviceDays / 365;
  
  // Base calculation
  const first5Years = Math.min(5, totalYears);
  const after5Years = Math.max(0, totalYears - 5);
  const baseMonths = (first5Years * 0.5) + (after5Years * 1.0);
  
  // Adjustment factor based on reason and tenure
  let adjustmentFactor = 1.0;
  let adjustmentReason = 'Full ESB';
  
  if (reason === 'RESIGNATION') {
    if (totalYears < 2) {
      adjustmentFactor = 0;
      adjustmentReason = 'Resignation before 2 years - No ESB';
    } else if (totalYears < 5) {
      adjustmentFactor = 1 / 3;
      adjustmentReason = 'Resignation 2-5 years - 1/3 ESB';
    } else if (totalYears < 10) {
      adjustmentFactor = 2 / 3;
      adjustmentReason = 'Resignation 5-10 years - 2/3 ESB';
    } else {
      adjustmentFactor = 1.0;
      adjustmentReason = 'Resignation 10+ years - Full ESB';
    }
  }
  
  const finalMonths = baseMonths * adjustmentFactor;
  const amount = new Decimal(lastMonthlySalary).times(finalMonths).toDecimalPlaces(2).toNumber();
  
  return {
    totalMonths: Math.round(finalMonths * 100) / 100,
    amount,
    breakdown: {
      first5YearsMonths: Math.round(first5Years * 0.5 * 100) / 100,
      after5YearsMonths: Math.round(after5Years * 1.0 * 100) / 100,
      adjustmentFactor,
      reason: adjustmentReason,
    },
  };
}

/**
 * Calculate net pay for an employee
 */
export interface NetPayCalculation {
  grossPay: number;
  totalDeductions: number;
  netPay: number;
  earnings: { code: string; name: string; amount: number }[];
  deductions: { code: string; name: string; amount: number }[];
  gosi: GOSICalculation;
}

export function calculateNetPay(
  baseSalary: number,
  housingAllowance: number,
  transportAllowance: number,
  otherAllowances: { name: string; amount: number }[],
  overtimeHours: number,
  isSaudiNational: boolean,
  isNewEntrant: boolean = false
): NetPayCalculation {
  // Earnings
  const overtimePay = calculateOvertimePay(baseSalary, overtimeHours);
  const totalOtherAllowances = otherAllowances.reduce((sum, a) => new Decimal(sum).plus(a.amount).toNumber(), 0);
  const grossPay = new Decimal(baseSalary)
    .plus(housingAllowance)
    .plus(transportAllowance)
    .plus(totalOtherAllowances)
    .plus(overtimePay)
    .toNumber();
  
  const earnings = [
    { code: 'BASIC', name: 'Basic Salary', amount: baseSalary },
    { code: 'HOUSING', name: 'Housing Allowance', amount: housingAllowance },
    { code: 'TRANSPORT', name: 'Transport Allowance', amount: transportAllowance },
    ...otherAllowances.map((a, i) => ({ code: `OTHER_${i + 1}`, name: a.name, amount: a.amount })),
    ...(overtimePay > 0 ? [{ code: 'OVERTIME', name: 'Overtime (150%)', amount: overtimePay }] : []),
  ];
  
  // Deductions (GOSI)
  const gosi = calculateGOSI(baseSalary, housingAllowance, isSaudiNational, isNewEntrant);
  const deductions = [];
  
  if (gosi.breakdown.annuitiesEmployee > 0) {
    deductions.push({ code: 'GOSI_ANNUITIES', name: 'GOSI (Annuities)', amount: gosi.breakdown.annuitiesEmployee });
  }
  if (gosi.breakdown.sanedEmployee > 0) {
    deductions.push({ code: 'SANED', name: 'SANED (Unemployment)', amount: gosi.breakdown.sanedEmployee });
  }
  
  const totalDeductions = gosi.employeeDeduction;
  const netPay = new Decimal(grossPay).minus(totalDeductions).toNumber();
  
  return {
    grossPay: new Decimal(grossPay).toDecimalPlaces(2).toNumber(),
    totalDeductions: new Decimal(totalDeductions).toDecimalPlaces(2).toNumber(),
    netPay: new Decimal(netPay).toDecimalPlaces(2).toNumber(),
    earnings,
    deductions,
    gosi,
  };
}
