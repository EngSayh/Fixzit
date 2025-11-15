import { logger } from '@/lib/logger';
/**
 * FM Approval Routing Engine
 * Routes quotations to appropriate approvers based on APPROVAL_POLICIES
 * 
 * NOW WITH PERSISTENCE: Uses FMApproval model for database storage
 */

import { APPROVAL_POLICIES, Role } from '@/domain/fm/fm.behavior';

// Lean query result types for type-safe Mongoose operations
interface LeanUser {
  _id: string;
  email: string;
  professional?: {
    role?: string;
    firstName?: string;
    lastName?: string;
  };
}

interface LeanUserBasic {
  _id: string;
}

interface LeanUserDetailed {
  _id: string;
  email: string;
  personal?: {
    firstName?: string;
    lastName?: string;
  };
}

interface DbApprovalStage {
  stage?: number;
  approvers?: Array<{ toString(): string } | string>;
  approverRoles?: Role[];
  type?: 'sequential' | 'parallel';
  timeout?: number;
  status?: ApprovalStage['status'];
  decisions?: Array<{
    approverId?: { toString(): string } | string;
    decision?: ApprovalDecision['decision'];
    delegateTo?: { toString(): string } | string;
    note?: string;
    timestamp?: Date | string;
  }>;
}

/**
 * Helper function to query users by role (DRY pattern)
 * @param orgId Organization ID to filter users
 * @param role Role to search for
 * @param limit Maximum number of users to return (default: 10)
 * @returns Array of user IDs as strings
 */
async function getUsersByRole(
  orgId: string,
  role: Role,
  limit = 10
): Promise<string[]> {
  try {
    const { User } = await import('@/server/models/User');
    const { connectToDatabase } = await import('@/lib/mongodb-unified');
    await connectToDatabase();
    
    const users = await User.find({
      'professional.role': role,
      orgId: orgId,
      isActive: true,
    }).select('_id').limit(limit).lean();
    
    type UserDoc = { _id: { toString: () => string } };
    const userIds = users && users.length > 0 
      ? users.map((u: UserDoc) => u._id.toString())
      : [];
    
    logger.debug('[Approval] Found approvers by role:', { role, orgId, count: userIds.length });
    return userIds;
  } catch (error: unknown) {
    logger.error('[Approval] Failed to query users by role:', { error, role, orgId });
    return [];
  }
}

interface DbApprovalDoc {
  _id: string | { toString(): string };
  quotationId: string | { toString(): string };
  workOrderId: string | { toString(): string };
  orgId: string | { toString(): string };
  status: string;
  currentStage?: number;
  approverId?: { toString(): string } | string;
  approverRole?: Role;
  timeoutMinutes?: number;
  stages?: DbApprovalStage[];
  createdAt?: Date;
  updatedAt?: Date;
}
import { connectToDatabase } from '@/lib/mongodb-unified';
import { FMApproval, type FMApprovalDoc } from '@/server/models/FMApproval';
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

// ---- Helper mapping functions: FMApprovalDoc <-> ApprovalWorkflow ----

type DbStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'ESCALATED' | 'DELEGATED' | 'TIMEOUT';

function mapDbStatusToWorkflowStatus(status: DbStatus | string | undefined): ApprovalWorkflow['status'] {
  switch (status) {
    case 'APPROVED':
      return 'approved';
    case 'REJECTED':
      return 'rejected';
    case 'ESCALATED':
      return 'escalated';
    default:
      return 'pending';
  }
}

function mapWorkflowStatusToDbStatus(status: ApprovalWorkflow['status']): DbStatus {
  switch (status) {
    case 'approved':
      return 'APPROVED';
    case 'rejected':
      return 'REJECTED';
    case 'escalated':
      return 'ESCALATED';
    default:
      return 'PENDING';
  }
}

/**
 * Convert FMApprovalDoc from DB into ApprovalWorkflow used by the engine.
 * This supports both:
 * - New style: doc.stages[] with full data
 * - Legacy style: single approver/role at root level
 */
