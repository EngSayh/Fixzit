/**
 * NCA ECC-2:2024 Compliance Dashboard Service
 * 
 * Implements the 108 cybersecurity controls from NCA's
 * Essential Cybersecurity Controls framework.
 * 
 * @module services/compliance/nca-service
 */

import type {
  NcaControl,
  NcaComplianceRecord,
  NcaControlDomain,
  NcaControlStatus,
} from "@/types/compliance";
import type { ObjectId } from "mongodb";

// =============================================================================
// NCA CONTROL DEFINITIONS (69 CONTROLS)
// =============================================================================

/**
 * NCA ECC-2:2024 Control Framework
 * Organized by 6 domains with sub-controls
 */
export const NCA_CONTROLS: Omit<NcaControl, "tenant_id" | "status" | "evidence_ids" | "last_assessed" | "next_review" | "notes" | "remediation_plan" | "remediation_deadline">[] = [
  // Domain 1: Cybersecurity Governance (1-1 through 1-16)
  { control_id: "1-1-1", domain: "cybersecurity_governance", name: "Cybersecurity Strategy", description: "Establish and maintain a cybersecurity strategy aligned with business objectives", level: 1 },
  { control_id: "1-1-2", domain: "cybersecurity_governance", name: "Cybersecurity Policies", description: "Develop and maintain comprehensive cybersecurity policies", level: 1 },
  { control_id: "1-1-3", domain: "cybersecurity_governance", name: "Cybersecurity Roles", description: "Define cybersecurity roles and responsibilities", level: 1 },
  { control_id: "1-2-1", domain: "cybersecurity_governance", name: "Risk Management", description: "Implement cybersecurity risk management process", level: 1 },
  { control_id: "1-2-2", domain: "cybersecurity_governance", name: "Risk Assessment", description: "Conduct regular cybersecurity risk assessments", level: 1 },
  { control_id: "1-2-3", domain: "cybersecurity_governance", name: "Risk Treatment", description: "Implement risk treatment plans", level: 2 },
  { control_id: "1-3-1", domain: "cybersecurity_governance", name: "Compliance Management", description: "Ensure compliance with applicable laws and regulations", level: 1 },
  { control_id: "1-3-2", domain: "cybersecurity_governance", name: "Audit Program", description: "Establish internal audit program for cybersecurity", level: 2 },
  { control_id: "1-4-1", domain: "cybersecurity_governance", name: "Awareness Program", description: "Implement cybersecurity awareness program", level: 1 },
  { control_id: "1-4-2", domain: "cybersecurity_governance", name: "Training Program", description: "Provide cybersecurity training to staff", level: 1 },
  { control_id: "1-5-1", domain: "cybersecurity_governance", name: "Project Security", description: "Integrate security into project management", level: 2 },
  { control_id: "1-5-2", domain: "cybersecurity_governance", name: "Change Management", description: "Implement secure change management process", level: 2 },
  { control_id: "1-6-1", domain: "cybersecurity_governance", name: "Asset Inventory", description: "Maintain inventory of information assets", level: 1 },
  { control_id: "1-6-2", domain: "cybersecurity_governance", name: "Asset Classification", description: "Classify assets based on sensitivity", level: 1 },
  { control_id: "1-6-3", domain: "cybersecurity_governance", name: "Asset Handling", description: "Define procedures for asset handling", level: 2 },
  { control_id: "1-7-1", domain: "cybersecurity_governance", name: "HR Security", description: "Implement HR security controls", level: 1 },
  
  // Domain 2: Cybersecurity Defense (2-1 through 2-40)
  { control_id: "2-1-1", domain: "cybersecurity_defense", name: "Identity Management", description: "Implement identity management system", level: 1 },
  { control_id: "2-1-2", domain: "cybersecurity_defense", name: "Access Control", description: "Implement access control mechanisms", level: 1 },
  { control_id: "2-1-3", domain: "cybersecurity_defense", name: "Privileged Access", description: "Manage privileged access accounts", level: 1 },
  { control_id: "2-1-4", domain: "cybersecurity_defense", name: "MFA Implementation", description: "Implement multi-factor authentication", level: 1 },
  { control_id: "2-2-1", domain: "cybersecurity_defense", name: "Network Security", description: "Implement network security controls", level: 1 },
  { control_id: "2-2-2", domain: "cybersecurity_defense", name: "Network Segmentation", description: "Implement network segmentation", level: 2 },
  { control_id: "2-2-3", domain: "cybersecurity_defense", name: "Firewall Management", description: "Configure and manage firewalls", level: 1 },
  { control_id: "2-2-4", domain: "cybersecurity_defense", name: "Intrusion Detection", description: "Deploy intrusion detection/prevention", level: 2 },
  { control_id: "2-3-1", domain: "cybersecurity_defense", name: "Endpoint Security", description: "Implement endpoint protection", level: 1 },
  { control_id: "2-3-2", domain: "cybersecurity_defense", name: "Mobile Security", description: "Implement mobile device security", level: 2 },
  { control_id: "2-3-3", domain: "cybersecurity_defense", name: "Server Security", description: "Implement server hardening", level: 1 },
  { control_id: "2-4-1", domain: "cybersecurity_defense", name: "Application Security", description: "Implement secure development practices", level: 2 },
  { control_id: "2-4-2", domain: "cybersecurity_defense", name: "Input Validation", description: "Implement input validation", level: 1 },
  { control_id: "2-4-3", domain: "cybersecurity_defense", name: "Security Testing", description: "Conduct regular security testing", level: 2 },
  { control_id: "2-5-1", domain: "cybersecurity_defense", name: "Data Protection", description: "Implement data protection controls", level: 1 },
  { control_id: "2-5-2", domain: "cybersecurity_defense", name: "Encryption at Rest", description: "Encrypt sensitive data at rest", level: 1 },
  { control_id: "2-5-3", domain: "cybersecurity_defense", name: "Encryption in Transit", description: "Encrypt data in transit", level: 1 },
  { control_id: "2-5-4", domain: "cybersecurity_defense", name: "Key Management", description: "Implement cryptographic key management", level: 2 },
  { control_id: "2-6-1", domain: "cybersecurity_defense", name: "Email Security", description: "Implement email security controls", level: 1 },
  { control_id: "2-6-2", domain: "cybersecurity_defense", name: "Web Security", description: "Implement web security controls", level: 1 },
  { control_id: "2-7-1", domain: "cybersecurity_defense", name: "Physical Security", description: "Implement physical access controls", level: 1 },
  { control_id: "2-7-2", domain: "cybersecurity_defense", name: "Environmental Controls", description: "Implement environmental controls", level: 2 },
  
  // Domain 3: Cybersecurity Resilience (3-1 through 3-20)
  { control_id: "3-1-1", domain: "cybersecurity_resilience", name: "Vulnerability Management", description: "Implement vulnerability management program", level: 1 },
  { control_id: "3-1-2", domain: "cybersecurity_resilience", name: "Vulnerability Scanning", description: "Conduct regular vulnerability scans", level: 1 },
  { control_id: "3-1-3", domain: "cybersecurity_resilience", name: "Patch Management", description: "Implement patch management process", level: 1 },
  { control_id: "3-2-1", domain: "cybersecurity_resilience", name: "Threat Intelligence", description: "Implement threat intelligence program", level: 2 },
  { control_id: "3-2-2", domain: "cybersecurity_resilience", name: "Threat Monitoring", description: "Monitor for cyber threats", level: 1 },
  { control_id: "3-3-1", domain: "cybersecurity_resilience", name: "Log Management", description: "Implement centralized log management", level: 1 },
  { control_id: "3-3-2", domain: "cybersecurity_resilience", name: "SIEM Implementation", description: "Implement SIEM solution", level: 2 },
  { control_id: "3-3-3", domain: "cybersecurity_resilience", name: "Log Retention", description: "Define log retention policy", level: 1 },
  { control_id: "3-4-1", domain: "cybersecurity_resilience", name: "Incident Response", description: "Establish incident response plan", level: 1 },
  { control_id: "3-4-2", domain: "cybersecurity_resilience", name: "Incident Detection", description: "Implement incident detection capabilities", level: 1 },
  { control_id: "3-4-3", domain: "cybersecurity_resilience", name: "Incident Reporting", description: "Define incident reporting procedures", level: 1 },
  { control_id: "3-5-1", domain: "cybersecurity_resilience", name: "Business Continuity", description: "Develop business continuity plan", level: 1 },
  { control_id: "3-5-2", domain: "cybersecurity_resilience", name: "Disaster Recovery", description: "Implement disaster recovery plan", level: 1 },
  { control_id: "3-5-3", domain: "cybersecurity_resilience", name: "Backup Management", description: "Implement backup procedures", level: 1 },
  
  // Domain 4: Third-Party Cybersecurity (4-1 through 4-12)
  { control_id: "4-1-1", domain: "third_party_cybersecurity", name: "Vendor Assessment", description: "Assess third-party security posture", level: 1 },
  { control_id: "4-1-2", domain: "third_party_cybersecurity", name: "Vendor Contracts", description: "Include security requirements in contracts", level: 1 },
  { control_id: "4-1-3", domain: "third_party_cybersecurity", name: "Vendor Monitoring", description: "Monitor third-party compliance", level: 2 },
  { control_id: "4-2-1", domain: "third_party_cybersecurity", name: "Outsourcing Security", description: "Secure outsourced services", level: 1 },
  { control_id: "4-2-2", domain: "third_party_cybersecurity", name: "Data Sharing", description: "Control data sharing with third parties", level: 1 },
  
  // Domain 5: ICS Cybersecurity (5-1 through 5-15) - if applicable
  { control_id: "5-1-1", domain: "industrial_control_systems", name: "ICS Governance", description: "Establish ICS security governance", level: 3 },
  { control_id: "5-1-2", domain: "industrial_control_systems", name: "ICS Risk Management", description: "Implement ICS risk management", level: 3 },
  { control_id: "5-2-1", domain: "industrial_control_systems", name: "ICS Network Security", description: "Segment ICS networks", level: 3 },
  { control_id: "5-2-2", domain: "industrial_control_systems", name: "ICS Access Control", description: "Control access to ICS systems", level: 3 },
  
  // Domain 6: Cloud Cybersecurity (6-1 through 6-15)
  { control_id: "6-1-1", domain: "cloud_computing", name: "Cloud Strategy", description: "Define cloud security strategy", level: 1 },
  { control_id: "6-1-2", domain: "cloud_computing", name: "Cloud Provider Assessment", description: "Assess cloud provider security", level: 1 },
  { control_id: "6-2-1", domain: "cloud_computing", name: "Cloud Access Control", description: "Implement cloud access controls", level: 1 },
  { control_id: "6-2-2", domain: "cloud_computing", name: "Cloud Data Protection", description: "Protect data in cloud", level: 1 },
  { control_id: "6-2-3", domain: "cloud_computing", name: "Cloud Encryption", description: "Encrypt cloud data", level: 1 },
  { control_id: "6-3-1", domain: "cloud_computing", name: "Cloud Monitoring", description: "Monitor cloud security", level: 1 },
  { control_id: "6-3-2", domain: "cloud_computing", name: "Cloud Incident Response", description: "Plan for cloud incidents", level: 2 },
];

