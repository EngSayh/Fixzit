/**
 * SubRoleSelector Integration Tests
 * 
 * Tests:
 * - Component rendering based on role
 * - Sub-role selection and onChange callback
 * - Module access preview display
 * - Accessibility (ARIA labels, keyboard navigation)
 * - Error state display
 * - Disabled state
 */

import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import SubRoleSelector from '@/components/admin/SubRoleSelector';
import { Role, SubRole, Plan } from '@/lib/rbac/client-roles';

// Mock translation context
vi.mock('@/contexts/TranslationContext', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback || key,
  }),
}));

// Mock CurrentOrgContext for plan access
vi.mock('@/contexts/CurrentOrgContext', () => ({
  useCurrentOrg: () => ({
    org: { id: 'test-org', name: 'Test Org', plan: Plan.STANDARD },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

describe('SubRoleSelector', () => {
  describe('Rendering based on role', () => {
    it('renders for TEAM_MEMBER role', () => {
      const mockOnChange = vi.fn();
      
      render(
        <SubRoleSelector
          role={Role.TEAM_MEMBER}
          value={null}
          onChange={mockOnChange}
        />
      );
      
      expect(screen.getByLabelText(/Sub-Role/i)).toBeInTheDocument();
    });
    
    it('renders for FINANCE legacy string (normalized to TEAM_MEMBER)', () => {
      const mockOnChange = vi.fn();
      
      render(
        <SubRoleSelector
          role="FINANCE"
          value={null}
          onChange={mockOnChange}
        />
      );
      
      expect(screen.getByLabelText(/Sub-Role/i)).toBeInTheDocument();
    });
    
    it('does not render for non-eligible roles', () => {
      const mockOnChange = vi.fn();
      const { container } = render(
        <SubRoleSelector
          role={Role.TENANT}
          value={null}
          onChange={mockOnChange}
        />
      );
      
      expect(container.firstChild).toBeNull();
    });
    
    it('does not render for ADMIN role', () => {
      const mockOnChange = vi.fn();
      const { container } = render(
        <SubRoleSelector
          role={Role.ADMIN}
          value={null}
          onChange={mockOnChange}
        />
      );
      
      expect(container.firstChild).toBeNull();
    });
  });
  
  describe('Sub-role selection', () => {
    it('displays all sub-role options', () => {
      const mockOnChange = vi.fn();
      
      render(
        <SubRoleSelector
          role={Role.TEAM_MEMBER}
          value={null}
          onChange={mockOnChange}
        />
      );
      
      const select = screen.getByLabelText(/Sub-Role/i);
      const options = within(select).getAllByRole('option');
      
      // Should have 5 options: "None" + 4 sub-roles
      expect(options).toHaveLength(5);
      expect(options[0]).toHaveTextContent(/No specialization/i);
      expect(options[1]).toHaveTextContent(/Finance Officer/i);
      expect(options[2]).toHaveTextContent(/HR Officer/i);
      expect(options[3]).toHaveTextContent(/Support Agent/i);
      expect(options[4]).toHaveTextContent(/Operations Manager/i);
    });
    
    it('selects the provided value', () => {
      const mockOnChange = vi.fn();
      
      render(
        <SubRoleSelector
          role={Role.TEAM_MEMBER}
          value={SubRole.FINANCE_OFFICER}
          onChange={mockOnChange}
        />
      );
      
      const select = screen.getByLabelText(/Sub-Role/i) as HTMLSelectElement;
      expect(select.value).toBe(SubRole.FINANCE_OFFICER);
    });
    
    it('calls onChange when selection changes', () => {
      const mockOnChange = vi.fn();
      
      render(
        <SubRoleSelector
          role={Role.TEAM_MEMBER}
          value={null}
          onChange={mockOnChange}
        />
      );
      
      const select = screen.getByLabelText(/Sub-Role/i);
      fireEvent.change(select, { target: { value: SubRole.HR_OFFICER } });
      
      expect(mockOnChange).toHaveBeenCalledWith(SubRole.HR_OFFICER);
      expect(mockOnChange).toHaveBeenCalledTimes(1);
    });
    
    it('calls onChange with null when "None" is selected', () => {
      const mockOnChange = vi.fn();
      
      render(
        <SubRoleSelector
          role={Role.TEAM_MEMBER}
          value={SubRole.FINANCE_OFFICER}
          onChange={mockOnChange}
        />
      );
      
      const select = screen.getByLabelText(/Sub-Role/i);
      fireEvent.change(select, { target: { value: '' } });
      
      expect(mockOnChange).toHaveBeenCalledWith(null);
    });
  });
  
  describe('Module access preview', () => {
    it('shows module access description for selected sub-role', () => {
      const mockOnChange = vi.fn();
      
      render(
        <SubRoleSelector
          role={Role.TEAM_MEMBER}
          value={SubRole.FINANCE_OFFICER}
          onChange={mockOnChange}
        />
      );
      
      // Should show description for Finance Officer
      expect(screen.getByText(/Manages budgets, invoices/i)).toBeInTheDocument();
    });
    
    it('shows description for selected sub-role', () => {
      const mockOnChange = vi.fn();
      
      render(
        <SubRoleSelector
          role={Role.TEAM_MEMBER}
          value={SubRole.HR_OFFICER}
          onChange={mockOnChange}
        />
      );
      
      expect(screen.getByText(/Manages employee records/i)).toBeInTheDocument();
    });
  });
  
  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      const mockOnChange = vi.fn();
      
      render(
        <SubRoleSelector
          role={Role.TEAM_MEMBER}
          value={null}
          onChange={mockOnChange}
          required
        />
      );
      
      const select = screen.getByLabelText(/Sub-Role/i);
      expect(select).toHaveAttribute('aria-describedby');
      expect(select).toHaveAttribute('aria-invalid', 'false');
    });
    
    it('shows required indicator when required', () => {
      const mockOnChange = vi.fn();
      
      render(
        <SubRoleSelector
          role={Role.TEAM_MEMBER}
          value={null}
          onChange={mockOnChange}
          required
        />
      );
      
      expect(screen.getByLabelText('required')).toBeInTheDocument();
      expect(screen.getByLabelText(/Sub-Role/i)).toBeRequired();
    });
    
    it('shows error state when error provided', () => {
      const mockOnChange = vi.fn();
      const errorMessage = 'Sub-role is required';
      
      render(
        <SubRoleSelector
          role={Role.TEAM_MEMBER}
          value={null}
          onChange={mockOnChange}
          error={errorMessage}
        />
      );
      
      const select = screen.getByLabelText(/Sub-Role/i);
      expect(select).toHaveAttribute('aria-invalid', 'true');
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
    
    it('is keyboard navigable', () => {
      const mockOnChange = vi.fn();
      
      render(
        <SubRoleSelector
          role={Role.TEAM_MEMBER}
          value={null}
          onChange={mockOnChange}
        />
      );
      
      const select = screen.getByLabelText(/Sub-Role/i);
      select.focus();
      expect(select).toHaveFocus();
    });
  });
  
  describe('Disabled state', () => {
    it('disables select when disabled prop is true', () => {
      const mockOnChange = vi.fn();
      
      render(
        <SubRoleSelector
          role={Role.TEAM_MEMBER}
          value={null}
          onChange={mockOnChange}
          disabled
        />
      );
      
      const select = screen.getByLabelText(/Sub-Role/i);
      expect(select).toBeDisabled();
    });
    
    it('applies disabled styling', () => {
      const mockOnChange = vi.fn();
      
      render(
        <SubRoleSelector
          role={Role.TEAM_MEMBER}
          value={null}
          onChange={mockOnChange}
          disabled
        />
      );
      
      const select = screen.getByLabelText(/Sub-Role/i);
      expect(select).toHaveClass('disabled:cursor-not-allowed');
    });
  });
  
  describe('Custom className', () => {
    it('applies custom className', () => {
      const mockOnChange = vi.fn();
      const customClass = 'my-custom-class';
      
      const { container } = render(
        <SubRoleSelector
          role={Role.TEAM_MEMBER}
          value={null}
          onChange={mockOnChange}
          className={customClass}
        />
      );
      
      expect(container.firstChild).toHaveClass(customClass);
    });
  });
});
