import { connectToDatabase } from "@/lib/mongodb-unified";
import { RequestContext } from "@/server/lib/authContext";
import { log } from "@/server/lib/logger";
import { UserRole } from "@/config/rbac.config";
import { FMApproval } from "@/server/models/FMApproval";
import { User } from "@/server/models/User";

interface BudgetApprovalPayload {
  budgetId: string;
  propertyId: string;
  period: string;
  amount: number;
  currency?: string;
}

interface StageConfig {
  threshold: number;
  roles: string[];
  timeoutHours: number;
}

const BUDGET_APPROVAL_MATRIX: StageConfig[] = [
  { threshold: 0, roles: [UserRole.FINANCE_OFFICER], timeoutHours: 24 },
  { threshold: 100_000, roles: [UserRole.MANAGER], timeoutHours: 24 },
  { threshold: 250_000, roles: [UserRole.ADMIN], timeoutHours: 24 },
];

async function findApprovers(orgId: string, roles: string[]) {
  const approvers: Array<{
    id: string;
    name: string;
    email?: string;
    role: string;
  }> = [];
  for (const role of roles) {
    const user = await User.findOne({
      orgId,
      "professional.role": role,
    })
      .select(
        "_id email personal.firstName personal.lastName professional.role",
      )
      .lean();

    if (user) {
      const fullName =
        `${user.personal?.firstName ?? ""} ${user.personal?.lastName ?? ""}`.trim() ||
        "Approver";
      approvers.push({
        id: user._id.toString(),
        name: fullName,
        email: user.email,
        role,
      });
    }
  }
  return approvers;
}

function buildStages(_: string, amount: number) {
  const stages: Array<{
    stage: number;
    roles: string[];
    timeoutHours: number;
  }> = [];
  BUDGET_APPROVAL_MATRIX.forEach((config) => {
    if (amount >= config.threshold) {
      stages.push({
        stage: stages.length + 1,
        roles: config.roles,
        timeoutHours: config.timeoutHours,
      });
    }
  });

  if (stages.length === 0) {
    stages.push({
      stage: 1,
      roles: [UserRole.FINANCE_OFFICER],
      timeoutHours: 24,
    });
  }

  return stages;
}

export async function submitBudgetForApproval(
  ctx: RequestContext,
  payload: BudgetApprovalPayload,
): Promise<void> {
  await connectToDatabase();

  const stagesConfig = buildStages(ctx.orgId, payload.amount);
  const stages: Array<{
    stage: number;
    approvers: string[];
    approverRoles: string[];
    type: "sequential";
    timeout: number;
    status: "pending";
    decisions: never[];
  }> = [];

  const approverDetails: Array<{
    id: string;
    name: string;
    email?: string;
    role: string;
  }> = [];

  for (const config of stagesConfig) {
    const approvers = await findApprovers(ctx.orgId, config.roles);
    if (approvers.length === 0) {
      log("[BudgetDoA] No approvers found for stage", "warn", {
        orgId: ctx.orgId,
        roles: config.roles,
      });
      continue;
    }
    approverDetails.push(...approvers);
    stages.push({
      stage: config.stage,
      approvers: approvers.map((approver) => approver.id),
      approverRoles: approvers.map((approver) => approver.role),
      type: "sequential",
      timeout: config.timeoutHours * 60 * 60 * 1000,
      status: "pending",
      decisions: [] as never[],
    });
  }

  if (stages.length === 0) {
    throw new Error("No approvers available for budget approval workflow");
  }

  const firstApprover = approverDetails[0];
  const now = new Date();
  const dueDate = new Date(
    now.getTime() + stagesConfig[0].timeoutHours * 60 * 60 * 1000,
  );
  const workflowId = `BUD-${payload.budgetId}`;

  await FMApproval.create({
    orgId: ctx.orgId,
    type: "BUDGET",
    entityType: "Budget",
    entityId: payload.budgetId,
    entityNumber: `BUD-${payload.period}`,
    amount: payload.amount,
    currency: payload.currency || "SAR",
    thresholdLevel: `SAR_${payload.amount}`,
    workflowId,
    currentStage: 1,
    totalStages: stages.length,
    approverId: firstApprover.id,
    approverName: firstApprover.name,
    approverEmail: firstApprover.email,
    approverRole: firstApprover.role,
    status: "PENDING",
    dueDate,
    stages,
    history: [
      {
        timestamp: now,
        action: "CREATED",
        actorId: ctx.userId,
        actorName: "Finance Budget Service",
        previousStatus: "NEW",
        newStatus: "PENDING",
        notes: `Budget ${payload.period} submitted for approval`,
      },
    ],
  });
}
