/**
 * FM Approval Routing Engine
 * Routes quotations to appropriate approvers based on APPROVAL_POLICIES
 */

import { APPROVAL_POLICIES, Role } from '@/domain/fm/fm.behavior';

export interface ApprovalRequest {
  quotationId: string;
  workOrderId: string;
  amount: number;
  category: string;
  propertyId: string;
  orgId: string;
  requestedBy: string;
  requestedAt: Date;
}

export interface ApprovalStage {
  stage: number;
  approvers: string[]; // User IDs
  approverRoles: Role[];
  type: 'sequential' | 'parallel';
  timeout: number; // milliseconds
  status: 'pending' | 'approved' | 'rejected' | 'escalated' | 'timeout';
  decisions: ApprovalDecision[];
}

export interface ApprovalDecision {
  approverId: string;
  decision: 'approve' | 'reject' | 'delegate';
  delegateTo?: string;
  note?: string;
  timestamp: Date;
}

export interface ApprovalWorkflow {
  requestId: string;
  quotationId: string;
  workOrderId: string;
  stages: ApprovalStage[];
  currentStage: number;
  status: 'pending' | 'approved' | 'rejected' | 'escalated';
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Route a quotation to appropriate approvers based on amount and category
 */
export function routeApproval(request: ApprovalRequest): ApprovalWorkflow {
  // Find matching policy
  const policy = APPROVAL_POLICIES.find(p => {
    const meetsAmount = request.amount >= (p.when.amountGte || 0);
    const meetsCategory = !p.when.category || p.when.category.includes(request.category);
    return meetsAmount && meetsCategory;
  });

  if (!policy) {
    throw new Error(`No approval policy found for amount ${request.amount} and category ${request.category}`);
  }

  // Build approval stages
  const stages: ApprovalStage[] = [];
  
  // Main approval stage (sequential)
  stages.push({
    stage: 1,
    approvers: [], // TODO: Query users by role in org/property
    approverRoles: policy.require.map(r => r.role),
    type: 'sequential',
    timeout: (policy.timeoutHours || 24) * 60 * 60 * 1000, // Convert to milliseconds
    status: 'pending',
    decisions: []
  });

  // Parallel approval stage if defined
  if (policy.parallelWith && policy.parallelWith.length > 0) {
    stages.push({
      stage: 2,
      approvers: [],
      approverRoles: policy.parallelWith.map(r => r.role),
      type: 'parallel',
      timeout: (policy.timeoutHours || 24) * 60 * 60 * 1000,
      status: 'pending',
      decisions: []
    });
  }

  return {
    requestId: `APR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    quotationId: request.quotationId,
    workOrderId: request.workOrderId,
    stages,
    currentStage: 1,
    status: 'pending',
    createdAt: new Date(),
    updatedAt: new Date()
  };
}

/**
 * Process an approval decision
 */
export function processDecision(
  workflow: ApprovalWorkflow,
  approverId: string,
  decision: 'approve' | 'reject' | 'delegate',
  options?: {
    note?: string;
    delegateTo?: string;
  }
): ApprovalWorkflow {
  const currentStage = workflow.stages[workflow.currentStage - 1];

  if (!currentStage) {
    throw new Error('Invalid workflow stage');
  }

  // Add decision
  const decisionRecord: ApprovalDecision = {
    approverId,
    decision,
    delegateTo: options?.delegateTo,
    note: options?.note,
    timestamp: new Date()
  };

  currentStage.decisions.push(decisionRecord);

  // Handle delegation
  if (decision === 'delegate' && options?.delegateTo) {
    currentStage.approvers.push(options.delegateTo);
    workflow.updatedAt = new Date();
    return workflow;
  }

  // Handle rejection - entire workflow is rejected
  if (decision === 'reject') {
    currentStage.status = 'rejected';
    workflow.status = 'rejected';
    workflow.updatedAt = new Date();
    return workflow;
  }

  // Handle approval based on stage type
  if (decision === 'approve') {
    if (currentStage.type === 'sequential') {
      // Sequential: Need approval from all approvers in order
      const allApproved = currentStage.approvers.length > 0 &&
                         currentStage.approvers.every(a => 
                           currentStage.decisions.some(d => d.approverId === a && d.decision === 'approve')
                         );
      
      if (allApproved) {
        currentStage.status = 'approved';
        // Move to next stage
        if (workflow.currentStage < workflow.stages.length) {
          workflow.currentStage++;
        } else {
          // All stages approved - workflow complete
          workflow.status = 'approved';
        }
      }
    } else if (currentStage.type === 'parallel') {
      // Parallel: Need approval from any one approver
      currentStage.status = 'approved';
      
      // Move to next stage
      if (workflow.currentStage < workflow.stages.length) {
        workflow.currentStage++;
      } else {
        // All stages approved - workflow complete
        workflow.status = 'approved';
      }
    }
  }

  workflow.updatedAt = new Date();
  return workflow;
}

/**
 * Check for timeouts and escalate if needed
 */
export function checkTimeouts(workflow: ApprovalWorkflow): ApprovalWorkflow {
  const currentStage = workflow.stages[workflow.currentStage - 1];

  if (!currentStage || currentStage.status !== 'pending') {
    return workflow;
  }

  const elapsedTime = Date.now() - workflow.updatedAt.getTime();

  if (elapsedTime > currentStage.timeout) {
    // Timeout occurred - escalate
    const policy = APPROVAL_POLICIES.find(p => p.require.length > 0);
    
    if (policy?.escalateTo) {
      // Add escalation approvers
      policy.escalateTo.forEach(role => {
        if (!currentStage.approverRoles.includes(role)) {
          currentStage.approverRoles.push(role);
          // TODO: Query and add user IDs for escalation roles
        }
      });
      
      currentStage.status = 'escalated';
      workflow.status = 'escalated';
      workflow.updatedAt = new Date();
    } else {
      // No escalation defined - mark as timeout
      currentStage.status = 'timeout';
      workflow.status = 'rejected'; // Auto-reject on timeout
      workflow.updatedAt = new Date();
    }
  }

  return workflow;
}

/**
 * Get pending approvals for a user
 */
export async function getPendingApprovalsForUser(
  _userId: string,
  _userRole: Role
): Promise<ApprovalWorkflow[]> {
  // TODO: Query FMApproval collection
  // For now, return empty array
  return [];
}

/**
 * Send approval notifications
 */
export async function notifyApprovers(
  workflow: ApprovalWorkflow,
  stage: ApprovalStage
): Promise<void> {
  // TODO: Implement notification sending
  // Use NOTIFY config from fm.behavior.ts
  console.log('[Approval] Notifying approvers for stage', stage.stage, 'of workflow', workflow.requestId);
}
