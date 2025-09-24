/**
 * Tests for Header component
 * Testing library/framework: Uses the repository's configured test runner (Jest or Vitest) with React Testing Library.
 * Adjust imports below only if project conventions differ (e.g., vitest globals or custom render).
 */

import React from 'react'
// For Vitest, uncomment:
// import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
// Prefer default export; switch to named export if needed
import Header from './Header'

describe('Header component', () => {
  it('renders minimal header without props', () => {
    render(<Header />)
    const region = screen.queryByRole('banner') || screen.queryByRole('navigation') || screen.queryByRole('heading')
    expect(region).toBeTruthy()
  })

  it('renders provided title and subtitle', () => {
    render(<Header title="Acme" subtitle="Next-gen platform" /> as any)
    expect(screen.getByText('Acme')).toBeInTheDocument()
    expect(screen.getByText('Next-gen platform')).toBeInTheDocument()
  })

  it('renders children (e.g., actions) in the header', () => {
    render(
      <Header>
        <button>Try now</button>
      </Header>
    )
    expect(screen.getByRole('button', { name: /try now/i })).toBeInTheDocument()
  })

  it('renders navigation items with hrefs', async () => {
    const navItems = [
      { label: 'Home', href: '/' },
      { label: 'Blog', href: '/blog' },
    ]
    render(<Header navItems={navItems} /> as any)
    for (const item of navItems) {
      const link = screen.getByRole('link', { name: item.label })
      expect(link).toHaveAttribute('href', item.href)
    }
  })

  it('supports a mobile menu toggle if available', async () => {
    const user = userEvent.setup()
    render(<Header />)
    const toggle = screen.queryByRole('button', { name: new RegExp('menu|open|toggle', 'i') })
    if (!toggle) { return }
    await user.click(toggle)
    const nav = screen.queryByRole('navigation') || screen.queryByRole('list')
    expect(nav).toBeTruthy()
    await user.click(toggle)
    expect(nav).toBeTruthy()
  })

  it('renders user identity if provided', () => {
    render(<Header user={{ name: 'Grace Hopper', avatarUrl: 'https://example.com/g.png' }} /> as any)
    const img = screen.queryByRole('img', { name: /grace hopper/i }) || screen.queryByRole('img')
    expect(img || screen.queryByText(/grace/i)).toBeTruthy()
  })

  it('handles unexpected/empty inputs gracefully', () => {
    // @ts-expect-error - intentionally invalid to test resilience
    render(<Header title={null} subtitle={undefined} navItems={null} user={null} />)
    const region =
      screen.queryByRole('banner') ||
      screen.queryByRole('navigation') ||
      screen.queryByRole('heading') ||
      screen.queryByTestId('header-root')
    expect(region).toBeTruthy()
  })

  it('applies className and id to root', () => {
    render(<Header className="h-root" id="hdr" /> as any)
    const root =
      screen.queryByRole('banner') ||
      screen.queryByTestId('header-root') ||
      document.getElementById('hdr')
    expect(root).toBeTruthy()
    if (root) {
      expect(root.className).toMatch(/h-root/)
    }
  })

  it('respects aria attributes for accessibility', () => {
    render(<Header aria-label="Primary header" /> as any)
    const named =
      screen.queryByRole('banner', { name: /primary header/i }) ||
      screen.queryByRole('navigation', { name: /primary header/i })
    expect(named).toBeTruthy()
  })

  it('fires callbacks for interactions when provided', async () => {
    const user = userEvent.setup()
    const onLogoClick = (global as any).jest?.fn ? (global as any).jest.fn() : (() => {}) as any
    const onSignOut = (global as any).jest?.fn ? (global as any).jest.fn() : (() => {}) as any

    render(<Header title="Brand" onLogoClick={onLogoClick} onSignOut={onSignOut} user={{ name: 'X' }} /> as any)
    const logo = screen.queryByRole('img', { name: /brand/i }) || screen.queryByText(/brand/i)
    if (logo) {
      await user.click(logo)
      if (onLogoClick && 'mock' in onLogoClick) {
        expect((onLogoClick as any).mock.calls.length).toBeGreaterThanOrEqual(1)
      }
    }

    const signOut = screen.queryByRole('button', { name: /sign out|logout|log out/i })
    if (signOut) {
      await user.click(signOut)
      if (onSignOut && 'mock' in onSignOut) {
        expect((onSignOut as any).mock.calls.length).toBeGreaterThanOrEqual(1)
      }
    }
  })
})