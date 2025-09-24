import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock next/link to render a simple anchor for test environment
jest.mock('next/link', () => {
  const React = require('react');
  return ({ href, className, onClick, children }: any) => (
    <a href={href} className={className} onClick={onClick} data-testid={`link-${href}`}>
      {children}
    </a>
  );
});

// Mock TopBarContext hook to control app state and spy on setApp
jest.mock('@/src/contexts/TopBarContext', () => {
  return {
    useTopBar: jest.fn(),
  };
});

// Mock APPS labels for stable assertions if needed.
// Prefer importing the real module; if unavailable, fall back to a mock.

let realAPPS: any;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  realAPPS = require('@/src/config/module-registry').APPS;
} catch {
  realAPPS = {
    fm: { label: 'FM' },
    souq: { label: 'Souq' },
    aqar: { label: 'Aqar' },
  };
}

import { AppSwitcher } from './AppSwitcher';
import { useTopBar } from '@/src/contexts/TopBarContext';

const asUseTopBar = useTopBar as jest.MockedFunction<typeof useTopBar>;

function setup(opts?: { app?: 'fm'|'souq'|'aqar', isRTL?: boolean, setAppSpy?: jest.Mock }) {
  const setApp = opts?.setAppSpy ?? jest.fn();
  asUseTopBar.mockReturnValue({
    app: opts?.app ?? 'fm',
    setApp,
    isRTL: opts?.isRTL ?? false,
  } as any);

  const ui = render(<AppSwitcher />);
  return { ui, setApp };
}

describe('AppSwitcher', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders three links with expected labels and hrefs', () => {
    setup();

    // Labels come from APPS; use fallbacks if needed
    const fmLabel = realAPPS.fm.label;
    const souqLabel = realAPPS.souq.label;
    const aqarLabel = realAPPS.aqar.label;

    // Find by text labels
    const fmLink = screen.getByRole('link', { name: fmLabel });
    const souqLink = screen.getByRole('link', { name: souqLabel });
    const aqarLink = screen.getByRole('link', { name: aqarLabel });

    expect(fmLink).toBeInTheDocument();
    expect(souqLink).toBeInTheDocument();
    expect(aqarLink).toBeInTheDocument();

    // Hrefs as defined in the component
    expect(fmLink).toHaveAttribute('href', '/dashboard');
    expect(souqLink).toHaveAttribute('href', '/marketplace');
    expect(aqarLink).toHaveAttribute('href', '/aqar');
  });

  it('highlights the active app (fm) with the selected styles', () => {
    setup({ app: 'fm' });
    const fmLabel = realAPPS.fm.label;
    const souqLabel = realAPPS.souq.label;
    const aqarLabel = realAPPS.aqar.label;

    const fmLink = screen.getByRole('link', { name: fmLabel });
    const souqLink = screen.getByRole('link', { name: souqLabel });
    const aqarLink = screen.getByRole('link', { name: aqarLabel });

    // Active styles
    expect(fmLink.className).toMatch(/bg-white\/20/);
    expect(fmLink.className).toMatch(/text-white/);

    // Inactive styles
    expect(souqLink.className).toMatch(/bg-white\/10/);
    expect(souqLink.className).toMatch(/text-white\/80/);
    expect(aqarLink.className).toMatch(/bg-white\/10/);
    expect(aqarLink.className).toMatch(/text-white\/80/);
  });

  it('highlights the active app (souq) with the selected styles', () => {
    setup({ app: 'souq' });
    const souqLabel = realAPPS.souq.label;

    const souqLink = screen.getByRole('link', { name: souqLabel });
    expect(souqLink.className).toMatch(/bg-white\/20/);
    expect(souqLink.className).toMatch(/text-white/);
  });

  it('highlights the active app (aqar) with the selected styles', () => {
    setup({ app: 'aqar' });
    const aqarLabel = realAPPS.aqar.label;

    const aqarLink = screen.getByRole('link', { name: aqarLabel });
    expect(aqarLink.className).toMatch(/bg-white\/20/);
    expect(aqarLink.className).toMatch(/text-white/);
  });

  it('invokes setApp with the correct key when a link is clicked', async () => {
    const user = userEvent.setup();
    const setAppSpy = jest.fn();
    setup({ app: 'fm', setAppSpy });

    const souqLabel = realAPPS.souq.label;
    const aqarLabel = realAPPS.aqar.label;

    await user.click(screen.getByRole('link', { name: souqLabel }));
    expect(setAppSpy).toHaveBeenCalledWith('souq');

    await user.click(screen.getByRole('link', { name: aqarLabel }));
    expect(setAppSpy).toHaveBeenCalledWith('aqar');
  });

  it('does not throw when isRTL is true (unused but should be harmless)', () => {
    expect(() => setup({ isRTL: true })).not.toThrow();
  });

  it('renders deterministic order: fm, souq, aqar', () => {
    setup();
    // Query all links and assert order by their hrefs
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(3);
    expect(links[0]).toHaveAttribute('href', '/dashboard');
    expect(links[1]).toHaveAttribute('href', '/marketplace');
    expect(links[2]).toHaveAttribute('href', '/aqar');
  });

  it('applies common base classes to each link', () => {
    setup();
    const fmLabel = realAPPS.fm.label;
    const souqLabel = realAPPS.souq.label;
    const aqarLabel = realAPPS.aqar.label;

    [fmLabel, souqLabel, aqarLabel].forEach(label => {
      const link = screen.getByRole('link', { name: label });
      expect(link.className).toMatch(/px-3/);
      expect(link.className).toMatch(/py-1/);
      expect(link.className).toMatch(/rounded/);
      expect(link.className).toMatch(/text-sm/);
      expect(link.className).toMatch(/font-medium/);
      expect(link.className).toMatch(/transition-colors/);
    });
  });

  it('handles unexpected app key gracefully (no link active)', () => {
    // @ts-expect-error Testing unexpected value
    setup({ app: 'unknown' });
    const fmLabel = realAPPS.fm.label;
    const souqLabel = realAPPS.souq.label;
    const aqarLabel = realAPPS.aqar.label;

    const fmLink = screen.getByRole('link', { name: fmLabel });
    const souqLink = screen.getByRole('link', { name: souqLabel });
    const aqarLink = screen.getByRole('link', { name: aqarLabel });

    // None should have the "active" bg-white/20 class
    expect(fmLink.className).not.toMatch(/bg-white\/20/);
    expect(souqLink.className).not.toMatch(/bg-white\/20/);
    expect(aqarLink.className).not.toMatch(/bg-white\/20/);
  });
});