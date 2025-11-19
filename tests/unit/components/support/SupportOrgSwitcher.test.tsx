import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import SupportOrgSwitcher from '@/components/support/SupportOrgSwitcher';

const mockUseSupportOrg = vi.fn();
const toastSuccess = vi.fn();
const toastError = vi.fn();

vi.mock('@/contexts/SupportOrgContext', () => ({
  useSupportOrg: () => mockUseSupportOrg(),
}));

vi.mock('@/contexts/TranslationContext', () => ({
  useTranslation: () => ({
    t: (_key: string, fallback?: string) => fallback ?? _key,
  }),
}));

vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccess(...args),
    error: (...args: unknown[]) => toastError(...args),
  },
}));

describe('SupportOrgSwitcher', () => {
  beforeEach(() => {
    mockUseSupportOrg.mockReturnValue({
      canImpersonate: true,
      loading: false,
      supportOrg: null,
      selectOrgById: vi.fn().mockResolvedValue(true),
      clearSupportOrg: vi.fn().mockResolvedValue(undefined),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    toastSuccess.mockReset();
    toastError.mockReset();
  });

  it('returns null when the user cannot impersonate', () => {
    mockUseSupportOrg.mockReturnValue({
      canImpersonate: false,
      loading: false,
      supportOrg: null,
      selectOrgById: vi.fn(),
      clearSupportOrg: vi.fn(),
    });

    const { container } = render(<SupportOrgSwitcher />);
    expect(container).toBeEmptyDOMElement();
  });

  it('searches organizations and selects one', async () => {
    const selectOrgById = vi.fn().mockResolvedValue(true);
    mockUseSupportOrg.mockReturnValue({
      canImpersonate: true,
      loading: false,
      supportOrg: null,
      selectOrgById,
      clearSupportOrg: vi.fn().mockResolvedValue(undefined),
    });

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          {
            orgId: 'org_123',
            name: 'Test Org',
            registrationNumber: 'REG123',
          },
        ],
      }),
    } as Response);
    vi.stubGlobal('fetch', fetchMock);

    render(<SupportOrgSwitcher />);

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /Select customer/i }));
    const input = await screen.findByLabelText(/corporate id or code/i);
    await user.type(input, '7001234567');
    await user.click(screen.getByRole('button', { name: /Search/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/support/organizations/search?identifier=7001234567',
      expect.objectContaining({ credentials: 'include' })
    );

    const useOrgButton = await screen.findByRole('button', { name: /Use org/i });
    await user.click(useOrgButton);

    await waitFor(() => expect(selectOrgById).toHaveBeenCalledWith('org_123'));
    expect(toastSuccess).toHaveBeenCalled();
  });

  it('clears the current support organization', async () => {
    const clearSupportOrg = vi.fn().mockResolvedValue(undefined);
    mockUseSupportOrg.mockReturnValue({
      canImpersonate: true,
      loading: false,
      supportOrg: { orgId: 'org_abc', name: 'Acme Org' },
      selectOrgById: vi.fn(),
      clearSupportOrg,
    });

    render(<SupportOrgSwitcher />);

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /Org: Acme Org/i }));
    const clearButton = await screen.findByRole('button', { name: /Clear selection/i });
    await user.click(clearButton);

    expect(clearSupportOrg).toHaveBeenCalledTimes(1);
    expect(toastSuccess).toHaveBeenCalled();
  });
});
