"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { CardGridSkeleton } from "@/components/skeletons";
import { useAutoTranslator } from "@/i18n/useAutoTranslator";
import ModuleViewTabs from "@/components/fm/ModuleViewTabs";
import { Shield, Plus } from "@/components/ui/icons";
import { useFmOrgGuard } from "@/hooks/fm/useFmOrgGuard";

const PERMISSIONS = [
  { id: "users:read", label: "View Users", category: "users" },
  { id: "users:write", label: "Manage Users", category: "users" },
  { id: "roles:read", label: "View Roles", category: "roles" },
  { id: "roles:write", label: "Manage Roles", category: "roles" },
  { id: "workorders:read", label: "View Work Orders", category: "workorders" },
  {
    id: "workorders:write",
    label: "Manage Work Orders",
    category: "workorders",
  },
  { id: "properties:read", label: "View Properties", category: "properties" },
  {
    id: "properties:write",
    label: "Manage Properties",
    category: "properties",
  },
  { id: "finance:read", label: "View Finance", category: "finance" },
  { id: "finance:write", label: "Manage Finance", category: "finance" },
  { id: "reports:read", label: "View Reports", category: "reports" },
  { id: "reports:write", label: "Generate Reports", category: "reports" },
];

export default function NewRolePage() {
  const auto = useAutoTranslator("fm.system.roles.new");
  const { data: session } = useSession();
  const { hasOrgContext, guard, orgId, supportBanner } = useFmOrgGuard({
    moduleId: "system",
  });
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [permissions, setPermissions] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  if (!session) {
    return <CardGridSkeleton count={1} />;
  }

  if (!hasOrgContext || !orgId) {
    return guard;
  }

  const handlePermissionToggle = (permissionId: string) => {
    setPermissions((prev) =>
      prev.includes(permissionId)
        ? prev.filter((p) => p !== permissionId)
        : [...prev, permissionId],
    );
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    const toastId = toast.loading(auto("Creating role...", "toast.loading"));

    try {
      const res = await fetch("/api/fm/system/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId,
          name,
          description,
          permissions,
        }),
      });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || "Failed to create role");
      }
      toast.success(auto("Role created successfully", "toast.success"), {
        id: toastId,
      });
      setName("");
      setDescription("");
      setPermissions([]);
    } catch (_error) {
      toast.error(auto("Failed to create role", "toast.error"), {
        id: toastId,
      });
    } finally {
      setCreating(false);
    }
  };

  const permissionsByCategory = PERMISSIONS.reduce(
    (acc, perm) => {
      if (!acc[perm.category]) acc[perm.category] = [];
      acc[perm.category].push(perm);
      return acc;
    },
    {} as Record<string, (typeof PERMISSIONS)[number][]>,
  );

  return (
    <div className="space-y-6">
      <ModuleViewTabs moduleId="system" />
      {supportBanner}

      <div>
        <div className="flex items-center gap-2">
          <Shield className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">
            {auto("Create Role", "header.title")}
          </h1>
        </div>
        <p className="text-muted-foreground">
          {auto("Define a new role with custom permissions", "header.subtitle")}
        </p>
      </div>

      <div className="max-w-3xl">
        <form onSubmit={handleCreate} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{auto("Role Details", "details.title")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">{auto("Role Name", "fields.name")}</Label>
                <Input
                  id="name"
                  placeholder={auto(
                    "e.g. Property Manager",
                    "fields.namePlaceholder",
                  )}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">
                  {auto("Description", "fields.description")}
                </Label>
                <Textarea
                  id="description"
                  placeholder={auto(
                    "Describe the role responsibilities...",
                    "fields.descriptionPlaceholder",
                  )}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{auto("Permissions", "permissions.title")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {Object.entries(permissionsByCategory).map(
                  ([category, perms]) => (
                    <div key={category}>
                      <h3 className="font-semibold mb-3 capitalize">
                        {auto(category, `categories.${category}`)}
                      </h3>
                      <div className="space-y-2 ms-4">
                        {perms.map((perm) => (
                          <div
                            key={perm.id}
                            className="flex items-center space-x-2"
                          >
                            <Checkbox
                              id={perm.id}
                              checked={permissions.includes(perm.id)}
                              onCheckedChange={() =>
                                handlePermissionToggle(perm.id)
                              }
                            />
                            <Label htmlFor={perm.id} className="cursor-pointer">
                              {auto(perm.label, `permissions.${perm.id}`)}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  ),
                )}
              </div>
            </CardContent>
          </Card>

          <Button
            type="submit"
            disabled={creating || !name || permissions.length === 0}
            className="w-full"
            aria-label={auto("Create Role", "submitAria")}
          >
            <Plus className="w-4 h-4 me-2" />
            {auto("Create Role", "submit")}
          </Button>
        </form>

        <div className="mt-6 p-4 border border-dashed border-border rounded-lg">
          <p className="text-sm text-muted-foreground">
            {auto("Roles will be created via /api/roles", "info.apiEndpoint")}
          </p>
        </div>
      </div>
    </div>
  );
}
