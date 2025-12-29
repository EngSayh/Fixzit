/**
 * @fileoverview GOSI (General Organization for Social Insurance) Compliance Service
 * @module services/hr/gosi-compliance
 * 
 * Saudi Arabia GOSI compliance management:
 * - Employee registration and updates
 * - Contribution calculation (11.75% employer: 9% annuities + 2% hazards + 0.75% unemployment, 9.75% employee)
 * - Monthly reporting generation
 * - Annuities and hazard coverage
 * - Compliance monitoring and alerts
 * 
 * References:
 * - GOSI Law 2021 amendments
 * - Saudi Labor Law compliance requirements
 * 
 * @status IMPLEMENTED [AGENT-001-A]
 * @created 2025-12-29
 */

import { ObjectId, type WithId, type Document } from "mongodb";
import { logger } from "@/lib/logger";
import { getDatabase } from "@/lib/mongodb-unified";

// ============================================================================
// Types & Interfaces
// ============================================================================

/**
 * GOSI contribution types
 */
export enum ContributionType {
  ANNUITIES = "annuities",           // Pension (9% employer + 9% employee)
  HAZARDS = "hazards",               // Occupational hazards (2% employer only)
  UNEMPLOYMENT = "unemployment",      // SANED (0.75% each)
}

/**
 * Employee GOSI status
 */
export enum GosiStatus {
  PENDING_REGISTRATION = "pending_registration",
  REGISTERED = "registered",
  SUSPENDED = "suspended",
  TERMINATED = "terminated",
  EXEMPTED = "exempted",
}

/**
 * GOSI employee record
 */
