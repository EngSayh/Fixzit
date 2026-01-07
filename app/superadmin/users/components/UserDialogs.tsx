/**
 * Dialog components for Superadmin Users list
 * @module app/superadmin/users/components/UserDialogs
 */

"use client";

import React from "react";
import { useI18n } from "@/i18n/useI18n";
import {
  Users,
  Shield,
  KeyRound,
  UserPlus,
  Bell,
  Mail,
  AlertCircle,
  Trash2,
  Loader2,
  ChevronDown,
  ChevronRight,
  CheckCircle,
  XCircle,
} from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectItem } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RBAC_MODULES, RBAC_ROLE_PERMISSIONS, type ModulePermissions } from "@/config/rbac.matrix";
import { getSubModulesForParent } from "@/config/rbac.submodules";
import { CANONICAL_ROLES, type UserRoleType } from "@/types/user";
import type { UserData, Organization, CreateUserFormData, PermissionOverrides } from "./types";
import { STATUS_COLORS } from "./types";

// ============================================================================
// Helpers
// ============================================================================

function formatDate(dateStr?: string, locale: string = "en-US"): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getUserName(user: UserData): string {
  const first = user.personal?.firstName || "";
  const last = user.personal?.lastName || "";
  return (first + " " + last).trim() || "—";
}

function getUserRole(user: UserData): string {
  return user.professional?.role || user.role || "—";
}

function getModuleAccessBadges(user: UserData): React.ReactNode {
  const role = (user.professional?.role || user.role || "") as UserRoleType;
  const permissions = RBAC_ROLE_PERMISSIONS[role];
  
  if (!permissions) {
    return <span className="text-xs text-muted-foreground">No modules</span>;
  }
  
  const accessibleModules = RBAC_MODULES.filter(mod => {
    const perm = permissions[mod.id] as ModulePermissions | undefined;
    return perm && (perm.view || perm.create || perm.edit || perm.delete);
  });
  
  if (accessibleModules.length === 0) {
    return <span className="text-xs text-muted-foreground">No modules</span>;
  }
  
  const displayed = accessibleModules.slice(0, 3);
  const remaining = accessibleModules.length - 3;
  
  return (
    <>
      {displayed.map(mod => (
        <Badge 
          key={mod.id} 
          variant="outline" 
          className="text-xs bg-green-500/10 text-green-400 border-green-500/30"
        >
          {mod.label.split(" ")[0]}
        </Badge>
      ))}
      {remaining > 0 && (
        <Badge 
          variant="outline" 
          className="text-xs bg-muted text-muted-foreground border-input"
        >
          +{remaining}
        </Badge>
      )}
    </>
  );
}

// ============================================================================
// View User Dialog
// ============================================================================

interface ViewUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserData | null;
}

