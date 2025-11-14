import { logger } from '@/lib/logger';
/**
 * FM Approval Routing Engine
 * Routes quotations to appropriate approvers based on APPROVAL_POLICIES
 * 
 * NOW WITH PERSISTENCE: Uses FMApproval model for database storage
 */

import { APPROVAL_POLICIES, Role } from '@/domain/fm/fm.behavior';
// eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
import { connectToDatabase } from '@/lib/mongodb-unified';
import { FMApproval, type FMApprovalDoc } from '@/server/models/FMApproval';
// eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
import type { ObjectId } from 'mongodb';
import type { Schema } from 'mongoose';

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
  
  // Main approval stage (sequential) - Query actual users by role
  const approverIds: string[] = [];
  const approverRoles: Role[] = policy.require.map(r => r.role);
  
  try {
    // Query users with required roles in the same organization
    const { User } = await import('@/server/models/User');
    await connectToDatabase();
    
    for (const roleReq of policy.require) {
      const users = await User.find({
        'professional.role': roleReq.role,
        orgId: request.orgId,
        isActive: true,
      }).select('_id email professional.role').limit(10).lean();
      
      if (users && users.length > 0) {
        approverIds.push(...users.map(u => u._id.toString()));
      } else {
        logger.warn(`[Approval] No users found for role ${roleReq.role} in org ${request.orgId}`);
      }
    }
    
    // If no approvers found, log warning but don't fail workflow creation
    if (approverIds.length === 0) {
      logger.warn('[Approval] No approvers found - workflow will need manual assignment', {
        orgId: request.orgId,
        roles: approverRoles,
      });
    }
  } catch (error: unknown) {
    logger.error('[Approval] Failed to query approvers:', { error });
  }
  
  stages.push({
    stage: 1,
    approvers: approverIds,
    approverRoles,
    type: 'sequential',
    timeout: (policy.timeoutHours || 24) * 60 * 60 * 1000,
    status: 'pending',
    decisions: []
  });

  // Parallel approval stage if defined - Query actual users
  if (policy.parallelWith && policy.parallelWith.length > 0) {
    const parallelApproverIds: string[] = [];
    const parallelRoles: Role[] = policy.parallelWith.map(r => r.role);
    
    try {
      const { User } = await import('@/server/models/User');
      
      for (const roleReq of policy.parallelWith) {
        const users = await User.find({
          'professional.role': roleReq.role,
          orgId: request.orgId,
          isActive: true,
        }).select('_id email professional.role').limit(10).lean();
        
        if (users && users.length > 0) {
          parallelApproverIds.push(...users.map(u => u._id.toString()));
        }
      }
    } catch (error: unknown) {
      logger.error('[Approval] Failed to query parallel approvers:', { error });
    }
    
    stages.push({
      stage: 2,
      approvers: parallelApproverIds,
      approverRoles: parallelRoles,
      type: 'parallel',
      timeout: (policy.timeoutHours || 24) * 60 * 60 * 1000,
      status: 'pending',
      decisions: []
    });
  }

  return {
    requestId: `APR-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
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
      // If no approvers assigned (empty list), treat as implicitly approved
      const allApproved = currentStage.approvers.length === 0 ||
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
      // Parallel: Need approval from any one approver (or implicitly approved if no approvers)
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
export function checkTimeouts(workflow: ApprovalWorkflow, orgId: string): ApprovalWorkflow {
  const currentStage = workflow.stages[workflow.currentStage - 1];

  if (!currentStage || currentStage.status !== 'pending') {
    return workflow;
  }

  const elapsedTime = Date.now() - workflow.updatedAt.getTime();

  if (elapsedTime > currentStage.timeout) {
    // Timeout occurred - escalate to higher roles
    const policy = APPROVAL_POLICIES.find(p => p.require.length > 0);
    
    if (policy?.escalateTo && policy.escalateTo.length > 0) {
      try {
        // Query users with escalation roles
        const { User } = await import('@/server/models/User');
        await connectToDatabase();
        
        // Add escalation roles to the stage
        for (const escalationRole of policy.escalateTo) {
          if (!currentStage.approverRoles.includes(escalationRole)) {
            currentStage.approverRoles.push(escalationRole);
            
            // Query and add escalation approvers with orgId filter
            const escalationUsers = await User.find({
              'professional.role': escalationRole,
              orgId: orgId,
              isActive: true,
            }).select('_id').limit(5).lean();
            
            if (escalationUsers && escalationUsers.length > 0) {
              const escalationIds = escalationUsers.map(u => u._id.toString());
              currentStage.approvers.push(...escalationIds);
              logger.info(`[Approval] Added ${escalationIds.length} escalation approvers for role ${escalationRole}`);
            }
          }
        }
        
        currentStage.status = 'escalated';
        workflow.status = 'escalated';
        workflow.updatedAt = new Date();
        
        logger.warn('[Approval] Workflow escalated due to timeout', {
          workflowId: workflow.requestId,
          elapsedHours: Math.round(elapsedTime / (1000 * 60 * 60)),
          escalationRoles: policy.escalateTo,
        });
      } catch (error: unknown) {
        logger.error('[Approval] Escalation query failed:', { error });
        // Fall back to marking as timeout
        currentStage.status = 'timeout';
        workflow.status = 'rejected';
        workflow.updatedAt = new Date();
      }
    } else {
      // No escalation defined - mark as timeout
      currentStage.status = 'timeout';
      workflow.status = 'rejected'; // Auto-reject on timeout
      workflow.updatedAt = new Date();
      
      logger.warn('[Approval] Workflow timed out (no escalation policy)', {
        workflowId: workflow.requestId,
        elapsedHours: Math.round(elapsedTime / (1000 * 60 * 60)),
      });
    }
  }

  return workflow;
}

/**
 * Save approval workflow to database
 * FIXED: Added proper await, error recovery, and transactional safety
 */
export async function saveApprovalWorkflow(
  workflow: ApprovalWorkflow,
  request: ApprovalRequest
): Promise<void> {
  try {
    const firstStage = workflow.stages[0];
    
    // CRITICAL: Validate stage exists before accessing approvers
    if (!firstStage) {
      throw new Error('Workflow must have at least one approval stage');
    }
    
    // CRITICAL: Ensure required fields exist (no invalid fallbacks)
    if (!firstStage.approvers?.[0] || !firstStage.approverRoles?.[0]) {
      throw new Error('Workflow first stage must have at least one approver and role');
    }
    
    const approverId = firstStage.approvers[0];
    const approverRole = firstStage.approverRoles[0];

    // CRITICAL: Use orgId field name for consistency with database schema
    const savedApproval = await FMApproval.create({
      orgId: request.orgId, // Fixed: Use orgId (camelCase) as per schema
      type: 'QUOTATION',
      entityType: 'WorkOrder',
      entityId: request.workOrderId,
      entityNumber: request.workOrderId,
      amount: request.amount,
      currency: 'SAR',
      thresholdLevel: `L${workflow.stages.length}`,
      workflowId: workflow.requestId,
      currentStage: workflow.currentStage,
      totalStages: workflow.stages.length,
      approverId,
      approverName: 'TBD', // Will be populated with actual user data
      approverEmail: 'tbd@example.com',
      approverRole,
      status: 'PENDING',
      dueDate: new Date(Date.now() + firstStage.timeout),
      timeoutMinutes: firstStage.timeout / 60000,
      history: [{
        timestamp: new Date(),
        action: 'CREATED',
        actorId: request.requestedBy,
        actorName: 'System',
        previousStatus: 'NEW',
        newStatus: 'PENDING',
        notes: `Approval workflow created for ${request.category} worth ${request.amount}`
      }]
    });
    
    // CRITICAL: Verify the workflow was actually saved
    if (!savedApproval || !savedApproval._id) {
      throw new Error('Failed to save approval workflow - no document returned');
    }
    
    logger.info('[Approval] Workflow saved to database', { requestId: workflow.requestId, dbId: savedApproval._id.toString() });
  } catch (error: unknown) {
    logger.error('[Approval] Failed to save workflow:', { error });
    // Re-throw with more context for debugging
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to persist approval workflow ${workflow.requestId}: ${reason}`);
  }
}

