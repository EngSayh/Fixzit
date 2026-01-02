/**
 * Tests for SupportTicketPage
 *
 * Test framework: Vitest + React Testing Library + user-event + jest-dom (jsdom environment)
 */

import { vi, describe, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { mockFetch, restoreFetch } from '@/tests/helpers/domMocks';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
// Increase timeout for this suite due to heavier user interactions
vi.setConfig({ testTimeout: 30000 });

vi.mock('next-auth/react', () => ({
  useSession: () => ({ data: null, status: 'unauthenticated' }),
}));

// Simplify navigation wrapper to avoid router side‑effects in tests
vi.mock('@/components/ui/navigation-buttons', () => ({
  FormWithNavigation: ({ children, onSubmit }: { children: React.ReactNode; onSubmit: React.FormEventHandler<HTMLFormElement> }) => (
    <form onSubmit={onSubmit}>{children}</form>
  ),
}));

// IMPORTANT: Adjust this import path to the actual component path in your repo.
// The snippet shows the component definition only; if it's under `app/help/support/page.tsx`,
// or similar, change accordingly. For now, we import from a relative inline path assumption.
import SupportTicketPage from '@/app/(app)/help/support-ticket/page';

// Helpers to mock global APIs
const originalAlert = global.alert as unknown as ReturnType<typeof vi.fn> | undefined;
const originalConsoleError = console.error;
let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
let fetchMock: ReturnType<typeof mockFetch>;

beforeAll(() => {
  // Silence noisy act() warnings while still surfacing real errors
  consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation((...args: Parameters<typeof console.error>) => {
    const [first] = args;
    if (typeof first === 'string' && first.includes('act(...')) return;
    originalConsoleError(...args);
  });
});

afterAll(() => {
  consoleErrorSpy.mockRestore();
});

beforeEach(() => {
  // jsdom doesn't implement alert; we mock it
  // @ts-ignore
  global.alert = vi.fn();
  // Default fetch mock resolves with ok=true
  fetchMock = mockFetch();
  fetchMock.mockResolvedValue({ ok: true, json: async () => ({ id: 't_123' }) } as Response);
});

afterEach(() => {
  restoreFetch();
  if (originalAlert) {
    // @ts-ignore
    global.alert = originalAlert;
  } else {
    // @ts-ignore
    delete global.alert;
  }
  vi.clearAllMocks();
});

async function fillRequiredFields(user = userEvent.setup()) {
  const subject = screen.getByLabelText(/subject \*/i);
  const description = screen.getByLabelText(/description \*/i);
  const name = screen.getByLabelText(/your name \*/i);
  const email = screen.getByLabelText(/email \*/i);

  await user.clear(subject);
  await user.type(subject, 'App crashes on login');

  await user.clear(description);
  await user.type(description, 'Steps to reproduce: 1) Open app 2) Click login 3) Crash');

  await user.clear(name);
  await user.type(name, 'Jane Tester');

  await user.clear(email);
  await user.type(email, 'jane@example.com');

  return user;
}

const renderPage = async () => {
  await act(async () => {
    render(<SupportTicketPage />);
  });
};

describe('SupportTicketPage', () => {
  test('renders all core fields and default selects', async () => {
    await renderPage();

    // Headings and description
    expect(screen.getByRole('heading', { name: /create support ticket/i })).toBeInTheDocument();
    expect(screen.getByText(/our support team will get back to you within 24 hours/i)).toBeInTheDocument();

    // Required inputs
    expect(screen.getByLabelText(/subject \*/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description \*/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/your name \*/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email \*/i)).toBeInTheDocument();

    // Optional phone
    expect(screen.getByLabelText(/phone \(optional\)/i)).toBeInTheDocument();

    // Module default FM
    const moduleSelect = screen.getByLabelText(/module/i) as HTMLSelectElement;
    expect(moduleSelect).toBeInTheDocument();
    expect(moduleSelect.value).toBe('FM');

    // Type default Bug
    const typeSelect = screen.getByLabelText(/^type$/i) as HTMLSelectElement;
    expect(typeSelect.value).toBe('Bug');

    // Priority default Medium
    const prioritySelect = screen.getByLabelText(/priority/i) as HTMLSelectElement;
    expect(prioritySelect.value).toBe('Medium');

    // Submit button
    expect(screen.getByRole('button', { name: /Submit Ticket/i })).toBeInTheDocument();
  });

  test('allows selecting different module, type, and priority values', async () => {
    await renderPage();
    const user = userEvent.setup();

    const moduleSelect = screen.getByLabelText(/module/i);
    await user.selectOptions(moduleSelect, 'Billing');
    expect((moduleSelect as HTMLSelectElement).value).toBe('Billing');

    const typeSelect = screen.getByLabelText(/^type$/i);
    await user.selectOptions(typeSelect, 'Feature');
    expect((typeSelect as HTMLSelectElement).value).toBe('Feature');

    const prioritySelect = screen.getByLabelText(/priority/i);
    await user.selectOptions(prioritySelect, 'High');
    expect((prioritySelect as HTMLSelectElement).value).toBe('High');
  });

  test('submits successfully with required fields and resets form, shows success alert', async () => {
    await renderPage();

    const user = userEvent.setup();
    await fillRequiredFields(user);

    // Optional phone provided
    const phone = screen.getByLabelText(/phone \(optional\)/i);
    await user.type(phone, '+966 55 555 5555');

    // Change some selects to non-defaults to assert payload mapping
    await user.selectOptions(screen.getByLabelText(/module/i), 'Souq');
    await user.selectOptions(screen.getByLabelText(/^type$/i), 'Complaint');
    await user.selectOptions(screen.getByLabelText(/priority/i), 'Urgent');

    const submit = screen.getByRole('button', { name: /Submit Ticket/i });
    await user.click(submit);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    // Verify request details
    const lastCall = fetchMock.mock.calls[0];
    expect(lastCall[0]).toBe('/api/support/tickets');
    const options = lastCall[1];
    expect(options.method).toBe('POST');
    expect(options.headers['Content-Type']).toBe('application/json');

    const body = JSON.parse(options.body);
    expect(body).toMatchObject({
      subject: 'App crashes on login',
      module: 'Souq',
      type: 'Complaint',
      priority: 'Urgent',
      category: 'General',
      subCategory: 'Other',
      text: expect.stringContaining('Steps to reproduce'),
      requester: {
        name: 'Jane Tester',
        email: 'jane@example.com',
        phone: '+966 55 555 5555',
      },
    });

    // Success alert
    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith(
        expect.stringMatching(/support ticket created successfully/i)
      );
    });

    // Form should reset to defaults
    expect((screen.getByLabelText(/subject \*/i) as HTMLInputElement).value).toBe('');
    expect((screen.getByLabelText(/description \*/i) as HTMLTextAreaElement).value).toBe('');
    expect((screen.getByLabelText(/your name \*/i) as HTMLInputElement).value).toBe('');
    expect((screen.getByLabelText(/email \*/i) as HTMLInputElement).value).toBe('');
    expect((screen.getByLabelText(/phone \(optional\)/i) as HTMLInputElement).value).toBe('');

    expect((screen.getByLabelText(/module/i) as HTMLSelectElement).value).toBe('FM');
    expect((screen.getByLabelText(/^type$/i) as HTMLSelectElement).value).toBe('Bug');
    expect((screen.getByLabelText(/priority/i) as HTMLSelectElement).value).toBe('Medium');

    // Button returns to normal state
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Submit Ticket/i })).toBeEnabled();
    });
  });

  test('omits phone from payload when left empty (sends undefined)', async () => {
    await renderPage();
    const user = userEvent.setup();
    await fillRequiredFields(user);

    const submit = screen.getByRole('button', { name: /Submit Ticket/i });
    await user.click(submit);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    const [, options] = fetchMock.mock.calls[0];
    const body = JSON.parse(options.body);
    expect(body.requester).toBeDefined();
    expect(body.requester.phone).toBeUndefined();
  });

  test('shows error alert and re-enables button when fetch fails (non-2xx)', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, json: async () => ({}) } as Response);

    await renderPage();
    const user = userEvent.setup();
    await fillRequiredFields(user);

    const submit = screen.getByRole('button', { name: /Submit Ticket/i });
    await user.click(submit);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith(
        'There was an error submitting your ticket. Please try again.'
      );
    });

    // Button should be re-enabled and label restored
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Submit Ticket/i })).toBeEnabled()
    );
  });

  test('shows error alert if fetch throws', async () => {
    fetchMock.mockRejectedValueOnce(new Error('network down'));

    await renderPage();
    const user = await fillRequiredFields();

    await user.click(screen.getByRole('button', { name: /Submit Ticket/i }));

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith(
        'There was an error submitting your ticket. Please try again.'
      );
    });
  });

  test('does not submit when required fields are missing (native required validation)', async () => {
    await renderPage();
    const user = userEvent.setup();

    // Only fill subject to simulate missing others
    await user.type(screen.getByLabelText(/subject \*/i), 'Partial input');
    const submit = screen.getByRole('button', { name: /Submit Ticket/i });
    await user.click(submit);

    // Native form required should prevent submission; fetch should not be called
    await waitFor(() => {
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  test('button shows "Submitting..." while request is in-flight', async () => {
    // Create a deferred promise to control resolution timing
    let resolveFn: (v?: unknown) => void;
    const pending = new Promise(res => { resolveFn = res; });
    fetchMock.mockImplementationOnce(() => pending as unknown as Response);

    await renderPage();
    const user = await fillRequiredFields();

    const button = screen.getByRole('button', { name: /Submit Ticket/i });
    await user.click(button);

    // While pending, button should reflect submitting state and be disabled
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent(/submitting/i);

    // Resolve the promise to complete request
    // @ts-ignore
    resolveFn({ ok: true, json: async () => ({ id: 't_456' }) });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Submit Ticket/i })).toBeEnabled();
    });
  });
});