function docToWorkflow(doc: FMApprovalDoc): ApprovalWorkflow {
  const dbDoc = doc as unknown as DbApprovalDoc;

  const dbStages: DbApprovalStage[] = dbDoc.stages ?? [];

  const stagesFromDoc: ApprovalStage[] = dbStages.map((s, index: number) => {
    const decisions: ApprovalDecision[] = (s.decisions ?? []).map((d) => ({
      approverId: d.approverId?.toString() ?? '',
      decision: d.decision as ApprovalDecision['decision'],
      delegateTo: d.delegateTo ? d.delegateTo.toString() : undefined,
      note: d.note,
      timestamp: d.timestamp instanceof Date ? d.timestamp : new Date(d.timestamp ?? Date.now()),
    }));

    return {
      stage: typeof s.stage === 'number' ? s.stage : index + 1,
      approvers: (s.approvers ?? []).map((a) => typeof a === 'string' ? a : a.toString()),
      approverRoles: (s.approverRoles ?? []),
      type: (s.type as 'sequential' | 'parallel') ?? 'sequential',
      timeout:
        typeof s.timeout === 'number'
          ? s.timeout
          : (doc.timeoutMinutes ?? 24 * 60) * 60 * 1000,
      status: (s.status as ApprovalStage['status']) ?? 'pending',
      decisions,
    };
  });

  const stages: ApprovalStage[] =
    stagesFromDoc.length > 0
      ? stagesFromDoc
      : [
          {
            stage: doc.currentStage ?? 1,
            approvers: dbDoc.approverId ? [typeof dbDoc.approverId === 'string' ? dbDoc.approverId : dbDoc.approverId.toString()] : [],
            approverRoles: dbDoc.approverRole ? [dbDoc.approverRole] : [],
            type: 'sequential',
            timeout: (doc.timeoutMinutes ?? 24 * 60) * 60 * 1000,
            status: mapDbStatusToWorkflowStatus(doc.status),
            decisions: [],
          },
        ];

  return {
    requestId: doc.workflowId.toString(),
    quotationId: (dbDoc.quotationId ?? doc.entityId)?.toString() ?? '',
    workOrderId: (dbDoc.workOrderId ?? doc.entityId)?.toString() ?? '',
    stages,
    currentStage: doc.currentStage ?? 1,
    status: mapDbStatusToWorkflowStatus(doc.status),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

/**
 * Build a plain object (compatible with FMApproval schema) from an ApprovalWorkflow.
 * Used when creating a new approval document.
 */
function workflowToDocBase(
  workflow: ApprovalWorkflow,
  request: ApprovalRequest
): Record<string, unknown> {
  const firstStage = workflow.stages[0];

  const timeoutMs =
    firstStage?.timeout ?? 24 * 60 * 60 * 1000; // fallback 24h

  return {
    orgId: request.orgId,
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
    approverId: firstStage?.approvers?.[0],
    approverName: undefined,
    approverEmail: undefined,
    approverRole: firstStage?.approverRoles?.[0],
    status: mapWorkflowStatusToDbStatus(workflow.status),
    dueDate: new Date(Date.now() + timeoutMs),
    timeoutMinutes: timeoutMs / 60000,
    // FULL STAGES PERSISTENCE
    stages: workflow.stages.map(stage => ({
      stage: stage.stage,
      approvers: stage.approvers,
      approverRoles: stage.approverRoles,
      type: stage.type,
      timeout: stage.timeout,
      status: stage.status,
      decisions: stage.decisions.map(d => ({
        approverId: d.approverId,
        decision: d.decision,
        delegateTo: d.delegateTo,
        note: d.note,
        timestamp: d.timestamp,
      })),
    })),
  };
}

/**
 * Route a quotation to appropriate approvers based on amount and category
 */
export async function routeApproval(request: ApprovalRequest): Promise<ApprovalWorkflow> {
  // Validate required fields
  if (!request.orgId || !request.quotationId || !request.workOrderId) {
    throw new Error('Missing required fields: orgId, quotationId, or workOrderId');
  }
  
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
  
  for (const roleReq of policy.require) {
    const userIds = await getUsersByRole(request.orgId, roleReq.role);
    
    if (userIds.length > 0) {
      approverIds.push(...userIds);
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
    
    for (const roleReq of policy.parallelWith) {
      const userIds = await getUsersByRole(request.orgId, roleReq.role);
      if (userIds.length > 0) {
        parallelApproverIds.push(...userIds);
      }
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
    requestId: `APR-${Date.now()}-${crypto.randomUUID().substring(0, 8)}`,
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
  if (!approverId) {
    throw new Error('approverId is required for processing decisions');
  }
  
  const currentStage = workflow.stages[workflow.currentStage - 1];

  if (!currentStage) {
    throw new Error(`Invalid workflow stage: ${workflow.currentStage}. Workflow has ${workflow.stages.length} stages.`);
  }

  // Verify approver is authorized for this stage (unless delegating)
  if (decision !== 'delegate' && currentStage.approvers.length > 0 && !currentStage.approvers.includes(approverId)) {
    logger.warn('[Approval] Unauthorized approver attempted decision', {
      approverId,
      authorizedApprovers: currentStage.approvers,
      workflowId: workflow.requestId,
    });
    throw new Error('Approver not authorized for this workflow stage');
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
export async function checkTimeouts(workflow: ApprovalWorkflow, orgId: string): Promise<ApprovalWorkflow> {
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
            }).select('_id').limit(5).lean<LeanUserBasic[]>();
            
            if (escalationUsers && escalationUsers.length > 0) {
              const escalationIds = escalationUsers.map((u: LeanUserBasic) => u._id.toString());
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
 * FIXED: Now persists full stages[] array with decisions using workflowToDocBase mapper
 */
export async function saveApprovalWorkflow(
  workflow: ApprovalWorkflow,
  request: ApprovalRequest
): Promise<void> {
  try {
    const firstStage = workflow.stages[0];
    
    if (!firstStage) {
      throw new Error('Workflow must have at least one approval stage');
    }
    
    // ⚠️ Instead of throwing, log and allow manual assignment later
    if (!firstStage.approvers?.length || !firstStage.approverRoles?.length) {
      logger.warn(
        '[Approval] Saving workflow with unassigned first stage (no approvers / roles)',
        { workflowId: workflow.requestId, orgId: request.orgId }
      );
    }

    const baseDoc = workflowToDocBase(workflow, request);

    const savedApproval = await FMApproval.create({
      ...baseDoc,
      history: [
        {
          timestamp: new Date(),
          action: 'CREATED',
          actorId: request.requestedBy,
          actorName: 'System',
          previousStatus: 'NEW',
          newStatus: 'PENDING',
          notes: `Approval workflow created for ${request.category} worth ${request.amount}`,
        },
      ],
    });
    
    if (!savedApproval) {
      throw new Error('Failed to save approval workflow - no document returned');
    }
    
    logger.info('[Approval] Workflow saved to database', {
      requestId: workflow.requestId,
      dbId: String((savedApproval as { _id?: unknown })._id ?? 'unknown'),
    });
  } catch (error: unknown) {
    logger.error('[Approval] Failed to save workflow:', { error });
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to persist approval workflow ${workflow.requestId}: ${reason}`
    );
  }
}

/**
 * Get workflow by ID
 * FIXED: Now uses docToWorkflow mapper for full multi-stage support
 */
export async function getWorkflowById(workflowId: string, orgId: string): Promise<ApprovalWorkflow | null> {
  try {
    const approval = await FMApproval.findOne({
      workflowId,
      orgId: orgId
    }).lean<FMApprovalDoc>();

    if (!approval) return null;

    return docToWorkflow(approval);
  } catch (error: unknown) {
    logger.error('[Approval] Failed to fetch workflow:', { error, workflowId, orgId });
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
  delegateTo?: unknown
): Promise<void> {
  try {
    const approval = await FMApproval.findOne({ workflowId, orgId: orgId });
    if (!approval) throw new Error(`Approval workflow ${workflowId} not found`);

    // Update status
    approval.status = decision === 'APPROVE' ? 'APPROVED' : 
                      decision === 'REJECT' ? 'REJECTED' : 'DELEGATED';
    approval.decision = decision;
    approval.decisionDate = new Date();
    approval.notes = notes;

    if (decision === 'DELEGATE' && delegateTo) {
      // Assign directly using unknown intermediate
      (approval as { delegatedTo?: unknown }).delegatedTo = delegateTo;
      approval.delegationDate = new Date();
      approval.delegationReason = notes;
    }

    // Add to history
    const { Types } = await import('mongoose');
    approval.history.push({
      timestamp: new Date(),
      action: decision,
      actorId: new Types.ObjectId(approverId) as unknown as Schema.Types.ObjectId,
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
      orgId: orgId,
      status: 'PENDING',
      'stages.approvers': userId, // search across all stages
    }).lean<FMApprovalDoc>() as unknown as FMApprovalDoc[] || [];

    return approvals.map(docToWorkflow);
  } catch (error: unknown) {
    logger.error('[Approval] Failed to get pending approvals:', { error, userId, orgId });
    return [];
  }
}

/**
 * Check for approval timeouts and escalate
 * FIXED: Now uses docToWorkflow mapper and defensive stage checking
 */
export async function checkApprovalTimeouts(orgId: string): Promise<void> {
  try {
    const overdueApprovals = await FMApproval.find({
      orgId: orgId,
      status: 'PENDING',
      dueDate: { $lt: new Date() },
      escalationSentAt: null,
    });

    for (const approval of overdueApprovals) {
      approval.status = 'ESCALATED';
      approval.escalationDate = new Date();
      approval.escalationSentAt = new Date();
      approval.escalatedReason = 'Approval timeout exceeded';

      approval.history.push({
        timestamp: new Date(),
        action: 'ESCALATED',
        actorId: null, // system — better than fake ObjectId
        actorName: 'System',
        previousStatus: 'PENDING',
        newStatus: 'ESCALATED',
        notes: 'Automatically escalated due to timeout',
      });

      await approval.save();
      logger.info('[Approval] Escalated:', { approvalNumber: approval.approvalNumber });

      // ✅ Use policy for escalation (with defensive check)
      const approvalPolicy = APPROVAL_POLICIES && APPROVAL_POLICIES.length > 0 ? APPROVAL_POLICIES[0] : null;

      type ApprovalWithStages = { stages?: Array<{ approverRoles?: string[] }>; currentStage?: number };
      const approvalWithStages = approval as unknown as ApprovalWithStages;
      const stageDoc =
        (approvalWithStages.stages &&
          approvalWithStages.stages[approvalWithStages.currentStage ? approvalWithStages.currentStage - 1 : 0]) ||
        null;

      if (!approvalPolicy || !stageDoc) {
        logger.warn('[Approval] No policy or stage found for escalation notifications', {
          approvalId: approval._id.toString(),
          hasPolicy: !!approvalPolicy,
          hasStage: !!stageDoc,
        });
        continue;
      }

      if (!approvalPolicy.escalateTo || approvalPolicy.escalateTo.length === 0) {
        logger.warn('[Approval] Escalation policy has no escalateTo roles', {
          approvalId: approval._id.toString(),
        });
        continue;
      }

      try {
        const { User } = await import('@/server/models/User');
        const { buildNotification, sendNotification } = await import('./fm-notifications');

        const escalationRecipients: Array<{
          userId: string;
          name: string;
          email: string;
          preferredChannels: ('email' | 'push')[];
        }> = [];
        
        type ApprovalDoc = { orgId?: string; _id: unknown; entityId?: unknown; quotationId?: unknown; workOrderId?: unknown };
        const approvalDoc = approval as unknown as ApprovalDoc;
        
        for (const role of approvalPolicy.escalateTo) {
          const users = await User.find({
            'professional.role': role,
            orgId: approvalDoc.orgId,
            isActive: true,
          })
            .select(
              '_id email professional.role professional.firstName professional.lastName'
            )
            .limit(10)
            .lean<LeanUser[]>();

          if (users && users.length > 0) {
            escalationRecipients.push(
              ...users.map((u: LeanUser) => ({
                userId: u._id.toString(),
                name: `${u.professional?.firstName || ''} ${
                  u.professional?.lastName || ''
                }`.trim(),
                email: u.email,
                preferredChannels: ['email', 'push'] as ('email' | 'push')[],
              }))
            );
          }
        }

        if (escalationRecipients.length === 0) {
          logger.warn('[Approval] No escalation recipients found', {
            approvalId: approval._id.toString(),
            escalateToRoles: approvalPolicy.escalateTo,
          });
          continue;
        }

        const notification = buildNotification(
          'onApprovalRequested',
          {
            quotationId: String(approvalDoc.quotationId ?? approvalDoc.entityId ?? ''),
            workOrderId: String(approvalDoc.workOrderId ?? approvalDoc.entityId ?? ''),
            amount: approval.amount,
            priority: 'ESCALATED',
            description: `Approval escalated due to timeout. Original approvers: ${
              stageDoc.approverRoles?.join(', ') ?? 'N/A'
            }`,
          },
          escalationRecipients
        );

        await sendNotification(notification);

        logger.info('[Approval] Escalation notification sent', {
          approvalId: approval._id,
          recipientCount: escalationRecipients.length,
          escalateToRoles: approvalPolicy.escalateTo,
        });
      } catch (notifyError) {
        logger.error('[Approval] Failed to send escalation notification', {
          approvalId: approval._id,
          error: notifyError,
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
    }).select('_id email personal.firstName personal.lastName').lean<LeanUserDetailed[]>();
    
    if (!approvers || approvers.length === 0) {
      logger.warn('[Approval] Approver details not found', { 
        approverIds: stage.approvers,
        workflowId: workflow.requestId 
      });
      return;
    }
    
    // Build notification payload
    const recipients = approvers.map((approver: LeanUserDetailed) => ({
      userId: approver._id.toString(),
      name: `${approver.personal?.firstName || ''} ${approver.personal?.lastName || ''}`.trim() || approver.email || 'Approver',
      email: approver.email,
      preferredChannels: ['push', 'email'] as ('push' | 'email')[],
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