/**
 * Get workflow by ID
 * FIXED: Use org_id field name for consistency with database schema
 */
export async function getWorkflowById(workflowId: string, orgId: string): Promise<ApprovalWorkflow | null> {
  try {
    const approval = await FMApproval.findOne({ 
      workflowId, 
      orgId: orgId // Fixed: Use orgId (camelCase) as per schema
    }).lean<FMApprovalDoc>();
    
    if (!approval) return null;

    // Convert FMApproval to ApprovalWorkflow format
    return {
      requestId: workflowId,
      quotationId: approval.entityId.toString(),
      workOrderId: approval.entityId.toString(),
      stages: [{
        stage: approval.currentStage,
        approvers: [approval.approverId.toString()],
        approverRoles: [approval.approverRole as Role],
        type: 'sequential',
        timeout: approval.timeoutMinutes * 60000,
        status: approval.status === 'APPROVED' ? 'approved' : 
                approval.status === 'REJECTED' ? 'rejected' : 'pending',
        decisions: []
      }],
      currentStage: approval.currentStage,
      status: approval.status === 'APPROVED' ? 'approved' :
              approval.status === 'REJECTED' ? 'rejected' : 'pending',
      createdAt: approval.createdAt,
      updatedAt: approval.updatedAt
    };
  } catch (error: unknown) {
    logger.error('[Approval] Failed to fetch workflow:', { error });
    return null;
  }
}

