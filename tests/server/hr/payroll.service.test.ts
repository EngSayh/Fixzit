import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PayrollService } from '@/server/services/hr/payroll.service';
import { PayrollRun } from '@/server/models/hr.models';
import { PayrollFinanceIntegration } from '@/server/services/hr/payroll-finance.integration';

describe('PayrollService.updateStatus', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('calls finance integration when run is locked and not yet posted', async () => {
    const run = {
      _id: 'run-1',
      orgId: 'org-1',
      financePosted: false,
      lines: [],
    } as any;
    const execMock = vi.fn().mockResolvedValue(run);
    vi.spyOn(PayrollRun, 'findOneAndUpdate').mockReturnValue({ exec: execMock } as any);
    const postRunMock = vi.spyOn(PayrollFinanceIntegration, 'postRun').mockResolvedValue(undefined);

    await PayrollService.updateStatus('org-1', 'run-1', 'LOCKED');

    expect(postRunMock).toHaveBeenCalledWith(run);
  });

  it('does not call finance integration when already posted', async () => {
    const run = { financePosted: true } as any;
    const execMock = vi.fn().mockResolvedValue(run);
    vi.spyOn(PayrollRun, 'findOneAndUpdate').mockReturnValue({ exec: execMock } as any);
    const postRunMock = vi.spyOn(PayrollFinanceIntegration, 'postRun').mockResolvedValue(undefined);

    await PayrollService.updateStatus('org-1', 'run-1', 'LOCKED');

    expect(postRunMock).not.toHaveBeenCalled();
  });

  it('skips finance integration for non-locked statuses', async () => {
    const run = { financePosted: false } as any;
    const execMock = vi.fn().mockResolvedValue(run);
    vi.spyOn(PayrollRun, 'findOneAndUpdate').mockReturnValue({ exec: execMock } as any);
    const postRunMock = vi.spyOn(PayrollFinanceIntegration, 'postRun').mockResolvedValue(undefined);

    await PayrollService.updateStatus('org-1', 'run-1', 'IN_REVIEW');

    expect(postRunMock).not.toHaveBeenCalled();
  });
});