export function ViewUserDialog({ open, onOpenChange, user }: ViewUserDialogProps) {
  const { t } = useI18n();

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border text-foreground max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            User Details
          </DialogTitle>
          <DialogDescription>
            View detailed information about this user
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">User ID</p>
              <p className="font-mono text-sm">{user.code || user._id.slice(-8)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Full ID</p>
              <p className="font-mono text-xs text-muted-foreground truncate" title={user._id}>{user._id}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Name</p>
              <p className="font-medium">{getUserName(user)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">{user.email}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">User Type</p>
              <Badge 
                variant="outline" 
                className={user.userType === "company" 
                  ? "bg-purple-500/20 text-purple-400 border-purple-500/30" 
                  : "bg-blue-500/20 text-blue-400 border-blue-500/30"
                }
              >
                {user.userType === "company" ? "Company" : "Individual"}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Role</p>
              <p className="font-medium">{getUserRole(user)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Sub-Role</p>
              <p className="font-medium">{user.professional?.subRole || "—"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Department</p>
              <p className="font-medium">{user.professional?.department || "—"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <Badge className={STATUS_COLORS[user.status]}>
                {user.status}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Organization</p>
              <p className="font-medium">{user.orgName || "—"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Phone</p>
              <p className="font-medium">{user.personal?.phone || "—"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Last Login</p>
              <p className="font-medium">{user.lastLogin ? formatDate(user.lastLogin) : "Never"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Created</p>
              <p className="font-medium">{formatDate(user.createdAt)}</p>
            </div>
          </div>
          
          {/* Module Access Section */}
          <div className="border-t border-border pt-4">
            <p className="text-sm font-medium text-foreground mb-2">Module Access</p>
            <div className="flex flex-wrap gap-1">
              {getModuleAccessBadges(user)}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-input"
            aria-label={t("common.close", "Close user details")}
            title={t("common.close", "Close user details")}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Edit Status Dialog (Single User)
// ============================================================================

interface EditStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserData | null;
  status: string;
  onStatusChange: (status: string) => void;
  onSave: () => void;
  loading: boolean;
}

export function EditStatusDialog({
  open,
  onOpenChange,
  user,
  status,
  onStatusChange,
  onSave,
  loading,
}: EditStatusDialogProps) {
  const { t } = useI18n();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border text-foreground max-w-md">
        <DialogHeader>
          <DialogTitle>Change User Status</DialogTitle>
          <DialogDescription>
            Update the status for {user?.email}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>New Status</Label>
            <Select 
              value={status} 
              onValueChange={onStatusChange}
              placeholder="Select status"
              className="w-full bg-muted border-input text-foreground"
            >
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="INACTIVE">Inactive</SelectItem>
              <SelectItem value="SUSPENDED">Suspended</SelectItem>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)} 
            className="border-input" 
            aria-label={t("common.cancel", "Cancel status change")} 
            title={t("common.cancel", "Cancel status change")}
          >
            Cancel
          </Button>
          <Button 
            onClick={onSave}
            disabled={!status || loading}
            className="bg-blue-600 hover:bg-blue-700"
            aria-label={t("superadmin.users.updateStatus", "Update user status")}
            title={t("superadmin.users.updateStatus", "Update user status")}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin me-2" /> : null}
            Update Status
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Bulk Status Dialog
// ============================================================================

interface BulkStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  status: string;
  onStatusChange: (status: string) => void;
  onSave: () => void;
  loading: boolean;
}

export function BulkStatusDialog({
  open,
  onOpenChange,
  selectedCount,
  status,
  onStatusChange,
  onSave,
  loading,
}: BulkStatusDialogProps) {
  const { t } = useI18n();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border text-foreground max-w-md">
        <DialogHeader>
          <DialogTitle>Bulk Status Change</DialogTitle>
          <DialogDescription>
            Update status for {selectedCount} selected users
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>New Status</Label>
            <Select 
              value={status} 
              onValueChange={onStatusChange}
              placeholder="Select status"
              className="w-full bg-muted border-input text-foreground"
            >
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="INACTIVE">Inactive</SelectItem>
              <SelectItem value="SUSPENDED">Suspended</SelectItem>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)} 
            className="border-input" 
            aria-label={t("common.cancel", "Cancel bulk status change")} 
            title={t("common.cancel", "Cancel bulk status change")}
          >
            Cancel
          </Button>
          <Button 
            onClick={onSave}
            disabled={!status || loading}
            className="bg-blue-600 hover:bg-blue-700"
            aria-label={t("superadmin.users.updateBulkStatus", `Update status for ${selectedCount} users`)}
            title={t("superadmin.users.updateBulkStatus", `Update status for ${selectedCount} users`)}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin me-2" /> : null}
            Update {selectedCount} Users
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Send Notification Dialog
// ============================================================================

interface NotificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetCount: number;
  subject: string;
  onSubjectChange: (subject: string) => void;
  message: string;
  onMessageChange: (message: string) => void;
  onSend: () => void;
  loading: boolean;
}

export function NotificationDialog({
  open,
  onOpenChange,
  targetCount,
  subject,
  onSubjectChange,
  message,
  onMessageChange,
  onSend,
  loading,
}: NotificationDialogProps) {
  const { t } = useI18n();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border text-foreground max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Send Notification
          </DialogTitle>
          <DialogDescription>
            Send an email notification to {targetCount} selected user{targetCount === 1 ? "" : "s"}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => onSubjectChange(e.target.value)}
              placeholder="Enter email subject..."
              className="bg-muted border-input text-foreground"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => onMessageChange(e.target.value)}
              placeholder="Enter your message..."
              rows={5}
              className="bg-muted border-input text-foreground resize-none"
            />
          </div>
        </div>
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)} 
            className="border-input" 
            aria-label={t("common.cancel", "Cancel sending notification")} 
            title={t("common.cancel", "Cancel sending notification")}
          >
            Cancel
          </Button>
          <Button 
            onClick={onSend}
            disabled={!subject || !message || loading}
            className="bg-blue-600 hover:bg-blue-700"
            aria-label={t("superadmin.users.sendNotification", "Send email notification")}
            title={t("superadmin.users.sendNotification", "Send email notification")}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin me-2" /> : <Mail className="h-4 w-4 me-2" />}
            Send Notification
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Delete Confirmation Dialog
// ============================================================================

interface DeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  onConfirm: () => void;
  loading: boolean;
}

