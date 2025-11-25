"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { User, Settings, Shield, Bell } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { useTranslation } from "@/contexts/TranslationContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

import { logger } from "@/lib/logger";
type TabType = "account" | "notifications" | "security";

interface UserData {
  name: string;
  email: string;
  phone: string;
  role: string;
  joinDate: string;
}

interface NotificationSettings {
  emailNotifications: boolean;
  pushNotifications: boolean;
  smsNotifications: boolean;
  workOrderUpdates: boolean;
  maintenanceAlerts: boolean;
  invoiceReminders: boolean;
}

interface SecuritySettings {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  twoFactorEnabled: boolean;
}

export default function ProfilePage() {
  const { t, isRTL } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabType>("account");
  const [loading, setLoading] = useState(true);

  // Original data for reset functionality
  const [originalUser, setOriginalUser] = useState<UserData>({
    name: "",
    email: "",
    phone: "",
    role: "",
    joinDate: "",
  });

  const [user, setUser] = useState<UserData>({
    name: "",
    email: "",
    phone: "",
    role: "",
    joinDate: "",
  });

  const [notificationSettings, setNotificationSettings] =
    useState<NotificationSettings>({
      emailNotifications: true,
      pushNotifications: false,
      smsNotifications: false,
      workOrderUpdates: true,
      maintenanceAlerts: true,
      invoiceReminders: false,
    });

  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
    twoFactorEnabled: false,
  });

  // Fetch user profile data on mount
  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/user/profile", {
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch profile data");
        }

        const data = await response.json();

        if (data.user) {
          const userData: UserData = {
            name: data.user.name || "Admin User",
            email: data.user.email || "admin@fixzit.co",
            phone: data.user.phone || "",
            role: data.user.role || "Administrator",
            joinDate: data.user.joinDate || "January 2024",
          };
          setUser(userData);
          setOriginalUser(userData);
        }

        if (data.notificationSettings) {
          setNotificationSettings(data.notificationSettings);
        }

        if (data.securitySettings) {
          setSecuritySettings((prev) => ({
            ...prev,
            twoFactorEnabled: data.securitySettings.twoFactorEnabled || false,
          }));
        }
      } catch (error) {
        logger.error("Error fetching profile:", error);
        toast.error(
          t("profile.toast.loadError", "Failed to load profile data"),
        );
        // Set default values on error
        const defaultUser: UserData = {
          name: "Admin User",
          email: "admin@fixzit.co",
          phone: "",
          role: "Administrator",
          joinDate: "January 2024",
        };
        setUser(defaultUser);
        setOriginalUser(defaultUser);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [t]);

  const handleSaveAccount = async () => {
    try {
      const response = await fetch("/api/user/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: user.name,
          email: user.email,
          phone: user.phone,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update account");
      }

      const _result = await response.json(); // Acknowledge server response

      // Update original user data after successful save
      setOriginalUser(user);

      toast.success(
        t("profile.toast.accountSaved", "Account settings saved successfully!"),
      );
    } catch (error) {
      logger.error("Error saving account:", error);
      toast.error(
        t("profile.toast.accountError", "Failed to save account settings"),
      );
    }
  };

  const handleCancelAccount = () => {
    // Reset to originally fetched data
    setUser(originalUser);
    toast.success(t("profile.toast.changesCancelled", "Changes cancelled"));
  };

  const handleSaveNotifications = async () => {
    try {
      const response = await fetch("/api/user/notifications", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(notificationSettings),
      });

      if (!response.ok) {
        throw new Error("Failed to update notifications");
      }

      toast.success(
        t(
          "profile.toast.notificationsSaved",
          "Notification preferences updated!",
        ),
      );
    } catch (error) {
      logger.error("Error saving notifications:", error);
      toast.error(
        t("profile.toast.notificationsError", "Failed to update notifications"),
      );
    }
  };

  const handleSaveSecurity = async () => {
    if (securitySettings.newPassword !== securitySettings.confirmPassword) {
      toast.error(
        t("profile.toast.passwordMismatch", "Passwords do not match"),
      );
      return;
    }

    if (
      securitySettings.newPassword &&
      securitySettings.newPassword.length < 8
    ) {
      toast.error(
        t(
          "profile.toast.passwordTooShort",
          "Password must be at least 8 characters",
        ),
      );
      return;
    }

    try {
      const response = await fetch("/api/user/security", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword: securitySettings.currentPassword,
          newPassword: securitySettings.newPassword,
          twoFactorEnabled: securitySettings.twoFactorEnabled,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || "Failed to update security settings",
        );
      }

      toast.success(
        t("profile.toast.securitySaved", "Security settings updated!"),
      );

      // Clear password fields after successful update
      setSecuritySettings({
        ...securitySettings,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error) {
      logger.error("Error saving security:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : t(
              "profile.toast.securityError",
              "Failed to update security settings",
            ),
      );
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8" dir={isRTL ? "rtl" : "ltr"}>
      <Toaster position="top-right" />

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground mb-2">
          {t("profile.title", "My Profile")}
        </h1>
        <p className="text-muted-foreground">
          {t(
            "profile.subtitle",
            "Manage your account settings and preferences",
          )}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="lg:col-span-1">
          <div className="bg-card text-card-foreground rounded-2xl shadow-md p-6">
            {loading ? (
              <div className="text-center py-8">
                <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                  <User size={32} className="text-muted-foreground" />
                </div>
                <div className="h-6 bg-muted rounded w-3/4 mx-auto mb-2 animate-pulse"></div>
                <div className="h-4 bg-muted rounded w-1/2 mx-auto mb-4 animate-pulse"></div>
                <div className="h-6 bg-muted rounded w-24 mx-auto animate-pulse"></div>
              </div>
            ) : (
              <div className="text-center">
                <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                  <User size={32} className="text-white" />
                </div>
                <h2 className="text-xl font-semibold text-foreground">
                  {user.name}
                </h2>
                <p className="text-muted-foreground">{user.email}</p>
                <span className="inline-block mt-2 px-3 py-1 bg-success text-white text-sm rounded-full">
                  {user.role}
                </span>
              </div>
            )}

            <div className="mt-6 space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-sm text-muted-foreground">
                  {t("profile.card.memberSince", "Member Since")}
                </span>
                <span className="text-sm font-medium">{user.joinDate}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-sm text-muted-foreground">
                  {t("profile.card.accountStatus", "Account Status")}
                </span>
                <span className="text-sm font-medium text-success">
                  {t("profile.card.active", "Active")}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Settings Tabs */}
        <div className="lg:col-span-2">
          <div className="bg-card text-card-foreground rounded-2xl shadow-md">
            <div className="border-b border-border">
              <div className="flex">
                <Button
                  variant="ghost"
                  onClick={() => setActiveTab("account")}
                  className={`px-6 py-3 text-sm font-medium transition-colors rounded-none ${
                    activeTab === "account"
                      ? "text-primary border-b-2 border-primary"
                      : "text-muted-foreground hover:text-foreground border-b-2 border-transparent"
                  }`}
                >
                  {t("profile.tabs.account")}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setActiveTab("notifications")}
                  className={`px-6 py-3 text-sm font-medium transition-colors rounded-none ${
                    activeTab === "notifications"
                      ? "text-primary border-b-2 border-primary"
                      : "text-muted-foreground hover:text-foreground border-b-2 border-transparent"
                  }`}
                >
                  {t("profile.tabs.notifications")}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setActiveTab("security")}
                  className={`px-6 py-3 text-sm font-medium transition-colors rounded-none ${
                    activeTab === "security"
                      ? "text-primary border-b-2 border-primary"
                      : "text-muted-foreground hover:text-foreground border-b-2 border-transparent"
                  }`}
                >
                  {t("profile.tabs.security")}
                </Button>
              </div>
            </div>

            <div className="p-6">
              {/* Account Settings Tab */}
              {activeTab === "account" && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">
                      {t("profile.account.fullName")}
                    </Label>
                    <Input
                      id="fullName"
                      type="text"
                      value={user.name}
                      onChange={(e) =>
                        setUser({ ...user, name: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">{t("profile.account.email")}</Label>
                    <Input
                      id="email"
                      type="email"
                      value={user.email}
                      onChange={(e) =>
                        setUser({ ...user, email: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">{t("profile.account.phone")}</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={user.phone}
                      onChange={(e) =>
                        setUser({ ...user, phone: e.target.value })
                      }
                      placeholder="+966 50 123 4567"
                    />
                  </div>

                  <div className="flex justify-end gap-3">
                    <Button variant="outline" onClick={handleCancelAccount}>
                      {t("profile.account.cancel")}
                    </Button>
                    <Button onClick={handleSaveAccount} disabled={loading}>
                      {t("profile.account.save")}
                    </Button>
                  </div>
                </div>
              )}

              {/* Notifications Tab */}
              {activeTab === "notifications" && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-foreground mb-4">
                      {t("profile.notifications.channels")}
                    </h3>
                    <div className="space-y-3">
                      <Label
                        htmlFor="email-notifications"
                        className="flex cursor-pointer items-center justify-between rounded-2xl border border-border p-3 hover:bg-muted"
                      >
                        <span className="text-sm font-medium">
                          {t("profile.notifications.email")}
                        </span>
                        <Switch
                          id="email-notifications"
                          checked={notificationSettings.emailNotifications}
                          onCheckedChange={(checked) =>
                            setNotificationSettings({
                              ...notificationSettings,
                              emailNotifications: checked,
                            })
                          }
                          aria-label={t("profile.notifications.email")}
                        />
                      </Label>
                      <Label
                        htmlFor="push-notifications"
                        className="flex cursor-pointer items-center justify-between rounded-2xl border border-border p-3 hover:bg-muted"
                      >
                        <span className="text-sm font-medium">
                          {t("profile.notifications.push")}
                        </span>
                        <Switch
                          id="push-notifications"
                          checked={notificationSettings.pushNotifications}
                          onCheckedChange={(checked) =>
                            setNotificationSettings({
                              ...notificationSettings,
                              pushNotifications: checked,
                            })
                          }
                          aria-label={t("profile.notifications.push")}
                        />
                      </Label>
                      <Label
                        htmlFor="sms-notifications"
                        className="flex cursor-pointer items-center justify-between rounded-2xl border border-border p-3 hover:bg-muted"
                      >
                        <span className="text-sm font-medium">
                          {t("profile.notifications.sms")}
                        </span>
                        <Switch
                          id="sms-notifications"
                          checked={notificationSettings.smsNotifications}
                          onCheckedChange={(checked) =>
                            setNotificationSettings({
                              ...notificationSettings,
                              smsNotifications: checked,
                            })
                          }
                          aria-label={t("profile.notifications.sms")}
                        />
                      </Label>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-foreground mb-4">
                      {t("profile.notifications.events")}
                    </h3>
                    <div className="space-y-3">
                      <Label
                        htmlFor="work-order-updates"
                        className="flex cursor-pointer items-center justify-between rounded-2xl border border-border p-3 hover:bg-muted"
                      >
                        <span className="text-sm font-medium">
                          {t("profile.notifications.workOrders")}
                        </span>
                        <Switch
                          id="work-order-updates"
                          checked={notificationSettings.workOrderUpdates}
                          onCheckedChange={(checked) =>
                            setNotificationSettings({
                              ...notificationSettings,
                              workOrderUpdates: checked,
                            })
                          }
                          aria-label={t("profile.notifications.workOrders")}
                        />
                      </Label>
                      <Label
                        htmlFor="maintenance-alerts"
                        className="flex cursor-pointer items-center justify-between rounded-2xl border border-border p-3 hover:bg-muted"
                      >
                        <span className="text-sm font-medium">
                          {t("profile.notifications.maintenance")}
                        </span>
                        <Switch
                          id="maintenance-alerts"
                          checked={notificationSettings.maintenanceAlerts}
                          onCheckedChange={(checked) =>
                            setNotificationSettings({
                              ...notificationSettings,
                              maintenanceAlerts: checked,
                            })
                          }
                          aria-label={t("profile.notifications.maintenance")}
                        />
                      </Label>
                      <Label
                        htmlFor="invoice-reminders"
                        className="flex cursor-pointer items-center justify-between rounded-2xl border border-border p-3 hover:bg-muted"
                      >
                        <span className="text-sm font-medium">
                          {t("profile.notifications.invoices")}
                        </span>
                        <Switch
                          id="invoice-reminders"
                          checked={notificationSettings.invoiceReminders}
                          onCheckedChange={(checked) =>
                            setNotificationSettings({
                              ...notificationSettings,
                              invoiceReminders: checked,
                            })
                          }
                          aria-label={t("profile.notifications.invoices")}
                        />
                      </Label>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={handleSaveNotifications}>
                      {t("profile.notifications.save")}
                    </Button>
                  </div>
                </div>
              )}

              {/* Security Tab */}
              {activeTab === "security" && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-foreground mb-4">
                      {t("profile.security.changePassword")}
                    </h3>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="current-password">
                          {t("profile.security.currentPassword")}
                        </Label>
                        <Input
                          id="current-password"
                          type="password"
                          value={securitySettings.currentPassword}
                          onChange={(e) =>
                            setSecuritySettings({
                              ...securitySettings,
                              currentPassword: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="new-password">
                          {t("profile.security.newPassword")}
                        </Label>
                        <Input
                          id="new-password"
                          type="password"
                          value={securitySettings.newPassword}
                          onChange={(e) =>
                            setSecuritySettings({
                              ...securitySettings,
                              newPassword: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirm-password">
                          {t("profile.security.confirmPassword")}
                        </Label>
                        <Input
                          id="confirm-password"
                          type="password"
                          value={securitySettings.confirmPassword}
                          onChange={(e) =>
                            setSecuritySettings({
                              ...securitySettings,
                              confirmPassword: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-foreground mb-4">
                      {t("profile.security.twoFactor")}
                    </h3>
                    <div className="flex items-center justify-between p-4 border border-border rounded-2xl">
                      <div className="space-y-0.5">
                        <Label
                          htmlFor="two-factor-auth"
                          className="text-sm font-medium cursor-pointer"
                        >
                          {t("profile.security.enable2FA")}
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          {t("profile.security.2FADesc")}
                        </p>
                      </div>
                      <Switch
                        id="two-factor-auth"
                        checked={securitySettings.twoFactorEnabled}
                        onCheckedChange={(checked) =>
                          setSecuritySettings({
                            ...securitySettings,
                            twoFactorEnabled: checked,
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={handleSaveSecurity}>
                      {t("profile.security.update")}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          {t("profile.quickActions.title", "Quick Actions")}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/settings"
            className="bg-card text-card-foreground p-4 rounded-2xl shadow-md hover:shadow-lg transition-shadow"
          >
            <Settings className="h-6 w-6 text-primary mb-2" />
            <h3 className="font-medium text-foreground">
              {t("profile.quickActions.system", "System Settings")}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t(
                "profile.quickActions.systemDesc",
                "Configure application preferences",
              )}
            </p>
          </Link>

          <Link
            href="/notifications"
            className="bg-card text-card-foreground p-4 rounded-2xl shadow-md hover:shadow-lg transition-shadow"
          >
            <Bell className="h-6 w-6 text-success mb-2" />
            <h3 className="font-medium text-foreground">
              {t("profile.quickActions.notifications", "Notification Settings")}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t(
                "profile.quickActions.notificationsDesc",
                "Manage alerts and notifications",
              )}
            </p>
          </Link>

          <Link
            href="/security"
            className="bg-card text-card-foreground p-4 rounded-2xl shadow-md hover:shadow-lg transition-shadow"
          >
            <Shield className="h-6 w-6 text-accent mb-2" />
            <h3 className="font-medium text-foreground">
              {t("profile.quickActions.security", "Security Settings")}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t(
                "profile.quickActions.securityDesc",
                "Password and access management",
              )}
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}
