/**
 * Tests for AppSwitcher component.
 *
 * Testing library/framework: Jest + React Testing Library (jsdom)
 * - Aligns with common Next.js testing setups using @testing-library/react.
 * - Mocks next/navigation.usePathname and next/link to isolate component behavior.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('next/navigation', () => {
  return {
    // usePathname returns string | null in Next.js 13+
    usePathname: jest.fn(),
  };
});

jest.mock('next/link', () => {
  // Simplify next/link to a basic anchor for testing
  return ({ href, className, children }: any) => (
    <a href={href} className={className} data-testid={`link-${href}`}>
      {children}
    </a>
  );
});

import { usePathname } from 'next/navigation';
import AppSwitcher from '../../src/components/AppSwitcher';

const mockedUsePathname = usePathname as jest.Mock;

describe('AppSwitcher', () => {
  const items = [
    { href: '/', label: 'Home' },
    { href: '/fm', label: 'Facility Management' },
    { href: '/aqar', label: 'Aqar Souq' },
    { href: '/souq', label: 'Fixzit Souq' },
    { href: '/marketplace', label: 'Marketplace' },
  ];

  const getClassMatcher = (isActive: boolean) => {
    // Component sets:
    // base: px-2 py-1 rounded-md text-xs sm:text-sm hover:bg-white/10
    // active: bg-white/15
    return isActive
      ? expect.stringContaining('bg-white/15')
      : expect.not.stringContaining('bg-white/15');
  };

  function renderWithPath(pathname: string | null | undefined) {
    mockedUsePathname.mockReturnValue(pathname as any);
    return render(<AppSwitcher />);
  }

  test('renders all navigation items with correct labels and hrefs', () => {
    renderWithPath('/');
    for (const item of items) {
      const link = screen.getByRole('link', { name: item.label });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', item.href);
      // ensure base classes present
      expect(link).toHaveClass('px-2', 'py-1', 'rounded-md');
    }
  });

  test('marks Home as active when pathname is exactly "/"', () => {
    renderWithPath('/');
    const home = screen.getByTestId('link-/');
    expect(home).toHaveClass('bg-white/15');

    // others should not be active
    for (const item of items) {
      if (item.href === '/') continue;
      const link = screen.getByTestId(`link-${item.href}`);
      expect(link).not.toHaveClass('bg-white/15');
    }
  });

  test('marks item as active when pathname exactly matches item href', () => {
    renderWithPath('/fm');
    expect(screen.getByTestId('link-/fm')).toHaveClass('bg-white/15');
    expect(screen.getByTestId('link-/')).not.toHaveClass('bg-white/15');
    expect(screen.getByTestId('link-/aqar')).not.toHaveClass('bg-white/15');
    expect(screen.getByTestId('link-/souq')).not.toHaveClass('bg-white/15');
    expect(screen.getByTestId('link-/marketplace')).not.toHaveClass('bg-white/15');
  });

  test('marks item as active when pathname starts with "href + /" (nested routes)', () => {
    renderWithPath('/marketplace/products/123?foo=bar');
    expect(screen.getByTestId('link-/marketplace')).toHaveClass('bg-white/15');

    // Ensure siblings are not active
    expect(screen.getByTestId('link-/')).not.toHaveClass('bg-white/15');
    expect(screen.getByTestId('link-/fm')).not.toHaveClass('bg-white/15');
    expect(screen.getByTestId('link-/aqar')).not.toHaveClass('bg-white/15');
    expect(screen.getByTestId('link-/souq')).not.toHaveClass('bg-white/15');
  });

  test('does not mark root as active for non-root paths', () => {
    renderWithPath('/souq/tools');
    expect(screen.getByTestId('link-/')).not.toHaveClass('bg-white/15');
    expect(screen.getByTestId('link-/souq')).toHaveClass('bg-white/15');
  });

  test('handles null/undefined pathname by defaulting to "/"', () => {
    // null
    renderWithPath(null as any);
    expect(screen.getByTestId('link-/')).toHaveClass('bg-white/15');

    // undefined
    renderWithPath(undefined as any);
    expect(screen.getByTestId('link-/')).toHaveClass('bg-white/15');
  });

  test('edge case: similar prefixes do not cause false positives', () => {
    // If there were an item "/a", visiting "/aqar" should not activate "/a"
    // Our items include "/aqar", ensure visiting "/aqarish" doesn't mark it active unless it starts with "/aqar/"
    renderWithPath('/aqarish'); // does not start with "/aqar/"
    expect(screen.getByTestId('link-/aqar')).not.toHaveClass('bg-white/15');

    renderWithPath('/aqar/section'); // starts with "/aqar/"
    expect(screen.getByTestId('link-/aqar')).toHaveClass('bg-white/15');
  });

  test('nav has expected layout classes and contains all links', () => {
    renderWithPath('/fm');
    const nav = screen.getByRole('navigation');
    expect(nav).toHaveClass('hidden', 'md:flex', 'items-center', 'gap-1');

    for (const item of items) {
      expect(screen.getByRole('link', { name: item.label })).toBeInTheDocument();
    }
  });

  test('class composition maintains hover style regardless of active state', () => {
    renderWithPath('/fm');
    for (const item of items) {
      const link = screen.getByTestId(`link-${item.href}`);
      expect(link.className).toEqual(getClassMatcher(item.href === '/fm'));
      // all links should include hover class
      expect(link).toHaveClass('hover:bg-white/10');
    }
  });
});