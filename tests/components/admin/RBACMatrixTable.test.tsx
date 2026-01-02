import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import RBACMatrixTable, { type RolePermission, type Module } from "@/components/admin/RBACMatrixTable";

const modules: Module[] = [
  { id: "work_orders", label: "Work Orders", description: "Maintenance and service requests" },
];

const baseRoles: RolePermission[] = [
  {
    role: "MANAGER",
    roleLabel: "Manager",
    permissions: {
      work_orders: { view: false, create: false, edit: false, delete: false },
    },
  },
];

const renderTable = (overrides: Partial<React.ComponentProps<typeof RBACMatrixTable>> = {}) => {
  const onChange = vi.fn();
  const onSave = vi.fn().mockResolvedValue(undefined);
  const props = {
    roles: baseRoles,
    modules,
    onChange,
    onSave,
    ...overrides,
  };
  const view = render(<RBACMatrixTable {...props} />);
  return { ...view, onChange, onSave };
};

describe("RBACMatrixTable", () => {
  it("calls onChange with updated roles and enables view when enabling create", async () => {
    const { onChange } = renderTable();
    const user = userEvent.setup();

    const createSwitch = screen.getByLabelText(/Manager create Work Orders/i);
    await user.click(createSwitch);

    expect(onChange).toHaveBeenCalledTimes(1);
    const updatedRoles = onChange.mock.calls[0][0] as RolePermission[];
    const perms = updatedRoles[0].permissions.work_orders;
    expect(perms.create).toBe(true);
    expect(perms.view).toBe(true); // auto-enables view
    expect(
      screen.getByText(/You have unsaved changes/i),
    ).toBeInTheDocument();
  });

  it("disables dependent permissions when view is turned off", async () => {
    const rolesWithView: RolePermission[] = [
      {
        role: "MANAGER",
        roleLabel: "Manager",
        permissions: {
          work_orders: { view: true, create: true, edit: true, delete: true },
        },
      },
    ];
    const { onChange } = renderTable({ roles: rolesWithView });
    const user = userEvent.setup();

    const viewSwitch = screen.getByLabelText(/Manager view Work Orders/i);
    await user.click(viewSwitch);

    const updatedRoles = onChange.mock.calls[0][0] as RolePermission[];
    const perms = updatedRoles[0].permissions.work_orders;
    expect(perms.view).toBe(false);
    expect(perms.create).toBe(false);
    expect(perms.edit).toBe(false);
    expect(perms.delete).toBe(false);
  });

  it("resets to initial roles and clears dirty state", async () => {
    const { onChange } = renderTable();
    const user = userEvent.setup();

    const createSwitch = screen.getByLabelText(/Manager create Work Orders/i);
    await user.click(createSwitch);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/You have unsaved changes/i)).toBeInTheDocument();

    const resetButton = screen.getByRole("button", { name: /Reset/i });
    await user.click(resetButton);

    expect(onChange).toHaveBeenCalledTimes(2);
    const resetRoles = onChange.mock.calls[1][0] as RolePermission[];
    expect(resetRoles).toEqual(baseRoles);
    expect(
      screen.queryByText(/You have unsaved changes/i),
    ).not.toBeInTheDocument();
  });

  it("saves updated roles, clears dirty state, and disables save after completion", async () => {
    const { onSave } = renderTable();
    const user = userEvent.setup();

    const createSwitch = screen.getByLabelText(/Manager create Work Orders/i);
    await user.click(createSwitch);

    // Wait for dirty state to update and save button to be enabled
    // Button has aria-label="Save permission changes" which takes precedence over visible text
    let saveButton: HTMLElement;
    await waitFor(() => {
      saveButton = screen.getByRole("button", { name: /Save permission changes/i });
      expect(saveButton).toBeInTheDocument();
    });
    
    await user.click(saveButton!);

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(
        screen.queryByText(/You have unsaved changes/i),
      ).not.toBeInTheDocument(),
    );
    expect(saveButton!).toBeDisabled();
  });
});
