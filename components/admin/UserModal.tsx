'use client';
"use client";

/**
 * User Modal Component - User Creation and Editing
 *
 * Features:
 * - Create new users
 * - Edit existing users
 * - Sub-role selection for Team Members (STRICT v4.1)
 * - Form validation
 * - Real-time module access preview
 *
 * RBAC: Super Admin and Corporate Admin only
 * Compliance: WCAG 2.1 AA
 */

import React, { useEffect } from 'react';
import { Save, X, AlertCircle } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import AccessibleModal from '@/components/admin/AccessibleModal';
import SubRoleSelector from '@/components/admin/SubRoleSelector';
import { Button } from '@/components/ui/button';
import { normalizeRole, SubRole, Role } from '@/lib/rbac/client-roles';
import { userFormSchema, type UserFormSchema } from '@/lib/schemas/admin';

export interface UserFormData {
  name?: string;
  email?: string;
  role?: string;
  subRole?: SubRole | null;
  status?: 'Active' | 'Inactive' | 'Locked';
  department?: string;
  phone?: string;
}

export interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: UserFormData) => Promise<void>;
  editingUser?: UserFormData & { id?: string } | null;
  t: (key: string, fallback?: string) => string;
}

/**
 * User Creation/Editing Modal with RBAC Sub-Role Support
 */
