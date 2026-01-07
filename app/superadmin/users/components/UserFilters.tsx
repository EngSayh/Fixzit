/**
 * User filters component for Superadmin Users list
 * @module app/superadmin/users/components/UserFilters
 */

"use client";

import React from "react";
import { useI18n } from "@/i18n/useI18n";
import { Search } from "@/components/ui/icons";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectItem } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { CANONICAL_ROLES } from "@/types/user";
import type { Organization, GroupByOption } from "./types";
import { USER_TYPES } from "./types";

interface UserFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  orgFilter: string;
  onOrgFilterChange: (value: string) => void;
  userTypeFilter: string;
  onUserTypeFilterChange: (value: string) => void;
  roleFilter: string;
  onRoleFilterChange: (value: string) => void;
  groupBy: GroupByOption;
  onGroupByChange: (value: GroupByOption) => void;
  showModuleAccess: boolean;
  onShowModuleAccessChange: (value: boolean) => void;
  organizations: Organization[];
}

export function UserFilters({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  orgFilter,
  onOrgFilterChange,
  userTypeFilter,
  onUserTypeFilterChange,
  roleFilter,
  onRoleFilterChange,
  groupBy,
  onGroupByChange,
  showModuleAccess,
  onShowModuleAccessChange,
  organizations,
}: UserFiltersProps) {
  const { t } = useI18n();

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-4">
        <div className="flex flex-col gap-4">
          {/* Search row */}
          <div className="relative flex-1">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by email, name, phone, or organization..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="ps-10 bg-muted border-input text-foreground placeholder:text-muted-foreground"
            />
          </div>
          
          {/* Filter row */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Select 
              value={statusFilter} 
              onValueChange={onStatusFilterChange}
              placeholder="Status"
              className="w-full sm:w-40 bg-muted border-input text-foreground"
            >
              <SelectItem value="all">{t("superadmin.users.allStatus", "All Status")}</SelectItem>
              <SelectItem value="ACTIVE">{t("common.status.active", "Active")}</SelectItem>
              <SelectItem value="PENDING">{t("common.status.pending", "Pending")}</SelectItem>
              <SelectItem value="INACTIVE">{t("common.status.inactive", "Inactive")}</SelectItem>
              <SelectItem value="SUSPENDED">{t("common.status.suspended", "Suspended")}</SelectItem>
            </Select>
            
            <Select 
              value={orgFilter} 
              onValueChange={onOrgFilterChange}
              placeholder="Organization"
              className="w-full sm:w-48 bg-muted border-input text-foreground"
            >
              <SelectItem value="all">{t("superadmin.users.allOrganizations", "All Organizations")}</SelectItem>
              {organizations.map((org, idx) => (
                <SelectItem key={org._id || `org-${idx}`} value={org._id || `org-${idx}`}>
                  {org.name}
                </SelectItem>
              ))}
            </Select>
            
            <Select 
              value={userTypeFilter} 
              onValueChange={onUserTypeFilterChange}
              placeholder="User Type"
              className="w-full sm:w-40 bg-muted border-input text-foreground"
            >
              {USER_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </Select>
            
            <Select 
              value={roleFilter} 
              onValueChange={onRoleFilterChange}
              placeholder="Role"
              className="w-full sm:w-44 bg-muted border-input text-foreground"
            >
              <SelectItem value="all">{t("superadmin.users.allRoles", "All Roles")}</SelectItem>
              {CANONICAL_ROLES.map((role) => (
                <SelectItem key={role} value={role}>
                  {role.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}
                </SelectItem>
              ))}
            </Select>
          </div>
          
          {/* Group By & Display Options */}
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center border-t border-border pt-4">
            <div className="flex items-center gap-2">
              <Label className="text-sm text-muted-foreground whitespace-nowrap">Group By:</Label>
              <Select 
                value={groupBy} 
                onValueChange={(v) => onGroupByChange(v as GroupByOption)}
                placeholder="Group By"
                className="w-40 bg-muted border-input text-foreground"
              >
                <SelectItem value="none">No Grouping</SelectItem>
                <SelectItem value="organization">Organization</SelectItem>
                <SelectItem value="role">Role</SelectItem>
                <SelectItem value="status">Status</SelectItem>
              </Select>
            </div>
            
            <div className="flex items-center gap-2 ms-0 sm:ms-4">
              <Checkbox
                id="showModuleAccess"
                checked={showModuleAccess}
                onCheckedChange={(checked) => onShowModuleAccessChange(checked === true)}
                className="border-input data-[state=checked]:bg-blue-600"
              />
              <Label 
                htmlFor="showModuleAccess" 
                className="text-sm text-muted-foreground cursor-pointer"
              >
                Show Module Access
              </Label>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
