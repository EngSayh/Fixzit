"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { CardGridSkeleton } from "@/components/skeletons";
import { useAutoTranslator } from "@/i18n/useAutoTranslator";
import ModuleViewTabs from "@/components/fm/ModuleViewTabs";
import { Mail, UserPlus, Shield } from "@/components/ui/icons";
import { useFmOrgGuard } from "@/hooks/fm/useFmOrgGuard";

export default function InviteUserPage() {
  const auto = useAutoTranslator("fm.system.users.invite");
  const { data: session } = useSession();
  const { hasOrgContext, guard, orgId, supportBanner } = useFmOrgGuard({
    moduleId: "system",
  });
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState("");
  const [sending, setSending] = useState(false);

  if (!session) {
    return <CardGridSkeleton count={1} />;
  }

  if (!hasOrgContext || !orgId) {
    return guard;
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    const toastId = toast.loading(
      auto("Sending invitation...", "toast.loading"),
    );

    try {
      const res = await fetch("/api/fm/system/users/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId,
          email,
          firstName,
          lastName,
          role,
        }),
      });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || "Failed to send invitation");
      }
      toast.success(auto("Invitation sent successfully", "toast.success"), {
        id: toastId,
      });
      setEmail("");
      setFirstName("");
      setLastName("");
      setRole("");
    } catch (_error) {
      toast.error(auto("Failed to send invitation", "toast.error"), {
        id: toastId,
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <ModuleViewTabs moduleId="system" />
      {supportBanner}

      <div>
        <div className="flex items-center gap-2">
          <UserPlus className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">
            {auto("Invite User", "header.title")}
          </h1>
        </div>
        <p className="text-muted-foreground">
          {auto(
            "Send an email invitation to join the platform",
            "header.subtitle",
          )}
        </p>
      </div>

      <div className="max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              {auto("Invitation Details", "card.title")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleInvite} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName">
                    {auto("First Name", "fields.firstName")}
                  </Label>
                  <Input
                    id="firstName"
                    placeholder={auto("John", "fields.firstNamePlaceholder")}
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">
                    {auto("Last Name", "fields.lastName")}
                  </Label>
                  <Input
                    id="lastName"
                    placeholder={auto("Doe", "fields.lastNamePlaceholder")}
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">
                  {auto("Email Address", "fields.email")}
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={auto(
                    "user@example.com",
                    "fields.emailPlaceholder",
                  )}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role" className="flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  {auto("Role", "fields.role")}
                </Label>
                <Select value={role} onValueChange={setRole} placeholder={auto(
                        "Select a role...",
                        "fields.rolePlaceholder",
                      )}>
                  <SelectTrigger id="role">
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">
                      {auto("Administrator", "roles.admin")}
                    </SelectItem>
                    <SelectItem value="manager">
                      {auto("Manager", "roles.manager")}
                    </SelectItem>
                    <SelectItem value="technician">
                      {auto("Technician", "roles.technician")}
                    </SelectItem>
                    <SelectItem value="viewer">
                      {auto("Viewer", "roles.viewer")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="pt-4 border-t">
                <Button
                  type="submit"
                  disabled={
                    sending || !email || !firstName || !lastName || !role
                  }
                  className="w-full"
                  aria-label={auto("Send Invitation", "submitAria")}
                >
                  <Mail className="w-4 h-4 me-2" />
                  {auto("Send Invitation", "submit")}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="mt-6 p-4 border border-dashed border-border rounded-lg">
          <p className="text-sm text-muted-foreground">
            {auto(
              "User invitations will be sent via /api/users/invite",
              "info.apiEndpoint",
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
