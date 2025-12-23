import { afterAll, describe, expect, test } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { ALLOWED_ROLES, HARD_CODED_ORG, findHardCodedOrg, findRoleDrift } from '../check-tenant-role-drift';

const tmpDir = mkdtempSync(path.join(os.tmpdir(), 'tenant-role-drift-'));

afterAll(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

describe('check-tenant-role-drift', () => {
  test('detects hard-coded org id', async () => {
    const file = path.join(tmpDir, 'org.ts');
    writeFileSync(file, `const orgId = "${HARD_CODED_ORG}";`);
    const findings = await findHardCodedOrg(file);
    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain('Hard-coded org id');
  });

  test('detects non-canonical roles', async () => {
    const file = path.join(tmpDir, 'roles.ts');
    writeFileSync(file, `const user = { role: "NOT_ALLOWED" };`);
    const findings = await findRoleDrift(file);
    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain('Non-canonical roles');
    // Ensure allowed set is referenced for context
    for (const _role of ALLOWED_ROLES) {
      expect(findings[0].message).toContain('Allowed');
      break;
    }
  });

  test('passes with canonical roles', async () => {
    const file = path.join(tmpDir, 'ok.ts');
    writeFileSync(file, `const user = { role: "SUPER_ADMIN" };`);
    const findings = await findRoleDrift(file);
    expect(findings).toHaveLength(0);
  });
});