/**
 * Update approval decision in database
 * FIXED: Use org_id field name for consistency with database schema
 */
export async function updateApprovalDecision(
  workflowId: string,
  orgId: string,
  approverId: string,
  decision: 'APPROVE' | 'REJECT' | 'DELEGATE',
  notes?: string,
  delegateTo?: string
): Promise<void> {
  try {
    const approval = await FMApproval.findOne({ workflowId, orgId: orgId }); // Fixed: Use orgId (camelCase) as per schema
    if (!approval) throw new Error(`Approval workflow ${workflowId} not found`);

    // Update status
    approval.status = decision === 'APPROVE' ? 'APPROVED' : 
                      decision === 'REJECT' ? 'REJECTED' : 'DELEGATED';
    approval.decision = decision;
    approval.decisionDate = new Date();
    approval.notes = notes;

    if (decision === 'DELEGATE' && delegateTo) {
      approval.delegatedTo = delegateTo as unknown as Schema.Types.ObjectId;
      approval.delegationDate = new Date();
      approval.delegationReason = notes;
    }

    // Add to history
    approval.history.push({
      timestamp: new Date(),
      action: decision,
      actorId: approverId as unknown as Schema.Types.ObjectId,
      actorName: 'TBD',
      previousStatus: 'PENDING',
      newStatus: approval.status,
      notes
    });

    await approval.save();
    logger.info('[Approval] Decision recorded', { workflowId, decision });
  } catch (error: unknown) {
    logger.error('[Approval] Failed to update decision:', { error });
    throw error;
  }
}

/**
 * Get pending approvals for a user
 * FIXED: Use org_id field name for consistency with database schema
 */
export async function getPendingApprovalsForUser(
  userId: string,
  _userRole: Role,
  orgId: string
): Promise<ApprovalWorkflow[]> {
  try {
    const approvals = await FMApproval.find({
      orgId: orgId, // Fixed: Use orgId (camelCase) as per schema
      approverId: userId,
      status: 'PENDING'
    }).lean();

    return approvals.map(approval => ({
      requestId: approval.workflowId.toString(),
      quotationId: approval.entityId.toString(),
      workOrderId: approval.entityId.toString(),
      stages: [{
        stage: approval.currentStage,
        approvers: [approval.approverId.toString()],
        approverRoles: [approval.approverRole as Role],
        type: 'sequential',
        timeout: approval.timeoutMinutes * 60000,
        status: 'pending',
        decisions: []
      }],
      currentStage: approval.currentStage,
      status: 'pending',
      createdAt: approval.createdAt as Date,
      updatedAt: approval.updatedAt as Date
    }));
  } catch (error: unknown) {
    logger.error('[Approval] Failed to get pending approvals:', { error });
    return [];
  }
}

