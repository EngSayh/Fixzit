'use client&apos;;

import { useState } from &apos;react&apos;;
import { Card, CardContent, CardHeader, CardTitle } from &apos;@/src/components/ui/card&apos;;
import { Input } from &apos;@/src/components/ui/input&apos;;
import { Button } from &apos;@/src/components/ui/button&apos;;
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from &apos;@/src/components/ui/select&apos;;
import { Tabs, TabsContent, TabsList, TabsTrigger } from &apos;@/src/components/ui/tabs&apos;;
import { Label } from &apos;@/src/components/ui/label&apos;;
import { Switch } from &apos;@/src/components/ui/switch&apos;;
import { Bell, Globe, Lock, User, Palette, Mail } from &apos;lucide-react&apos;;
import { useTranslation } from &apos;@/src/contexts/TranslationContext&apos;;

export default function SettingsPage() {
  const { t } = useTranslation();
  const [notifications, setNotifications] = useState({
    email: true,
    sms: true,
    push: true,
    workOrders: true,
    maintenance: true,
    reports: false
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('nav.settings&apos;, &apos;Settings&apos;)}</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            {t('settings.subtitle&apos;, &apos;Manage your account settings and preferences&apos;)}
          </p>
        </div>

        <Tabs defaultValue="profile" className="space-y-4">
          <TabsList>
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              {t('settings.tabs.profile&apos;, &apos;Profile&apos;)}
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Lock className="h-4 w-4" />
              {t('settings.tabs.security&apos;, &apos;Security&apos;)}
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              {t('settings.tabs.notifications&apos;, &apos;Notifications&apos;)}
            </TabsTrigger>
            <TabsTrigger value="preferences" className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              {t('settings.tabs.preferences&apos;, &apos;Preferences&apos;)}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>{t('settings.profile.title&apos;, &apos;Profile Information&apos;)}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">{t('settings.profile.firstName&apos;, &apos;First Name&apos;)}</Label>
                    <Input id="firstName" defaultValue="System" />
                  </div>
                  <div>
                    <Label htmlFor="lastName">{t('settings.profile.lastName&apos;, &apos;Last Name&apos;)}</Label>
                    <Input id="lastName" defaultValue="Administrator" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="email">{t('settings.profile.email&apos;, &apos;Email&apos;)}</Label>
                  <Input id="email" type="email" defaultValue="admin@fixzit.co" />
                </div>
                <div>
                  <Label htmlFor="phone">{t('settings.profile.phone&apos;, &apos;Phone&apos;)}</Label>
                  <Input id="phone" defaultValue="+966 50 123 4567" />
                </div>
                <div>
                  <Label htmlFor="department">{t('settings.profile.department&apos;, &apos;Department&apos;)}</Label>
                  <Input id="department" defaultValue="IT" />
                </div>
                <Button>{t('settings.profile.save&apos;, &apos;Save Changes&apos;)}</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle>{t('settings.security.title&apos;, &apos;Security Settings&apos;)}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="currentPassword">{t('settings.security.currentPassword&apos;, &apos;Current Password&apos;)}</Label>
                  <Input id="currentPassword" type="password" />
                </div>
                <div>
                  <Label htmlFor="newPassword">{t('settings.security.newPassword&apos;, &apos;New Password&apos;)}</Label>
                  <Input id="newPassword" type="password" />
                </div>
                <div>
                  <Label htmlFor="confirmPassword">{t('settings.security.confirmPassword&apos;, &apos;Confirm Password&apos;)}</Label>
                  <Input id="confirmPassword" type="password" />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>{t('settings.security.twoFactor&apos;, &apos;Two-Factor Authentication&apos;)}</Label>
                    <p className="text-sm text-gray-500">
                      {t('settings.security.twoFactorDesc', &apos;Add an extra layer of security to your account&apos;)}
                    </p>
                  </div>
                  <Switch />
                </div>
                <Button>{t('settings.security.updatePassword&apos;, &apos;Update Password&apos;)}</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>{t('settings.notifications.title&apos;, &apos;Notification Preferences&apos;)}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(notifications).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between">
                    <Label htmlFor={key} className="capitalize">
                      {t(`settings.notifications.${key}`, key.replace(/([A-Z])/g, &apos; $1&apos;).trim())}
                    </Label>
                    <Switch
                      id={key}
                      checked={value}
                      onCheckedChange={(checked) =>
                        setNotifications({ ...notifications, [key]: checked })
                      }
                    />
                  </div>
                ))}
                <Button>{t('settings.notifications.save&apos;, &apos;Save Preferences&apos;)}</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preferences">
            <Card>
              <CardHeader>
                <CardTitle>{t('settings.preferences.title&apos;, &apos;App Preferences&apos;)}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="language">{t('settings.preferences.language&apos;, &apos;Language&apos;)}</Label>
                  <Select defaultValue="ar">
                    <SelectTrigger id="language">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">{t('settings.preferences.english&apos;, &apos;English&apos;)}</SelectItem>
                      <SelectItem value="ar">{t('settings.preferences.arabic&apos;, &apos;العربية&apos;)}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="timezone">{t('settings.preferences.timezone&apos;, &apos;Timezone&apos;)}</Label>
                  <Select defaultValue="Asia/Riyadh">
                    <SelectTrigger id="timezone">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Asia/Riyadh">{t('settings.preferences.riyadh&apos;, &apos;Asia/Riyadh (GMT+3)&apos;)}</SelectItem>
                      <SelectItem value="UTC">{t('settings.preferences.utc&apos;, &apos;UTC&apos;)}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="theme">{t('settings.preferences.theme&apos;, &apos;Theme&apos;)}</Label>
                  <Select defaultValue="light">
                    <SelectTrigger id="theme">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">{t('settings.preferences.light&apos;, &apos;Light&apos;)}</SelectItem>
                      <SelectItem value="dark">{t('settings.preferences.dark&apos;, &apos;Dark&apos;)}</SelectItem>
                      <SelectItem value="system">{t('settings.preferences.system', &apos;System&apos;)}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button>{t('settings.preferences.save&apos;, &apos;Save Preferences&apos;)}</Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