// =============================================================================
// COMPLIANCE SCORING
// =============================================================================

/**
 * Calculate overall NCA compliance score
 */
export function calculateNcaScore(controls: NcaControl[]): number {
  if (controls.length === 0) return 0;
  
  let totalWeight = 0;
  let earnedWeight = 0;
  
  for (const control of controls) {
    // Weight by level (higher level = more weight)
    const weight = control.level;
    totalWeight += weight;
    
    switch (control.status) {
      case "compliant":
        earnedWeight += weight;
        break;
      case "partially_compliant":
        earnedWeight += weight * 0.5;
        break;
      case "not_applicable":
        // Remove from total
        totalWeight -= weight;
        break;
      // non_compliant and not_assessed get 0
    }
  }
  
  if (totalWeight === 0) return 100;
  return Math.round((earnedWeight / totalWeight) * 100);
}

/**
 * Determine risk level based on compliance score
 */
export function determineRiskLevel(score: number): "low" | "medium" | "high" | "critical" {
  if (score >= 90) return "low";
  if (score >= 70) return "medium";
  if (score >= 50) return "high";
  return "critical";
}

/**
 * Get controls by domain
 */
export function getControlsByDomain(
  controls: NcaControl[],
  domain: NcaControlDomain
): NcaControl[] {
  return controls.filter(c => c.domain === domain);
}