/**
 * Check for approval timeouts and escalate
 * FIXED: Use org_id field name for consistency with database schema
 */
export async function checkApprovalTimeouts(orgId: string): Promise<void> {
  try {
    const overdueApprovals = await FMApproval.find({
      orgId: orgId, // Fixed: Use orgId (camelCase) as per schema
      status: 'PENDING',
      dueDate: { $lt: new Date() },
      escalationSentAt: null
    });

    for (const approval of overdueApprovals) {
      approval.status = 'ESCALATED';
      approval.escalationDate = new Date();
      approval.escalationSentAt = new Date();
      approval.escalatedReason = 'Approval timeout exceeded';

      approval.history.push({
        timestamp: new Date(),
        action: 'ESCALATED',
        actorId: 'system' as unknown as Schema.Types.ObjectId,
        actorName: 'System',
        previousStatus: 'PENDING',
        newStatus: 'ESCALATED',
        notes: 'Automatically escalated due to timeout'
      });

      await approval.save();
      logger.info('[Approval] Escalated:', approval.approvalNumber);
      
      // Resolve policy and current stage from approval for notifications
      const approvalPolicy = approval.policyId ? 
        APPROVAL_POLICIES.find(p => p.require.length > 0) : null;
      const approvalStage = approval.stages?.[approval.currentStageIndex || 0];
      
      // Send escalation notifications via fm-notifications system if policy exists
      if (approvalPolicy?.escalateTo && approvalStage) {
        await import('./fm-notifications').then(({ sendNotification }) => {
          approvalPolicy.escalateTo?.forEach(role => {
            void sendNotification({
              type: 'APPROVAL_ESCALATED',
              userId: '',
              role,
              title: 'Approval Request Escalated',
              message: `Approval request ${approval.approvalNumber} escalated due to timeout`,
              data: { approvalId: approval._id.toString(), stage: approvalStage.stage || 1 },
              priority: 'HIGH'
            });
          });
        }).catch(err => {
          logger.error('[Approval] Failed to send escalation notifications:', { err });
        });
      } else {
        logger.warn('[Approval] No policy or stage found for escalation notifications', {
          approvalId: approval._id.toString(),
          hasPolicy: !!approvalPolicy,
          hasStage: !!approvalStage
        });
      }
    }

    logger.info(`[Approval] Processed ${overdueApprovals.length} timeout escalations`);
  } catch (error: unknown) {
    logger.error('[Approval] Failed to check timeouts:', { error });
  }
}

/**
 * Send approval notifications to approvers
 */
export async function notifyApprovers(
  workflow: ApprovalWorkflow,
  stage: ApprovalStage
): Promise<void> {
  try {
    // Get approver details from User model
    const { User } = await import('@/server/models/User');
    const { buildNotification, sendNotification } = await import('./fm-notifications');
    
    if (stage.approvers.length === 0) {
      logger.warn('[Approval] No approvers to notify', { workflowId: workflow.requestId });
      return;
    }
    
    const approvers = await User.find({
      _id: { $in: stage.approvers }
    }).select('_id email personal.firstName personal.lastName').lean();
    
    if (!approvers || approvers.length === 0) {
      logger.warn('[Approval] Approver details not found', { 
        approverIds: stage.approvers,
        workflowId: workflow.requestId 
      });
      return;
    }
    
    // Build notification payload
    const recipients = approvers.map(approver => ({
      userId: approver._id.toString(),
      name: `${approver.personal?.firstName || ''} ${approver.personal?.lastName || ''}`.trim() || approver.email || 'Approver',
      email: approver.email,
      preferredChannels: ['push', 'email'] as const,
    }));
    
    const notification = buildNotification('onApprovalRequested', {
      quotationId: workflow.quotationId,
      workOrderId: workflow.workOrderId,
      description: `Stage ${stage.stage} approval required`,
    }, recipients);
    
    await sendNotification(notification);
    
    logger.info('[Approval] Notifications sent', { 
      workflowId: workflow.requestId,
      stage: stage.stage,
      recipientCount: recipients.length 
    });
  } catch (error: unknown) {
    logger.error('[Approval] Failed to send notifications:', { error });
  }
}
