import crypto from 'node:crypto';

type BuildSessionClaimsInput = {
  role: string;
  email?: string;
  orgId?: string;
  userId?: string;
  status?: string;
  unitId?: string;
  assignedToUserId?: string;
  permissions?: string[];
  isSuperAdmin?: boolean;
};

const defaultOrgId =
  process.env.TEST_ORG_ID ||
  process.env.DEFAULT_ORG_ID ||
  process.env.PUBLIC_ORG_ID ||
  'ffffffffffffffffffffffff';

export function buildSessionClaims({
  role,
  email,
  orgId = defaultOrgId,
  userId = crypto.randomUUID(),
  status = 'ACTIVE',
  unitId,
  assignedToUserId,
  permissions = [],
  isSuperAdmin,
}: BuildSessionClaimsInput) {
  const normalizedRole = role;
  const id = userId;
  const finalEmail = email || `${normalizedRole.toLowerCase()}@test.local`;
  const assigned = assignedToUserId || id;

  return {
    id,
    sub: id,
    email: finalEmail,
    role: normalizedRole,
    roles: [normalizedRole],
    orgId,
    org_id: orgId,
    tenantId: orgId,
    tenant_id: orgId,
    status,
    unit_id: unitId,
    assigned_to_user_id: assigned,
    isSuperAdmin: isSuperAdmin ?? normalizedRole === 'SUPER_ADMIN',
    permissions,
  };
}

export function resolveOrgId() {
  return defaultOrgId;
}
