'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { User, Settings, Shield, Bell } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { useTranslation } from '@/contexts/TranslationContext';

type TabType = 'account' | 'notifications' | 'security';

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
  const [activeTab, setActiveTab] = useState<TabType>('account');
  const [loading, setLoading] = useState(true);
  
  // Original data for reset functionality
  const [originalUser, setOriginalUser] = useState<UserData>({
    name: '',
    email: '',
    phone: '',
    role: '',
    joinDate: ''
  });

  const [user, setUser] = useState<UserData>({
    name: '',
    email: '',
    phone: '',
    role: '',
    joinDate: ''
  });

  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    emailNotifications: true,
    pushNotifications: false,
    smsNotifications: false,
    workOrderUpdates: true,
    maintenanceAlerts: true,
    invoiceReminders: false
  });

  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    twoFactorEnabled: false
  });

  // Fetch user profile data on mount
  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/user/profile', {
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch profile data');
        }

        const data = await response.json();
        
        if (data.user) {
          const userData: UserData = {
            name: data.user.name || 'Admin User',
            email: data.user.email || 'admin@fixzit.co',
            phone: data.user.phone || '',
            role: data.user.role || 'Administrator',
            joinDate: data.user.joinDate || 'January 2024'
          };
          setUser(userData);
          setOriginalUser(userData);
        }

        if (data.notificationSettings) {
          setNotificationSettings(data.notificationSettings);
        }

        if (data.securitySettings) {
          setSecuritySettings(prev => ({
            ...prev,
            twoFactorEnabled: data.securitySettings.twoFactorEnabled || false
          }));
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        toast.error(t('profile.toast.loadError', 'Failed to load profile data'));
        // Set default values on error
        const defaultUser: UserData = {
          name: 'Admin User',
          email: 'admin@fixzit.co',
          phone: '',
          role: 'Administrator',
          joinDate: 'January 2024'
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
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: user.name,
          email: user.email,
          phone: user.phone
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update account');
      }

  await response.json();

  // Update original user data after successful save
      setOriginalUser(user);
      
      toast.success(t('profile.toast.accountSaved', 'Account settings saved successfully!'));
    } catch (error) {
      console.error('Error saving account:', error);
      toast.error(t('profile.toast.accountError', 'Failed to save account settings'));
    }
  };

  const handleCancelAccount = () => {
    // Reset to originally fetched data
    setUser(originalUser);
    toast.success(t('profile.toast.changesCancelled', 'Changes cancelled'));
  };

  const handleSaveNotifications = async () => {
    try {
      const response = await fetch('/api/user/notifications', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(notificationSettings),
      });

      if (!response.ok) {
        throw new Error('Failed to update notifications');
      }

      toast.success(t('profile.toast.notificationsSaved', 'Notification preferences updated!'));
    } catch (error) {
      console.error('Error saving notifications:', error);
      toast.error(t('profile.toast.notificationsError', 'Failed to update notifications'));
    }
  };

  const handleSaveSecurity = async () => {
    if (securitySettings.newPassword !== securitySettings.confirmPassword) {
      toast.error(t('profile.toast.passwordMismatch', 'Passwords do not match'));
      return;
    }

    if (securitySettings.newPassword && securitySettings.newPassword.length < 8) {
      toast.error(t('profile.toast.passwordTooShort', 'Password must be at least 8 characters'));
      return;
    }

    try {
      const response = await fetch('/api/user/security', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword: securitySettings.currentPassword,
          newPassword: securitySettings.newPassword,
          twoFactorEnabled: securitySettings.twoFactorEnabled
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update security settings');
      }

      toast.success(t('profile.toast.securitySaved', 'Security settings updated!'));
      
      // Clear password fields after successful update
      setSecuritySettings({
        ...securitySettings,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error) {
      console.error('Error saving security:', error);
      toast.error(
        error instanceof Error 
          ? error.message 
          : t('profile.toast.securityError', 'Failed to update security settings')
      );
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8" dir={isRTL ? 'rtl' : 'ltr'}>
      <Toaster position="top-right" />
      
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground mb-2">{t('profile.title', 'My Profile')}</h1>
        <p className="text-muted-foreground">{t('profile.subtitle', 'Manage your account settings and preferences')}</p>
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
                <h2 className="text-xl font-semibold text-foreground">{user.name}</h2>
                <p className="text-muted-foreground">{user.email}</p>
                <span className="inline-block mt-2 px-3 py-1 bg-success text-white text-sm rounded-full">
                  {user.role}
                </span>
              </div>
            )}

            <div className="mt-6 space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-sm text-muted-foreground">{t('profile.card.memberSince', 'Member Since')}</span>
                <span className="text-sm font-medium">{user.joinDate}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-sm text-muted-foreground">{t('profile.card.accountStatus', 'Account Status')}</span>
                <span className="text-sm font-medium text-green-600">{t('profile.card.active', 'Active')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Settings Tabs */}
        <div className="lg:col-span-2">
          <div className="bg-card text-card-foreground rounded-2xl shadow-md">
            <div className="border-b border-border">
              <div className="flex">
                <button
                  onClick={() => setActiveTab('account')}
                  className={`px-6 py-3 text-sm font-medium transition-colors ${
                    activeTab === 'account'
                      ? 'text-primary border-b-2 border-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {t('profile.tabs.account', 'Account Settings')}
                </button>
                <button
                  onClick={() => setActiveTab('notifications')}
                  className={`px-6 py-3 text-sm font-medium transition-colors ${
                    activeTab === 'notifications'
                      ? 'text-primary border-b-2 border-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {t('profile.tabs.notifications', 'Notifications')}
                </button>
                <button
                  onClick={() => setActiveTab('security')}
                  className={`px-6 py-3 text-sm font-medium transition-colors ${
                    activeTab === 'security'
                      ? 'text-primary border-b-2 border-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {t('profile.tabs.security', 'Security')}
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* Account Settings Tab */}
              {activeTab === 'account' && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      {t('profile.account.fullName', 'Full Name')}
                    </label>
                    <input
                      type="text"
                      value={user.name}
                      onChange={(e) => setUser({ ...user, name: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-foreground"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      {t('profile.account.email', 'Email Address')}
                    </label>
                    <input
                      type="email"
                      value={user.email}
                      onChange={(e) => setUser({ ...user, email: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-foreground"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      {t('profile.account.phone', 'Phone Number')}
                    </label>
                    <input
                      type="tel"
                      value={user.phone}
                      onChange={(e) => setUser({ ...user, phone: e.target.value })}
                      placeholder="+966 50 123 4567"
                      className="w-full px-3 py-2 border border-border rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-foreground"
                    />
                  </div>

                  <div className="flex justify-end gap-3">
                    <button
                      onClick={handleCancelAccount}
                      className="px-4 py-2 text-foreground border border-border rounded-2xl hover:bg-muted transition-colors"
                    >
                      {t('profile.account.cancel', 'Cancel')}
                    </button>
                    <button
                      onClick={handleSaveAccount}
                      disabled={loading}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-2xl hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                      {t('profile.account.save', 'Save Changes')}
                    </button>
                  </div>
                </div>
              )}

              {/* Notifications Tab */}
              {activeTab === 'notifications' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-foreground mb-4">{t('profile.notifications.channels', 'Notification Channels')}</h3>
                    <div className="space-y-3">
                      <label className="flex items-center justify-between p-3 border border-border rounded-2xl hover:bg-muted cursor-pointer">
                        <span className="text-sm font-medium text-foreground">{t('profile.notifications.email', 'Email Notifications')}</span>
                        <input
                          type="checkbox"
                          checked={notificationSettings.emailNotifications}
                          onChange={(e) => setNotificationSettings({
                            ...notificationSettings,
                            emailNotifications: e.target.checked
                          })}
                          className="w-4 h-4 text-primary focus:ring-primary rounded"
                        />
                      </label>
                      <label className="flex items-center justify-between p-3 border border-border rounded-2xl hover:bg-muted cursor-pointer">
                        <span className="text-sm font-medium text-foreground">{t('profile.notifications.push', 'Push Notifications')}</span>
                        <input
                          type="checkbox"
                          checked={notificationSettings.pushNotifications}
                          onChange={(e) => setNotificationSettings({
                            ...notificationSettings,
                            pushNotifications: e.target.checked
                          })}
                          className="w-4 h-4 text-primary focus:ring-primary rounded"
                        />
                      </label>
                      <label className="flex items-center justify-between p-3 border border-border rounded-2xl hover:bg-muted cursor-pointer">
                        <span className="text-sm font-medium text-foreground">{t('profile.notifications.sms', 'SMS Notifications')}</span>
                        <input
                          type="checkbox"
                          checked={notificationSettings.smsNotifications}
                          onChange={(e) => setNotificationSettings({
                            ...notificationSettings,
                            smsNotifications: e.target.checked
                          })}
                          className="w-4 h-4 text-primary focus:ring-primary rounded"
                        />
                      </label>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-foreground mb-4">{t('profile.notifications.events', 'Event Notifications')}</h3>
                    <div className="space-y-3">
                      <label className="flex items-center justify-between p-3 border border-border rounded-2xl hover:bg-muted cursor-pointer">
                        <span className="text-sm font-medium text-foreground">{t('profile.notifications.workOrders', 'Work Order Updates')}</span>
                        <input
                          type="checkbox"
                          checked={notificationSettings.workOrderUpdates}
                          onChange={(e) => setNotificationSettings({
                            ...notificationSettings,
                            workOrderUpdates: e.target.checked
                          })}
                          className="w-4 h-4 text-primary focus:ring-primary rounded"
                        />
                      </label>
                      <label className="flex items-center justify-between p-3 border border-border rounded-2xl hover:bg-muted cursor-pointer">
                        <span className="text-sm font-medium text-foreground">{t('profile.notifications.maintenance', 'Maintenance Alerts')}</span>
                        <input
                          type="checkbox"
                          checked={notificationSettings.maintenanceAlerts}
                          onChange={(e) => setNotificationSettings({
                            ...notificationSettings,
                            maintenanceAlerts: e.target.checked
                          })}
                          className="w-4 h-4 text-primary focus:ring-primary rounded"
                        />
                      </label>
                      <label className="flex items-center justify-between p-3 border border-border rounded-2xl hover:bg-muted cursor-pointer">
                        <span className="text-sm font-medium text-foreground">{t('profile.notifications.invoices', 'Invoice Reminders')}</span>
                        <input
                          type="checkbox"
                          checked={notificationSettings.invoiceReminders}
                          onChange={(e) => setNotificationSettings({
                            ...notificationSettings,
                            invoiceReminders: e.target.checked
                          })}
                          className="w-4 h-4 text-primary focus:ring-primary rounded"
                        />
                      </label>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={handleSaveNotifications}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-2xl hover:bg-primary/90 transition-colors"
                    >
                      {t('profile.notifications.save', 'Save Preferences')}
                    </button>
                  </div>
                </div>
              )}

              {/* Security Tab */}
              {activeTab === 'security' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-foreground mb-4">{t('profile.security.changePassword', 'Change Password')}</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          {t('profile.security.currentPassword', 'Current Password')}
                        </label>
                        <input
                          type="password"
                          value={securitySettings.currentPassword}
                          onChange={(e) => setSecuritySettings({
                            ...securitySettings,
                            currentPassword: e.target.value
                          })}
                          className="w-full px-3 py-2 border border-border rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-foreground"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          {t('profile.security.newPassword', 'New Password')}
                        </label>
                        <input
                          type="password"
                          value={securitySettings.newPassword}
                          onChange={(e) => setSecuritySettings({
                            ...securitySettings,
                            newPassword: e.target.value
                          })}
                          className="w-full px-3 py-2 border border-border rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-foreground"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          {t('profile.security.confirmPassword', 'Confirm New Password')}
                        </label>
                        <input
                          type="password"
                          value={securitySettings.confirmPassword}
                          onChange={(e) => setSecuritySettings({
                            ...securitySettings,
                            confirmPassword: e.target.value
                          })}
                          className="w-full px-3 py-2 border border-border rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-foreground"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-foreground mb-4">{t('profile.security.twoFactor', 'Two-Factor Authentication')}</h3>
                    <label className="flex items-center justify-between p-4 border border-border rounded-2xl hover:bg-muted cursor-pointer">
                      <div>
                        <span className="text-sm font-medium text-foreground block">{t('profile.security.enable2FA', 'Enable 2FA')}</span>
                        <span className="text-xs text-muted-foreground">{t('profile.security.2FADesc', 'Add an extra layer of security to your account')}</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={securitySettings.twoFactorEnabled}
                        onChange={(e) => setSecuritySettings({
                          ...securitySettings,
                          twoFactorEnabled: e.target.checked
                        })}
                        className="w-4 h-4 text-primary focus:ring-primary rounded"
                      />
                    </label>
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={handleSaveSecurity}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-2xl hover:bg-primary/90 transition-colors"
                    >
                      {t('profile.security.update', 'Update Security')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-foreground mb-4">{t('profile.quickActions.title', 'Quick Actions')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/settings" className="bg-card text-card-foreground p-4 rounded-2xl shadow-md hover:shadow-lg transition-shadow">
            <Settings className="h-6 w-6 text-primary mb-2" />
            <h3 className="font-medium text-foreground">{t('profile.quickActions.system', 'System Settings')}</h3>
            <p className="text-sm text-muted-foreground">{t('profile.quickActions.systemDesc', 'Configure application preferences')}</p>
          </Link>

          <Link href="/notifications" className="bg-card text-card-foreground p-4 rounded-2xl shadow-md hover:shadow-lg transition-shadow">
            <Bell className="h-6 w-6 text-success mb-2" />
            <h3 className="font-medium text-foreground">{t('profile.quickActions.notifications', 'Notification Settings')}</h3>
            <p className="text-sm text-muted-foreground">{t('profile.quickActions.notificationsDesc', 'Manage alerts and notifications')}</p>
          </Link>

          <Link href="/security" className="bg-card text-card-foreground p-4 rounded-2xl shadow-md hover:shadow-lg transition-shadow">
            <Shield className="h-6 w-6 text-accent mb-2" />
            <h3 className="font-medium text-foreground">{t('profile.quickActions.security', 'Security Settings')}</h3>
            <p className="text-sm text-muted-foreground">{t('profile.quickActions.securityDesc', 'Password and access management')}</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
