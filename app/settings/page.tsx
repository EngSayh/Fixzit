'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Bell, Lock, User, Palette } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';

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

  // ✅ i18n FIX: Use explicit key mapping instead of template literal
  const notificationKeyMap: Record<string, string> = {
    email: 'settings.notifications.email',
    sms: 'settings.notifications.sms',
    push: 'settings.notifications.push',
    workOrders: 'settings.notifications.workOrders',
    maintenance: 'settings.notifications.maintenance',
    reports: 'settings.notifications.reports'
  };

  return (
    <div className="min-h-screen bg-muted dark:bg-neutral-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground dark:text-white">{t('nav.settings', 'Settings')}</h1>
          <p className="mt-2 text-muted-foreground dark:text-muted-foreground">
            {t('settings.subtitle', 'Manage your account settings and preferences')}
          </p>
        </div>

        <Tabs defaultValue="profile" className="space-y-4">
          <TabsList>
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              {t('settings.tabs.profile', 'Profile')}
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Lock className="h-4 w-4" />
              {t('settings.tabs.security', 'Security')}
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              {t('settings.tabs.notifications', 'Notifications')}
            </TabsTrigger>
            <TabsTrigger value="preferences" className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              {t('settings.tabs.preferences', 'Preferences')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>{t('settings.profile.title', 'Profile Information')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">{t('settings.profile.firstName', 'First Name')}</Label>
                    <Input id="firstName" defaultValue="System" />
                  </div>
                  <div>
                    <Label htmlFor="lastName">{t('settings.profile.lastName', 'Last Name')}</Label>
                    <Input id="lastName" defaultValue="Administrator" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="email">{t('settings.profile.email', 'Email')}</Label>
                  <Input id="email" type="email" defaultValue="admin@fixzit.co" />
                </div>
                <div>
                  <Label htmlFor="phone">{t('settings.profile.phone', 'Phone')}</Label>
                  <Input id="phone" defaultValue="+966 50 123 4567" />
                </div>
                <div>
                  <Label htmlFor="department">{t('settings.profile.department', 'Department')}</Label>
                  <Input id="department" defaultValue="IT" />
                </div>
                <Button>{t('settings.profile.save', 'Save Changes')}</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle>{t('settings.security.title', 'Security Settings')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="currentPassword">{t('settings.security.currentPassword', 'Current Password')}</Label>
                  <Input id="currentPassword" type="password" />
                </div>
                <div>
                  <Label htmlFor="newPassword">{t('settings.security.newPassword', 'New Password')}</Label>
                  <Input id="newPassword" type="password" />
                </div>
                <div>
                  <Label htmlFor="confirmPassword">{t('settings.security.confirmPassword', 'Confirm Password')}</Label>
                  <Input id="confirmPassword" type="password" />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>{t('settings.security.twoFactor', 'Two-Factor Authentication')}</Label>
                    <p className="text-sm text-muted-foreground">
                      {t('settings.security.twoFactorDesc', 'Add an extra layer of security to your account')}
                    </p>
                  </div>
                  <Switch />
                </div>
                <Button>{t('settings.security.updatePassword', 'Update Password')}</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>{t('settings.notifications.title', 'Notification Preferences')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(notifications).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between">
                    <Label htmlFor={key} className="capitalize">
                      {t(notificationKeyMap[key] || `settings.notifications.${key}`, key.replace(/([A-Z])/g, ' $1').trim())}
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
                <Button>{t('settings.notifications.save', 'Save Preferences')}</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preferences">
            <Card>
              <CardHeader>
                <CardTitle>{t('settings.preferences.title', 'App Preferences')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="language">{t('settings.preferences.language', 'Language')}</Label>
                  <Select defaultValue="ar">
                    <SelectTrigger id="language">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">{t('settings.preferences.english', 'English')}</SelectItem>
                      <SelectItem value="ar">{t('settings.preferences.arabic', 'العربية')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="timezone">{t('settings.preferences.timezone', 'Timezone')}</Label>
                  <Select defaultValue="Asia/Riyadh">
                    <SelectTrigger id="timezone">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Asia/Riyadh">{t('settings.preferences.riyadh', 'Asia/Riyadh (GMT+3)')}</SelectItem>
                      <SelectItem value="UTC">{t('settings.preferences.utc', 'UTC')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="theme">{t('settings.preferences.theme', 'Theme')}</Label>
                  <Select defaultValue="light">
                    <SelectTrigger id="theme">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">{t('settings.preferences.light', 'Light')}</SelectItem>
                      <SelectItem value="dark">{t('settings.preferences.dark', 'Dark')}</SelectItem>
                      <SelectItem value="system">{t('settings.preferences.system', 'System')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button>{t('settings.preferences.save', 'Save Preferences')}</Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

