/**
 * Tests for SupportTicketPage
 *
 * Test framework: Vitest + React Testing Library + user-event + jest-dom (jsdom environment)
 */

import { vi, describe, expect, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
// Increase timeout for this suite due to heavier user interactions
vi.setConfig({ testTimeout: 30000 });

// Simplify navigation wrapper to avoid router side‑effects in tests
vi.mock('@/components/ui/navigation-buttons', () => ({
  FormWithNavigation: ({ children, onSubmit, saving }: any) => (
    <form onSubmit={onSubmit}>
      {children}
      <button type="submit" disabled={saving}>
        {saving ? 'Submitting…' : 'Submit Ticket'}
      </button>
    </form>
  ),
}));

// IMPORTANT: Adjust this import path to the actual component path in your repo.
// The snippet shows the component definition only; if it's under `app/help/support/page.tsx`,
// or similar, change accordingly. For now, we import from a relative inline path assumption.
import SupportTicketPage from '@/app/help/support-ticket/page';

// Helpers to mock global APIs
const originalFetch = global.fetch;
const originalAlert = global.alert as unknown as ReturnType<typeof vi.fn> | undefined;

beforeEach(() => {
  // jsdom doesn't implement alert; we mock it
  // @ts-ignore
  global.alert = vi.fn();
  // Default fetch mock resolves with ok=true
  // @ts-ignore
  global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: 't_123' }) });
});

afterEach(() => {
  // @ts-ignore
  global.fetch = originalFetch;
  if (originalAlert) {
    // @ts-ignore
    global.alert = originalAlert;
  } else {
    // @ts-ignore
    delete global.alert;
  }
  vi.clearAllMocks();
});

function fillRequiredFields() {
  const subject = screen.getByLabelText(/subject \*/i);
  const description = screen.getByLabelText(/description \*/i);
  const name = screen.getByLabelText(/your name \*/i);
  const email = screen.getByLabelText(/email \*/i);

  userEvent.clear(subject);
  userEvent.type(subject, 'App crashes on login');

  userEvent.clear(description);
  userEvent.type(description, 'Steps to reproduce: 1) Open app 2) Click login 3) Crash');

  userEvent.clear(name);
  userEvent.type(name, 'Jane Tester');

  userEvent.clear(email);
  userEvent.type(email, 'jane@example.com');
}

describe('SupportTicketPage', () => {
  test('renders all core fields and default selects', () => {
    render(<SupportTicketPage />);

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
    expect(screen.getByRole('button', { name: /submit ticket/i })).toBeInTheDocument();
  });

  test('allows selecting different module, type, and priority values', async () => {
    render(<SupportTicketPage />);

    const moduleSelect = screen.getByLabelText(/module/i);
    await userEvent.selectOptions(moduleSelect, 'Billing');
    expect((moduleSelect as HTMLSelectElement).value).toBe('Billing');

    const typeSelect = screen.getByLabelText(/^type$/i);
    await userEvent.selectOptions(typeSelect, 'Feature');
    expect((typeSelect as HTMLSelectElement).value).toBe('Feature');

    const prioritySelect = screen.getByLabelText(/priority/i);
    await userEvent.selectOptions(prioritySelect, 'High');
    expect((prioritySelect as HTMLSelectElement).value).toBe('High');
  });

  test('submits successfully with required fields and resets form, shows success alert', async () => {
    render(<SupportTicketPage />);

    fillRequiredFields();

    // Optional phone provided
    const phone = screen.getByLabelText(/phone \(optional\)/i);
    await userEvent.type(phone, '+966 55 555 5555');

    // Change some selects to non-defaults to assert payload mapping
    await userEvent.selectOptions(screen.getByLabelText(/module/i), 'Souq');
    await userEvent.selectOptions(screen.getByLabelText(/^type$/i), 'Complaint');
    await userEvent.selectOptions(screen.getByLabelText(/priority/i), 'Urgent');

    const submit = screen.getByRole('button', { name: /submit ticket/i });
    await userEvent.click(submit);

    // Button should go into submitting state
    expect(submit).toBeDisabled();
    expect(submit).toHaveTextContent(/submitting/i);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    // Verify request details
    const lastCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
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
      expect(screen.getByRole('button', { name: /submit ticket/i })).toBeEnabled();
    });
  });

  test('omits phone from payload when left empty (sends undefined)', async () => {
    render(<SupportTicketPage />);
    fillRequiredFields();

    const submit = screen.getByRole('button', { name: /submit ticket/i });
    await userEvent.click(submit);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    const [, options] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(options.body);
    expect(body.requester).toBeDefined();
    expect(body.requester.phone).toBeUndefined();
  });

  test('shows error alert and re-enables button when fetch fails (non-2xx)', async () => {
    // @ts-ignore
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: false, json: async () => ({}) });

    render(<SupportTicketPage />);
    fillRequiredFields();

    const submit = screen.getByRole('button', { name: /submit ticket/i });
    await userEvent.click(submit);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith(
        'There was an error submitting your ticket. Please try again.'
      );
    });

    // Button should be re-enabled and label restored
    expect(screen.getByRole('button', { name: /submit ticket/i })).toBeEnabled();
  });

  test('shows error alert if fetch throws', async () => {
    // @ts-ignore
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('network down'));

    render(<SupportTicketPage />);
    fillRequiredFields();

    await userEvent.click(screen.getByRole('button', { name: /submit ticket/i }));

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith(
        'There was an error submitting your ticket. Please try again.'
      );
    });
  });

  test('does not submit when required fields are missing (native required validation)', async () => {
    render(<SupportTicketPage />);

    // Only fill subject to simulate missing others
    await userEvent.type(screen.getByLabelText(/subject \*/i), 'Partial input');
    const submit = screen.getByRole('button', { name: /submit ticket/i });
    await userEvent.click(submit);

    // Native form required should prevent submission; fetch should not be called
    await waitFor(() => {
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  test('button shows "Submitting..." while request is in-flight', async () => {
    // Create a deferred promise to control resolution timing
    let resolveFn: (v?: unknown) => void;
    const pending = new Promise(res => { resolveFn = res; });
    // @ts-ignore
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementationOnce(() => pending);

    render(<SupportTicketPage />);
    fillRequiredFields();

    const button = screen.getByRole('button', { name: /submit ticket/i });
    await userEvent.click(button);

    // While pending, button should reflect submitting state and be disabled
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent(/submitting/i);

    // Resolve the promise to complete request
    // @ts-ignore
    resolveFn({ ok: true, json: async () => ({ id: 't_456' }) });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /submit ticket/i })).toBeEnabled();
    });
  });
});