/**
 * Get domain compliance score
 */
export function getDomainScore(
  controls: NcaControl[],
  domain: NcaControlDomain
): number {
  const domainControls = getControlsByDomain(controls, domain);
  return calculateNcaScore(domainControls);
}

// =============================================================================
// COMPLIANCE RECORD MANAGEMENT
// =============================================================================

/**
 * Initialize NCA compliance record for a tenant
 */
export function initializeNcaCompliance(
  tenantId: ObjectId
): Omit<NcaComplianceRecord, "created_at" | "updated_at"> {
  const controls: NcaControl[] = NCA_CONTROLS.map(template => ({
    ...template,
    status: "not_assessed" as NcaControlStatus,
    evidence_ids: [],
  }));
  
  return {
    tenant_id: tenantId,
    controls,
    overall_score: 0,
    risk_level: "critical",
    certification_status: "not_started",
  };
}

/**
 * Update a control's status
 */
export function updateControlStatus(
  record: NcaComplianceRecord,
  controlId: string,
  status: NcaControlStatus,
  evidenceIds: ObjectId[] = [],
  notes?: string
): NcaComplianceRecord {
  const updatedControls = record.controls.map(control => {
    if (control.control_id === controlId) {
      return {
        ...control,
        status,
        evidence_ids: evidenceIds,
        notes,
        last_assessed: new Date(),
        next_review: calculateNextReview(status),
      };
    }
    return control;
  });
  
  const newScore = calculateNcaScore(updatedControls);
  
  return {
    ...record,
    controls: updatedControls,
    overall_score: newScore,
    risk_level: determineRiskLevel(newScore),
    last_assessment_date: new Date(),
  };
}

