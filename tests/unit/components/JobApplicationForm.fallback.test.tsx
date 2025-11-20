import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { JobApplicationForm } from '@/components/careers/JobApplicationForm';

vi.mock('@/contexts/TranslationContext', () => ({
  useTranslation: () => ({ t: (_key: string, fallback?: string) => fallback || _key }),
}));

const pushMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

const toast = { success: vi.fn(), error: vi.fn() };
vi.mock('react-hot-toast', () => ({
  default: toast,
}));

describe('JobApplicationForm presign fallback', () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('submits using direct form payload when presign returns 403', async () => {
    const fetchMock = global.fetch as unknown as vi.Mock;
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: vi.fn().mockResolvedValue({}),
      text: vi.fn().mockResolvedValue('forbidden'),
    });
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: vi.fn().mockResolvedValue({ success: true }),
    });

    render(<JobApplicationForm jobId="job-1" />);

    fireEvent.change(screen.getByTestId('fullName'), { target: { value: 'Jane Doe' } });
    fireEvent.change(screen.getByTestId('email'), { target: { value: 'jane@example.com' } });
    const file = new File(['resume'], 'resume.pdf', { type: 'application/pdf' });
    fireEvent.change(screen.getByTestId('resume'), { target: { files: [file] } });

    fireEvent.submit(screen.getByTestId('job-apply-form'));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/files/resumes/presign', expect.any(Object));
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/careers/apply', expect.objectContaining({
      method: 'POST',
    }));
    const secondCallBody = (fetchMock.mock.calls[1][1] as RequestInit)?.body;
    expect(secondCallBody).toBeInstanceOf(FormData);
    expect(screen.queryByTestId('general-error')).toBeNull();
    expect(toast.error).not.toHaveBeenCalled();
  });
});