export default function UserModal({
  isOpen,
  onClose,
  onSave,
  editingUser,
  t,
}: UserModalProps) {
  // Step 4: React Hook Form + Zod validation
  const {
    control,
    handleSubmit: handleFormSubmit,
    formState: { errors, isSubmitting },
    reset,
    watch,
    setValue,
  } = useForm<UserFormSchema>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      name: '',
      email: '',
      role: 'TENANT',
      subRole: null,
      status: 'Active',
      department: '',
      phone: '',
    },
  });

  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const watchedRole = watch('role');
  const watchedSubRole = watch('subRole');

  // Initialize form when modal opens or editingUser changes
  useEffect(() => {
    if (isOpen) {
      if (editingUser) {
        reset({
          name: editingUser.name || '',
          email: editingUser.email || '',
          role: editingUser.role || 'TENANT',
          subRole: editingUser.subRole || null,
          status: editingUser.status || 'Active',
          department: editingUser.department || '',
          phone: editingUser.phone || '',
        });
      } else {
        // Reset for new user
        reset({
          name: '',
          email: '',
          role: 'TENANT',
          subRole: null,
          status: 'Active',
          department: '',
          phone: '',
        });
      }
      setSubmitError(null);
    }
  }, [isOpen, editingUser, reset]);

  // TEAM_MEMBER is eligible for sub-roles (FINANCE_OFFICER, HR_OFFICER, SUPPORT_AGENT)
  const subRoleEligible = new Set<Role>([Role.TEAM_MEMBER]);

  // Clear sub-role when role changes away from TEAM_MEMBER
  useEffect(() => {
    const normalizedRole = normalizeRole(watchedRole || '');
    if (
      (!normalizedRole || !subRoleEligible.has(normalizedRole)) &&
      watchedSubRole
    ) {
      setValue('subRole', null);
    }
  }, [watchedRole, watchedSubRole, setValue]);

  const onSubmit = async (data: UserFormSchema) => {
    setSubmitError(null);
    try {
      await onSave(data);
      onClose();
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : t('admin.userModal.errors.saveFailed', 'Failed to save user')
      );
    }
  };

  const normalizedRole = normalizeRole(watchedRole || '');
  const allowSubRole =
    normalizedRole !== null && subRoleEligible.has(normalizedRole);

  return (
    <AccessibleModal
      isOpen={isOpen}
      onClose={onClose}
      title={
        editingUser
          ? t('admin.userModal.titleEdit', 'Edit User')
          : t('admin.userModal.titleCreate', 'Create New User')
      }
      description={
        editingUser
          ? t('admin.userModal.descriptionEdit', 'Update user information and permissions')
          : t('admin.userModal.descriptionCreate', 'Add a new user to the organization')
      }
      size="lg"
      closeOnClickOutside={false}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            <X className="me-2 h-4 w-4" />
            {t('admin.common.cancel', 'Cancel')}
          </Button>
          <Button
            onClick={handleFormSubmit(onSubmit)}
            disabled={isSubmitting}
          >
            <Save className="me-2 h-4 w-4" />
            {isSubmitting
              ? t('admin.common.saving', 'Saving...')
              : editingUser
                ? t('admin.common.update', 'Update')
                : t('admin.common.create', 'Create')}
          </Button>
        </>
      }
    >
      <form onSubmit={handleFormSubmit(onSubmit)} className="space-y-6">
        {/* Global error message */}
        {submitError && (
          <div className="p-4 bg-destructive/10 border border-destructive rounded-lg flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div className="text-sm text-destructive">{submitError}</div>
          </div>
        )}

        {/* Name */}
        <div>
          <label htmlFor="user-name" className="block text-sm font-medium text-foreground mb-2">
            {t('admin.userModal.fields.name', 'Full Name')}
            <span className="text-destructive ms-1">*</span>
          </label>
          <Controller
            name="name"
            control={control}
            render={({ field }) => (
              <input
                {...field}
                id="user-name"
                type="text"
                value={field.value || ''}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${
                  errors.name ? 'border-destructive' : 'border-input'
                }`}
                placeholder={t('admin.userModal.placeholders.name', 'John Doe')}
                disabled={isSubmitting}
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? 'name-error' : undefined}
              />
            )}
          />
          {errors.name && (
            <p id="name-error" className="mt-1 text-sm text-destructive">
              {errors.name.message}
            </p>
          )}
        </div>

        {/* Email */}
        <div>
          <label htmlFor="user-email" className="block text-sm font-medium text-foreground mb-2">
            {t('admin.userModal.fields.email', 'Email Address')}
            <span className="text-destructive ms-1">*</span>
          </label>
          <Controller
            name="email"
            control={control}
            render={({ field }) => (
              <input
                {...field}
                id="user-email"
                type="email"
                value={field.value || ''}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${
                  errors.email ? 'border-destructive' : 'border-input'
                }`}
                placeholder={t('admin.userModal.placeholders.email', 'john@example.com')}
                disabled={isSubmitting || !!editingUser}
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? 'email-error' : undefined}
              />
            )}
          />
          {errors.email && (
            <p id="email-error" className="mt-1 text-sm text-destructive">
              {errors.email.message}
            </p>
          )}
          {editingUser && (
            <p className="mt-1 text-sm text-muted-foreground">
              {t('admin.userModal.hints.emailImmutable', 'Email cannot be changed after creation')}
            </p>
          )}
        </div>

        {/* Role */}
        <div>
          <label htmlFor="user-role" className="block text-sm font-medium text-foreground mb-2">
            {t('admin.userModal.fields.role', 'Role')}
            <span className="text-destructive ms-1">*</span>
          </label>
          <Controller
            name="role"
            control={control}
            render={({ field }) => (
              <select
                {...field}
                id="user-role"
                value={field.value || 'TENANT'}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${
                  errors.role ? 'border-destructive' : 'border-input'
                }`}
                disabled={isSubmitting}
                aria-invalid={!!errors.role}
                aria-describedby={errors.role ? 'role-error' : undefined}
              >
                <option value="TENANT">{t('admin.roles.tenant', 'Tenant')}</option>
                <option value="VENDOR">{t('admin.roles.vendor', 'Vendor')}</option>
                <option value="TECHNICIAN">{t('admin.roles.technician', 'Technician')}</option>
                <option value="PROPERTY_MANAGER">{t('admin.roles.propertyManager', 'Property Manager')}</option>
                <option value="FM_MANAGER">{t('admin.roles.fmManager', 'FM Manager')}</option>
                <option value="FINANCE">{t('admin.roles.finance', 'Finance')}</option>
                <option value="HR">{t('admin.roles.hr', 'HR')}</option>
                <option value="SUPPORT">{t('admin.roles.support', 'Support')}</option>
                <option value="ADMIN">{t('admin.roles.admin', 'Corporate Admin')}</option>
                <option value="SUPER_ADMIN">{t('admin.roles.superAdmin', 'Super Admin')}</option>
              </select>
            )}
          />
          {errors.role && (
            <p id="role-error" className="mt-1 text-sm text-destructive">
              {errors.role.message}
            </p>
          )}
        </div>

        {/* Sub-Role Selector (eligible roles only) */}
        {allowSubRole && (
          <div>
            <label htmlFor="user-subrole" className="block text-sm font-medium text-foreground mb-2">
              {t('admin.userModal.fields.subRole', 'Sub-Role')}
              <span className="text-destructive ms-1">*</span>
            </label>
            <Controller
              name="subRole"
              control={control}
              render={({ field }) => (
                <SubRoleSelector
                  role={normalizedRole}
                  value={field.value || undefined}
                  onChange={(newSubRole) => field.onChange(newSubRole)}
                  disabled={isSubmitting}
                />
              )}
            />
            {errors.subRole && (
              <p className="mt-2 text-sm text-destructive">{errors.subRole.message}</p>
            )}
            <p className="mt-2 text-sm text-muted-foreground">
              {t(
                'admin.userModal.hints.subRole',
                'Sub-roles grant access to specialized modules like Finance, HR, Support, and Operations.'
              )}
            </p>
          </div>
        )}

        {/* Status */}
        <div>
          <label htmlFor="user-status" className="block text-sm font-medium text-foreground mb-2">
            {t('admin.userModal.fields.status', 'Status')}
          </label>
          <Controller
            name="status"
            control={control}
            render={({ field }) => (
              <select
                {...field}
                id="user-status"
                value={field.value || 'Active'}
                className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                disabled={isSubmitting}
              >
                <option value="Active">{t('admin.status.active', 'Active')}</option>
                <option value="Inactive">{t('admin.status.inactive', 'Inactive')}</option>
                <option value="Locked">{t('admin.status.locked', 'Locked')}</option>
              </select>
            )}
          />
        </div>

        {/* Department (optional) */}
        <div>
          <label htmlFor="user-department" className="block text-sm font-medium text-foreground mb-2">
            {t('admin.userModal.fields.department', 'Department')}
          </label>
          <Controller
            name="department"
            control={control}
            render={({ field }) => (
              <input
                {...field}
                id="user-department"
                type="text"
                value={field.value || ''}
                className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder={t('admin.userModal.placeholders.department', 'e.g., Facilities, Maintenance')}
                disabled={isSubmitting}
              />
            )}
          />
        </div>

        {/* Phone (optional) */}
        <div>
          <label htmlFor="user-phone" className="block text-sm font-medium text-foreground mb-2">
            {t('admin.userModal.fields.phone', 'Phone Number')}
          </label>
          <Controller
            name="phone"
            control={control}
            render={({ field }) => (
              <input
                {...field}
                id="user-phone"
                type="tel"
                value={field.value || ''}
                className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder={t('admin.userModal.placeholders.phone', '+1 (555) 123-4567')}
                disabled={isSubmitting}
              />
            )}
          />
        </div>
      </form>
    </AccessibleModal>
  );
}