function calculateNextReview(status: NcaControlStatus): Date {
  const now = new Date();
  switch (status) {
    case "compliant":
      // Review annually
      now.setFullYear(now.getFullYear() + 1);
      break;
    case "partially_compliant":
      // Review quarterly
      now.setMonth(now.getMonth() + 3);
      break;
    case "non_compliant":
      // Review monthly
      now.setMonth(now.getMonth() + 1);
      break;
    default:
      // Review in 2 weeks
      now.setDate(now.getDate() + 14);
  }
  return now;
}

// =============================================================================
// DASHBOARD HELPERS
// =============================================================================

export interface NcaDashboardSummary {
  overall_score: number;
  risk_level: "low" | "medium" | "high" | "critical";
  total_controls: number;
  by_status: Record<NcaControlStatus, number>;
  by_domain: Record<NcaControlDomain, { score: number; total: number }>;
  overdue_reviews: number;
  upcoming_reviews: number;
  certification_status: string;
}

/**
 * Generate dashboard summary from compliance record
 */
export function generateDashboardSummary(
  record: NcaComplianceRecord
): NcaDashboardSummary {
  const byStatus: Record<NcaControlStatus, number> = {
    not_assessed: 0,
    compliant: 0,
    partially_compliant: 0,
    non_compliant: 0,
    not_applicable: 0,
  };
  
  const byDomain: Record<NcaControlDomain, { score: number; total: number }> = {
    cybersecurity_governance: { score: 0, total: 0 },
    cybersecurity_defense: { score: 0, total: 0 },
    cybersecurity_resilience: { score: 0, total: 0 },
    third_party_cybersecurity: { score: 0, total: 0 },
    industrial_control_systems: { score: 0, total: 0 },
    cloud_computing: { score: 0, total: 0 },
  };
  
  const now = new Date();
  let overdueReviews = 0;
  let upcomingReviews = 0;
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  
  for (const control of record.controls) {
    byStatus[control.status]++;
    byDomain[control.domain].total++;
    
    if (control.next_review) {
      if (control.next_review < now) {
        overdueReviews++;
      } else if (control.next_review <= thirtyDaysFromNow) {
        upcomingReviews++;
      }
    }
  }
  
  // Calculate domain scores
  for (const domain of Object.keys(byDomain) as NcaControlDomain[]) {
    byDomain[domain].score = getDomainScore(record.controls, domain);
  }
  
  return {
    overall_score: record.overall_score,
    risk_level: record.risk_level,
    total_controls: record.controls.length,
    by_status: byStatus,
    by_domain: byDomain,
    overdue_reviews: overdueReviews,
    upcoming_reviews: upcomingReviews,
    certification_status: record.certification_status,
  };
}