export interface GosiEmployee {
  _id?: ObjectId;
  orgId: string;
  employeeId: string;
  gosiNumber?: string;
  iqamaNumber: string;
  nationalId?: string;
  fullName: string;
  fullNameAr: string;
  dateOfBirth: Date;
  nationality: string;
  gender: "male" | "female";
  maritalStatus: "single" | "married" | "divorced" | "widowed";
  jobTitle: string;
  jobTitleAr: string;
  department: string;
  basicSalary: number;
  housingAllowance: number;
  totalGosiWage: number;
  status: GosiStatus;
  registrationDate?: Date;
  terminationDate?: Date;
  exemptionReason?: string;
  contributions: GosiContribution[];
  complianceAlerts: ComplianceAlert[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * GOSI contribution record
 */
export interface GosiContribution {
  id: string;
  period: string; // YYYY-MM format
  type: ContributionType;
  basicSalary: number;
  housingAllowance: number;
  totalWage: number;
  employerAmount: number;
  employeeAmount: number;
  totalAmount: number;
  status: "calculated" | "submitted" | "paid" | "rejected";
  submissionDate?: Date;
  paymentDate?: Date;
  referenceNumber?: string;
}

/**
 * Monthly GOSI report
 */
export interface GosiMonthlyReport {
  _id?: ObjectId;
  orgId: string;
  period: string; // YYYY-MM
  status: "draft" | "submitted" | "accepted" | "rejected";
  employeeCount: number;
  totalWages: number;
  contributions: {
    annuities: { employer: number; employee: number };
    hazards: { employer: number; employee: number };
    unemployment: { employer: number; employee: number };
  };
  totalEmployer: number;
  totalEmployee: number;
  grandTotal: number;
  submissionDate?: Date;
  referenceNumber?: string;
  rejectionReason?: string;
  employees: GosiReportEmployee[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

/**
 * Employee entry in monthly report
 */
export interface GosiReportEmployee {
  employeeId: string;
  gosiNumber: string;
  name: string;
  basicSalary: number;
  housingAllowance: number;
  totalWage: number;
  employerContribution: number;
  employeeContribution: number;
  totalContribution: number;
  status: "active" | "new" | "terminated" | "salary_change";
  changes?: string;
}

/**
 * Compliance alert
 */
export interface ComplianceAlert {
  id: string;
  type: "missing_registration" | "late_payment" | "wage_discrepancy" | "termination_pending" | "contribution_error";
  severity: "critical" | "warning" | "info";
  message: string;
  messageAr: string;
  details: Record<string, unknown>;
  createdAt: Date;
  resolvedAt?: Date;
  resolvedBy?: string;
}

/**
 * GOSI rates configuration
 */
export interface GosiRates {
  annuities: {
    employer: number;
    employee: number;
  };
  hazards: {
    employer: number;
    employee: number;
  };
  unemployment: {
    employer: number;
    employee: number;
  };
  wageComponents: {
    basicSalary: boolean;
    housingAllowance: boolean;
    transportAllowance: boolean;
    otherAllowances: boolean;
  };
  maxWage: number; // Maximum contributable wage
  minWage: number; // Minimum wage threshold
}

// ============================================================================
// Constants
// ============================================================================

const GOSI_EMPLOYEES_COLLECTION = "gosi_employees";
const GOSI_REPORTS_COLLECTION = "gosi_reports";

/**
 * Legacy GOSI rates (employees registered before July 3, 2024)
 * Source: GOSI official rates
 */
export const LEGACY_GOSI_RATES: GosiRates = {
  annuities: {
    employer: 0.09,    // 9%
    employee: 0.09,    // 9%
  },
  hazards: {
    employer: 0.02,    // 2%
    employee: 0,       // 0% (employer only)
  },
  unemployment: {
    employer: 0.0075,  // 0.75% SANED
    employee: 0.0075,  // 0.75% SANED
  },
  wageComponents: {
    basicSalary: true,
    housingAllowance: true,
    transportAllowance: false, // Not included
    otherAllowances: false,    // Not included
  },
  maxWage: 45000,  // SAR - Maximum contributable wage
  minWage: 4000,   // SAR - Minimum wage for Saudis (2024)
};

/**
 * Phased annuities rates for NEW registrants (July 3, 2024+)
 * Rates increase gradually over 5 years:
 * - 2024: 9.0%
 * - 2025: 9.5%
 * - 2026: 10.0%
 * - 2027: 10.5%
 * - 2028+: 11.0%
 */
const NEW_REGISTRANT_ANNUITIES_BY_YEAR: Record<number, number> = {
  2024: 0.09,
  2025: 0.095,
  2026: 0.10,
  2027: 0.105,
  2028: 0.11,
};

/**
 * Get annuity rate for new registrants based on effective year
 */
function getNewRegistrantAnnuityRate(effectiveYear: number): number {
  if (effectiveYear >= 2028) return 0.11;
  return NEW_REGISTRANT_ANNUITIES_BY_YEAR[effectiveYear] || 0.11;
}

/**
 * Cutover date for new GOSI registration rules
 */
const NEW_GOSI_RULES_CUTOVER = new Date('2024-07-03');

/**
 * Get appropriate GOSI rates based on employee registration date
 * @param registrationDate - Date when employee was registered with GOSI
 * @param effectiveYear - Year for which to calculate rates (defaults to current year)
 * @returns GosiRates - The applicable rate set
 */
export function getGosiRates(registrationDate: Date, effectiveYear?: number): GosiRates {
  const year = effectiveYear || new Date().getFullYear();
  
  // Legacy employees: registered before July 3, 2024
  if (registrationDate < NEW_GOSI_RULES_CUTOVER) {
    return LEGACY_GOSI_RATES;
  }
  
  // New registrants: use phased annuity rates
  const annuityRate = getNewRegistrantAnnuityRate(year);
  
  return {
    annuities: {
      employer: annuityRate,
      employee: annuityRate,
    },
    hazards: {
      employer: 0.02,    // 2% (unchanged)
      employee: 0,       // 0% (employer only)
    },
    unemployment: {
      employer: 0.0075,  // 0.75% SANED (unchanged)
      employee: 0.0075,  // 0.75% SANED (unchanged)
    },
    wageComponents: {
      basicSalary: true,
      housingAllowance: true,
      transportAllowance: false,
      otherAllowances: false,
    },
    maxWage: 45000,  // SAR - Maximum contributable wage
    minWage: 4000,   // SAR - Minimum wage for Saudis
  };
}

/**
 * Current GOSI rates (default to legacy rates for backward compatibility)
 * @deprecated Use getGosiRates(registrationDate) for accurate rate selection
 */
export const CURRENT_GOSI_RATES: GosiRates = LEGACY_GOSI_RATES;

// ============================================================================
// Employee Management
// ============================================================================

/**
 * Register employee for GOSI
 */
export async function registerEmployee(
  orgId: string,
  data: {
    employeeId: string;
    iqamaNumber: string;
    nationalId?: string;
    fullName: string;
    fullNameAr: string;
    dateOfBirth: Date;
    nationality: string;
    gender: "male" | "female";
    maritalStatus: "single" | "married" | "divorced" | "widowed";
    jobTitle: string;
    jobTitleAr: string;
    department: string;
    basicSalary: number;
    housingAllowance: number;
  }
): Promise<{ success: boolean; gosiEmployeeId?: string; error?: string }> {
  try {
    const db = await getDatabase();
    
    // Check if already registered
    const existing = await db.collection(GOSI_EMPLOYEES_COLLECTION).findOne({
      orgId,
      $or: [
        { employeeId: data.employeeId },
        { iqamaNumber: data.iqamaNumber },
      ],
    });
    
    if (existing) {
      return { success: false, error: "Employee already registered for GOSI" };
    }
    
    // Calculate total GOSI wage
    const totalGosiWage = calculateGosiWage(data.basicSalary, data.housingAllowance);
    
    const employee: Omit<GosiEmployee, "_id"> = {
      orgId,
      ...data,
      totalGosiWage,
      status: GosiStatus.PENDING_REGISTRATION,
      contributions: [],
      complianceAlerts: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    const result = await db.collection(GOSI_EMPLOYEES_COLLECTION).insertOne(employee);
    
    logger.info("Employee registered for GOSI", {
      component: "gosi-compliance",
      action: "registerEmployee",
    });
    
    return { success: true, gosiEmployeeId: result.insertedId.toString() };
  } catch (_error) {
    logger.error("Failed to register employee", { component: "gosi-compliance" });
    return { success: false, error: "Failed to register employee" };
  }
}

/**
 * Update employee GOSI details
 */
export async function updateEmployeeWage(
  employeeId: string,
  orgId: string,
  basicSalary: number,
  housingAllowance: number
): Promise<{ success: boolean; newContribution?: number; error?: string }> {
  try {
    const db = await getDatabase();
    
    const totalGosiWage = calculateGosiWage(basicSalary, housingAllowance);
    const contribution = calculateContribution(totalGosiWage);
    
    const result = await db.collection(GOSI_EMPLOYEES_COLLECTION).updateOne(
      { _id: new ObjectId(employeeId), orgId },
      {
        $set: {
          basicSalary,
          housingAllowance,
          totalGosiWage,
          updatedAt: new Date(),
        },
      }
    );
    
    if (result.modifiedCount === 0) {
      return { success: false, error: "Employee not found" };
    }
    
    logger.info("Employee GOSI wage updated", {
      component: "gosi-compliance",
      action: "updateEmployeeWage",
    });
    
    return { success: true, newContribution: contribution.total };
  } catch (_error) {
    logger.error("Failed to update wage", { component: "gosi-compliance" });
    return { success: false, error: "Failed to update wage" };
  }
}

/**
 * Set GOSI number after official registration
 */
export async function setGosiNumber(
  employeeId: string,
  orgId: string,
  gosiNumber: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = await getDatabase();
    
    const result = await db.collection(GOSI_EMPLOYEES_COLLECTION).updateOne(
      { _id: new ObjectId(employeeId), orgId },
      {
        $set: {
          gosiNumber,
          status: GosiStatus.REGISTERED,
          registrationDate: new Date(),
          updatedAt: new Date(),
        },
      }
    );
    
    if (result.modifiedCount === 0) {
      return { success: false, error: "Employee not found" };
    }
    
    logger.info("GOSI number assigned", {
      component: "gosi-compliance",
      action: "setGosiNumber",
    });
    
    return { success: true };
  } catch (_error) {
    logger.error("Failed to set GOSI number", { component: "gosi-compliance" });
    return { success: false, error: "Failed to set GOSI number" };
  }
}

/**
 * Terminate employee from GOSI
 */
export async function terminateEmployee(
  employeeId: string,
  orgId: string,
  terminationDate: Date
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = await getDatabase();
    
    const result = await db.collection(GOSI_EMPLOYEES_COLLECTION).updateOne(
      { _id: new ObjectId(employeeId), orgId, status: GosiStatus.REGISTERED },
      {
        $set: {
          status: GosiStatus.TERMINATED,
          terminationDate,
          updatedAt: new Date(),
        },
      }
    );
    
    if (result.modifiedCount === 0) {
      return { success: false, error: "Employee not found or not registered" };
    }
    
    logger.info("Employee terminated from GOSI", {
      component: "gosi-compliance",
      action: "terminateEmployee",
    });
    
    return { success: true };
  } catch (_error) {
    logger.error("Failed to terminate employee", { component: "gosi-compliance" });
    return { success: false, error: "Failed to terminate employee" };
  }
}

// ============================================================================
// Contribution Calculation
// ============================================================================

/**
 * Calculate GOSI wage from salary components
 */
export function calculateGosiWage(
  basicSalary: number,
  housingAllowance: number
): number {
  const rates = CURRENT_GOSI_RATES;
  let wage = 0;
  
  if (rates.wageComponents.basicSalary) wage += basicSalary;
  if (rates.wageComponents.housingAllowance) wage += housingAllowance;
  
  // Apply max wage cap
  return Math.min(wage, rates.maxWage);
}

/**
 * Calculate contribution breakdown
 */
export function calculateContribution(gosiWage: number): {
  employer: {
    annuities: number;
    hazards: number;
    unemployment: number;
    total: number;
  };
  employee: {
    annuities: number;
    unemployment: number;
    total: number;
  };
  total: number;
} {
  const rates = CURRENT_GOSI_RATES;
  
  const employer = {
    annuities: Math.round(gosiWage * rates.annuities.employer * 100) / 100,
    hazards: Math.round(gosiWage * rates.hazards.employer * 100) / 100,
    unemployment: Math.round(gosiWage * rates.unemployment.employer * 100) / 100,
    total: 0,
  };
  employer.total = employer.annuities + employer.hazards + employer.unemployment;
  
  const employee = {
    annuities: Math.round(gosiWage * rates.annuities.employee * 100) / 100,
    unemployment: Math.round(gosiWage * rates.unemployment.employee * 100) / 100,
    total: 0,
  };
  employee.total = employee.annuities + employee.unemployment;
  
  return {
    employer,
    employee,
    total: employer.total + employee.total,
  };
}

/**
 * Calculate annual employer GOSI cost for an employee
 */
export function calculateAnnualEmployerCost(gosiWage: number): number {
  const rates = CURRENT_GOSI_RATES;
  const monthlyRate = rates.annuities.employer + rates.hazards.employer + rates.unemployment.employer;
  return Math.round(gosiWage * monthlyRate * 12 * 100) / 100;
}

// ============================================================================
// Monthly Reporting
// ============================================================================

/**
 * Generate monthly GOSI report
 */
export async function generateMonthlyReport(
  orgId: string,
  period: string, // YYYY-MM
  userId: string
): Promise<{ success: boolean; reportId?: string; error?: string }> {
  try {
    const db = await getDatabase();
    
    // Check if report already exists
    const existing = await db.collection(GOSI_REPORTS_COLLECTION).findOne({
      orgId,
      period,
    });
    
    if (existing) {
      return { success: false, error: "Report already exists for this period" };
    }
    
    // Get all active employees
    const employees = await db.collection(GOSI_EMPLOYEES_COLLECTION)
      .find({
        orgId,
        status: GosiStatus.REGISTERED,
      })
      .toArray() as WithId<Document>[];
    
    let totalWages = 0;
    let totalEmployer = 0;
    let totalEmployee = 0;
    
    const contributions = {
      annuities: { employer: 0, employee: 0 },
      hazards: { employer: 0, employee: 0 },
      unemployment: { employer: 0, employee: 0 },
    };
    
    const reportEmployees: GosiReportEmployee[] = [];
    
    for (const emp of employees) {
      const employee = emp as unknown as GosiEmployee;
      const gosiWage = employee.totalGosiWage;
      const contrib = calculateContribution(gosiWage);
      
      totalWages += gosiWage;
      totalEmployer += contrib.employer.total;
      totalEmployee += contrib.employee.total;
      
      contributions.annuities.employer += contrib.employer.annuities;
      contributions.annuities.employee += contrib.employee.annuities;
      contributions.hazards.employer += contrib.employer.hazards;
      contributions.hazards.employee += 0; // No employee contribution for hazards
      contributions.unemployment.employer += contrib.employer.unemployment;
      contributions.unemployment.employee += contrib.employee.unemployment;
      
      reportEmployees.push({
        employeeId: employee.employeeId,
        gosiNumber: employee.gosiNumber || "",
        name: employee.fullName,
        basicSalary: employee.basicSalary,
        housingAllowance: employee.housingAllowance,
        totalWage: gosiWage,
        employerContribution: contrib.employer.total,
        employeeContribution: contrib.employee.total,
        totalContribution: contrib.total,
        status: "active",
      });
    }
    
    const report: Omit<GosiMonthlyReport, "_id"> = {
      orgId,
      period,
      status: "draft",
      employeeCount: employees.length,
      totalWages,
      contributions,
      totalEmployer,
      totalEmployee,
      grandTotal: totalEmployer + totalEmployee,
      employees: reportEmployees,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: userId,
    };
    
    const result = await db.collection(GOSI_REPORTS_COLLECTION).insertOne(report);
    
    logger.info("GOSI monthly report generated", {
      component: "gosi-compliance",
      action: "generateMonthlyReport",
    });
    
    return { success: true, reportId: result.insertedId.toString() };
  } catch (_error) {
    logger.error("Failed to generate report", { component: "gosi-compliance" });
    return { success: false, error: "Failed to generate report" };
  }
}

/**
 * Submit monthly report to GOSI
 */
export async function submitReport(
  reportId: string,
  orgId: string
): Promise<{ success: boolean; referenceNumber?: string; error?: string }> {
  try {
    const db = await getDatabase();
    
    // Generate reference number (in production, this comes from GOSI API)
    const referenceNumber = `GOSI-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;
    
    const result = await db.collection(GOSI_REPORTS_COLLECTION).updateOne(
      { _id: new ObjectId(reportId), orgId, status: "draft" },
      {
        $set: {
          status: "submitted",
          submissionDate: new Date(),
          referenceNumber,
          updatedAt: new Date(),
        },
      }
    );
    
    if (result.modifiedCount === 0) {
      return { success: false, error: "Report not found or already submitted" };
    }
    
    logger.info("GOSI report submitted", {
      component: "gosi-compliance",
      action: "submitReport",
    });
    
    return { success: true, referenceNumber };
  } catch (_error) {
    logger.error("Failed to submit report", { component: "gosi-compliance" });
    return { success: false, error: "Failed to submit report" };
  }
}

// ============================================================================
// Compliance Monitoring
// ============================================================================

/**
 * Run compliance check for organization
 */
export async function runComplianceCheck(
  orgId: string
): Promise<ComplianceAlert[]> {
  try {
    const db = await getDatabase();
    const alerts: ComplianceAlert[] = [];
    const now = new Date();
    
    // Check for unregistered employees
    const unregistered = await db.collection(GOSI_EMPLOYEES_COLLECTION)
      .find({
        orgId,
        status: GosiStatus.PENDING_REGISTRATION,
        createdAt: { $lt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) }, // > 7 days old
      })
      .toArray();
    
    for (const emp of unregistered) {
      const employee = emp as unknown as GosiEmployee;
      alerts.push({
        id: `unreg-${employee.employeeId}`,
        type: "missing_registration",
        severity: "critical",
        message: `Employee ${employee.fullName} pending GOSI registration for over 7 days`,
        messageAr: `الموظف ${employee.fullNameAr} في انتظار التسجيل في التأمينات الاجتماعية لأكثر من 7 أيام`,
        details: { employeeId: employee.employeeId, createdAt: employee.createdAt },
        createdAt: now,
      });
    }
    
    // Check for missing monthly reports
    const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const lastReport = await db.collection(GOSI_REPORTS_COLLECTION)
      .findOne({ orgId }, { sort: { period: -1 } }) as WithId<Document> | null;
    
    if (lastReport) {
      const report = lastReport as unknown as GosiMonthlyReport;
      if (report.period !== currentPeriod && now.getDate() > 10) {
        alerts.push({
          id: `missing-report-${currentPeriod}`,
          type: "late_payment",
          severity: "warning",
          message: `Monthly GOSI report for ${currentPeriod} not yet generated`,
          messageAr: `لم يتم إنشاء تقرير التأمينات الاجتماعية الشهري لـ ${currentPeriod}`,
          details: { period: currentPeriod, lastPeriod: report.period },
          createdAt: now,
        });
      }
    }
    
    // Check for pending terminations
    const pendingTerminations = await db.collection(GOSI_EMPLOYEES_COLLECTION)
      .find({
        orgId,
        status: GosiStatus.REGISTERED,
        terminationDate: { $exists: true, $lt: now },
      })
      .toArray();
    
    for (const emp of pendingTerminations) {
      const employee = emp as unknown as GosiEmployee;
      alerts.push({
        id: `term-${employee.employeeId}`,
        type: "termination_pending",
        severity: "warning",
        message: `Employee ${employee.fullName} termination not processed in GOSI`,
        messageAr: `لم يتم معالجة إنهاء خدمة الموظف ${employee.fullNameAr} في التأمينات`,
        details: { 
          employeeId: employee.employeeId, 
          terminationDate: employee.terminationDate,
        },
        createdAt: now,
      });
    }
    
    logger.info("Compliance check completed", {
      component: "gosi-compliance",
      action: "runComplianceCheck",
    });
    
    return alerts;
  } catch (_error) {
    logger.error("Failed to run compliance check", { component: "gosi-compliance" });
    return [];
  }
}

/**
 * Get compliance dashboard data
 */
export async function getComplianceDashboard(
  orgId: string
): Promise<{
  totalEmployees: number;
  registered: number;
  pending: number;
  monthlyContribution: number;
  annualCost: number;
  complianceScore: number;
  alerts: ComplianceAlert[];
}> {
  try {
    const db = await getDatabase();
    
    // Get employee counts
    const employeeStats = await db.collection(GOSI_EMPLOYEES_COLLECTION)
      .aggregate([
        { $match: { orgId } },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
            totalWage: { $sum: "$totalGosiWage" },
          },
        },
      ])
      .toArray();
    
    let totalEmployees = 0;
    let registered = 0;
    let pending = 0;
    let totalWage = 0;
    
    for (const stat of employeeStats) {
      totalEmployees += stat.count as number;
      if (stat._id === GosiStatus.REGISTERED) {
        registered = stat.count as number;
        totalWage = stat.totalWage as number;
      }
      if (stat._id === GosiStatus.PENDING_REGISTRATION) {
        pending = stat.count as number;
      }
    }
    
    // Calculate contributions
    const monthlyContrib = calculateContribution(totalWage);
    const annualCost = calculateAnnualEmployerCost(totalWage); // Use centralized rate calculation
    
    // Get alerts
    const alerts = await runComplianceCheck(orgId);
    
    // Calculate compliance score
    let score = 100;
    if (pending > 0) score -= Math.min(30, pending * 10);
    for (const alert of alerts) {
      if (alert.severity === "critical") score -= 15;
      if (alert.severity === "warning") score -= 5;
    }
    
    return {
      totalEmployees,
      registered,
      pending,
      monthlyContribution: monthlyContrib.employer.total,
      annualCost: Math.round(annualCost),
      complianceScore: Math.max(0, score),
      alerts,
    };
  } catch (_error) {
    logger.error("Failed to get dashboard", { component: "gosi-compliance" });
    return {
      totalEmployees: 0,
      registered: 0,
      pending: 0,
      monthlyContribution: 0,
      annualCost: 0,
      complianceScore: 0,
      alerts: [],
    };
  }
}

// ============================================================================
// Exports
// ============================================================================

export default {
  registerEmployee,
  updateEmployeeWage,
  setGosiNumber,
  terminateEmployee,
  calculateGosiWage,
  calculateContribution,
  calculateAnnualEmployerCost,
  generateMonthlyReport,
  submitReport,
  runComplianceCheck,
  getComplianceDashboard,
};