export function DeleteDialog({
  open,
  onOpenChange,
  selectedCount,
  onConfirm,
  loading,
}: DeleteDialogProps) {
  const { t } = useI18n();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border text-foreground max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-400">
            <AlertCircle className="h-5 w-5" />
            Confirm Deletion
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete {selectedCount} user{selectedCount !== 1 ? "s" : ""}?
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm text-muted-foreground">
            This will mark the selected user{selectedCount !== 1 ? "s" : ""} as deleted and remove them from active lists. 
            They can be restored from the deleted users view if needed.
          </p>
        </div>
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)} 
            className="border-input" 
            aria-label={t("common.cancel", "Cancel user deletion")} 
            title={t("common.cancel", "Cancel user deletion")}
          >
            Cancel
          </Button>
          <Button 
            onClick={onConfirm}
            disabled={loading}
            className="bg-red-600 hover:bg-red-700"
            aria-label={t("superadmin.users.deleteUsers", `Delete ${selectedCount} users`)}
            title={t("superadmin.users.deleteUsers", `Delete ${selectedCount} users`)}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin me-2" /> : <Trash2 className="h-4 w-4 me-2" />}
            Delete Users
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// View Permissions Dialog
// ============================================================================

interface ViewPermissionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserData | null;
}

export function ViewPermissionsDialog({ open, onOpenChange, user }: ViewPermissionsDialogProps) {
  const { t } = useI18n();

  if (!user) return null;

  const role = (user.role || user.professional?.role || "STAFF") as UserRoleType;
  const permissions = RBAC_ROLE_PERMISSIONS[role] || {};

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border text-foreground max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            {t("superadmin.users.permissions.title", "Module Permissions")}
          </DialogTitle>
          <DialogDescription>
            {t("superadmin.users.permissions.description", `Permissions for ${getUserName(user)} (${getUserRole(user)})`)}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
            <Shield className="h-5 w-5 text-blue-400" />
            <span className="font-medium">{t("superadmin.users.permissions.role", "Role")}: </span>
            <Badge variant="outline">{role}</Badge>
          </div>
          
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="text-start px-4 py-2 font-medium text-muted-foreground">{t("superadmin.users.permissions.module", "Module")}</th>
                  <th className="text-center px-2 py-2 font-medium text-muted-foreground">{t("superadmin.users.permissions.view", "View")}</th>
                  <th className="text-center px-2 py-2 font-medium text-muted-foreground">{t("superadmin.users.permissions.create", "Create")}</th>
                  <th className="text-center px-2 py-2 font-medium text-muted-foreground">{t("superadmin.users.permissions.edit", "Edit")}</th>
                  <th className="text-center px-2 py-2 font-medium text-muted-foreground">{t("superadmin.users.permissions.delete", "Delete")}</th>
                </tr>
              </thead>
              <tbody>
                {RBAC_MODULES.map((module) => {
                  const modulePerms: ModulePermissions = (permissions[module.id] as ModulePermissions) || { view: false, create: false, edit: false, delete: false };
                  return (
                    <tr key={module.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-2">
                        <div>
                          <p className="font-medium">{module.label}</p>
                          <p className="text-xs text-muted-foreground">{module.description}</p>
                        </div>
                      </td>
                      <td className="text-center px-2 py-2">
                        {modulePerms.view ? (
                          <CheckCircle className="h-4 w-4 text-green-500 mx-auto" />
                        ) : (
                          <XCircle className="h-4 w-4 text-muted-foreground mx-auto" />
                        )}
                      </td>
                      <td className="text-center px-2 py-2">
                        {modulePerms.create ? (
                          <CheckCircle className="h-4 w-4 text-green-500 mx-auto" />
                        ) : (
                          <XCircle className="h-4 w-4 text-muted-foreground mx-auto" />
                        )}
                      </td>
                      <td className="text-center px-2 py-2">
                        {modulePerms.edit ? (
                          <CheckCircle className="h-4 w-4 text-green-500 mx-auto" />
                        ) : (
                          <XCircle className="h-4 w-4 text-muted-foreground mx-auto" />
                        )}
                      </td>
                      <td className="text-center px-2 py-2">
                        {modulePerms.delete ? (
                          <CheckCircle className="h-4 w-4 text-green-500 mx-auto" />
                        ) : (
                          <XCircle className="h-4 w-4 text-muted-foreground mx-auto" />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          <p className="text-xs text-muted-foreground text-center">
            {t("superadmin.users.permissions.note", "Permissions are determined by the user's role. Contact an administrator to change role assignments.")}
          </p>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-input"
            aria-label={t("common.close", "Close permissions dialog")}
            title={t("common.close", "Close permissions dialog")}
          >
            {t("common.close", "Close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Create User Dialog
// ============================================================================

interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: CreateUserFormData;
  onFormChange: (form: CreateUserFormData) => void;
  organizations: Organization[];
  onSave: () => void;
  loading: boolean;
}

export function CreateUserDialog({
  open,
  onOpenChange,
  form,
  onFormChange,
  organizations,
  onSave,
  loading,
}: CreateUserDialogProps) {
  const { t } = useI18n();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            {t("superadmin.users.createUser", "Create User")}
          </DialogTitle>
          <DialogDescription>
            {t("superadmin.users.createUserDescription", "Create a new user account")}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="create-email">{t("superadmin.users.email", "Email")} *</Label>
            <Input
              id="create-email"
              type="email"
              value={form.email}
              onChange={(e) => onFormChange({ ...form, email: e.target.value })}
              placeholder="user@example.com"
              className="bg-muted border-input"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="create-firstName">{t("superadmin.users.firstName", "First Name")}</Label>
              <Input
                id="create-firstName"
                value={form.firstName}
                onChange={(e) => onFormChange({ ...form, firstName: e.target.value })}
                placeholder="John"
                className="bg-muted border-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-lastName">{t("superadmin.users.lastName", "Last Name")}</Label>
              <Input
                id="create-lastName"
                value={form.lastName}
                onChange={(e) => onFormChange({ ...form, lastName: e.target.value })}
                placeholder="Doe"
                className="bg-muted border-input"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="create-role">{t("superadmin.users.role", "Role")} *</Label>
            <Select
              value={form.role}
              onValueChange={(value) => onFormChange({ ...form, role: value as UserRoleType })}
              placeholder={t("superadmin.users.selectRole", "Select a role")}
              className="w-full sm:w-40 bg-muted border-input text-foreground"
            >
              {CANONICAL_ROLES.map((role) => (
                <SelectItem key={role} value={role}>
                  {role.replace(/_/g, " ")}
                </SelectItem>
              ))}
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="create-org">{t("superadmin.users.organization", "Organization")}</Label>
            <Select
              value={form.orgId}
              onValueChange={(value) => onFormChange({ ...form, orgId: value })}
              placeholder={t("superadmin.users.selectOrg", "Select organization (optional)")}
              className="w-full sm:w-40 bg-muted border-input text-foreground"
            >
              <SelectItem value="">{t("superadmin.users.noOrg", "No organization")}</SelectItem>
              {organizations.map((org) => (
                <SelectItem key={org._id} value={org._id}>
                  {org.name}
                </SelectItem>
              ))}
            </Select>
          </div>
        </div>
        
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              onFormChange({ email: "", firstName: "", lastName: "", role: "", orgId: "" });
            }}
            className="border-input"
            disabled={loading}
          >
            {t("common.cancel", "Cancel")}
          </Button>
          <Button
            onClick={onSave}
            disabled={loading || !form.email || !form.role}
            className="bg-primary text-primary-foreground"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 me-2 animate-spin" />
                {t("common.creating", "Creating...")}
              </>
            ) : (
              t("common.create", "Create")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Edit Role Dialog
// ============================================================================

interface EditRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserData | null;
  role: UserRoleType | "";
  onRoleChange: (role: UserRoleType | "") => void;
  onSave: () => void;
  loading: boolean;
}

export function EditRoleDialog({
  open,
  onOpenChange,
  user,
  role,
  onRoleChange,
  onSave,
  loading,
}: EditRoleDialogProps) {
  const { t } = useI18n();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-400" />
            {t("superadmin.users.editRole", "Edit User Role")}
          </DialogTitle>
          <DialogDescription>
            {user && (
              <>
                {t("superadmin.users.editRoleFor", "Change role for")} <strong>{user.email}</strong>
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {user && (
            <div className="p-3 bg-muted/50 rounded-lg text-sm">
              <p className="text-muted-foreground">
                {t("superadmin.users.currentRole", "Current role")}:{" "}
                <Badge variant="outline">{getUserRole(user)}</Badge>
              </p>
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="edit-role">{t("superadmin.users.newRole", "New Role")}</Label>
            <Select
              value={role}
              onValueChange={(value) => onRoleChange(value as UserRoleType)}
              placeholder={t("superadmin.users.selectRole", "Select a role")}
              className="w-full sm:w-40 bg-muted border-input text-foreground"
            >
              {CANONICAL_ROLES.map((r) => (
                <SelectItem key={r} value={r}>
                  {r.replace(/_/g, " ")}
                </SelectItem>
              ))}
            </Select>
          </div>
        </div>
        
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              onRoleChange("");
            }}
            className="border-input"
            disabled={loading}
          >
            {t("common.cancel", "Cancel")}
          </Button>
          <Button
            onClick={onSave}
            disabled={loading || !role}
            className="bg-primary text-primary-foreground"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 me-2 animate-spin" />
                {t("common.saving", "Saving...")}
              </>
            ) : (
              t("common.save", "Save")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Edit Permissions Dialog
// ============================================================================

interface EditPermissionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserData | null;
  permissionOverrides: PermissionOverrides;
  onTogglePermission: (subModuleId: string, permissionKey: keyof ModulePermissions) => void;
  expandedModules: Set<string>;
  onToggleModule: (moduleId: string) => void;
  onSave: () => void;
  loading: boolean;
}

export function EditPermissionsDialog({
  open,
  onOpenChange,
  user,
  permissionOverrides,
  onTogglePermission,
  expandedModules,
  onToggleModule,
  onSave,
  loading,
}: EditPermissionsDialogProps) {
  const { t } = useI18n();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-yellow-400" />
            {t("superadmin.users.editPermissions", "Edit Permissions")}
          </DialogTitle>
          <DialogDescription>
            {user && (
              <>
                {t("superadmin.users.editPermissionsFor", "Configure permission overrides for")} <strong>{user.email}</strong>
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-2 py-4">
          <p className="text-sm text-muted-foreground mb-4">
            {t("superadmin.users.permissionsNote", "Override default role permissions. Checked items grant permission beyond the role default.")}
          </p>
          
          {/* Collapsible module tree */}
          <div className="border rounded-lg divide-y divide-border">
            {RBAC_MODULES.map((module) => {
              const subModules = getSubModulesForParent(module.id);
              const isExpanded = expandedModules.has(module.id);
              
              return (
                <div key={module.id}>
                  {/* Module header */}
                  <button
                    type="button"
                    onClick={() => onToggleModule(module.id)}
                    className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="font-medium">{module.label}</span>
                      {subModules.length > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {subModules.length} sub-modules
                        </Badge>
                      )}
                    </div>
                  </button>
                  
                  {/* Sub-modules list (collapsible) */}
                  {isExpanded && subModules.length > 0 && (
                    <div className="bg-muted/30 border-t border-border">
                      {subModules.map((sub) => {
                        const overrides = permissionOverrides[sub.id] || {};
                        return (
                          <div
                            key={sub.id}
                            className="flex items-center justify-between px-6 py-2 border-b border-border/50 last:border-0"
                          >
                            <div className="flex-1">
                              <p className="text-sm font-medium">{sub.label}</p>
                              <p className="text-xs text-muted-foreground">{sub.description}</p>
                            </div>
                            <div className="flex items-center gap-4">
                              {(["view", "create", "edit", "delete"] as const).map((perm) => (
                                <label key={perm} className="flex items-center gap-1 cursor-pointer">
                                  <Checkbox
                                    checked={overrides[perm] ?? false}
                                    onCheckedChange={() => onTogglePermission(sub.id, perm)}
                                  />
                                  <span className="text-xs capitalize">{perm}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  
                  {/* No sub-modules message */}
                  {isExpanded && subModules.length === 0 && (
                    <div className="bg-muted/30 border-t border-border px-6 py-3">
                      <p className="text-sm text-muted-foreground italic">
                        {t("superadmin.users.noSubModules", "No sub-modules for this module")}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-input"
            disabled={loading}
          >
            {t("common.cancel", "Cancel")}
          </Button>
          <Button
            onClick={onSave}
            disabled={loading}
            className="bg-primary text-primary-foreground"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 me-2 animate-spin" />
                {t("common.saving", "Saving...")}
              </>
            ) : (
              t("common.savePermissions", "Save Permissions")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
