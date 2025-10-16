'use client';

import Link from 'next/link';
import { useState } from 'react';
import { User, Settings, Shield, Bell } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

type TabType = 'account' | 'notifications' | 'security';

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState<TabType>('account');
  const [user, setUser] = useState({
    name: 'Admin User',
    email: 'admin@fixzit.co',
    phone: '',
    role: 'Administrator',
    joinDate: 'January 2024'
  });

  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    pushNotifications: false,
    smsNotifications: false,
    workOrderUpdates: true,
    maintenanceAlerts: true,
    invoiceReminders: false
  });

  const [securitySettings, setSecuritySettings] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    twoFactorEnabled: false
  });

  const handleSaveAccount = async () => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      toast.success('Account settings saved successfully!');
    } catch (_error) {
      toast.error('Failed to save account settings');
    }
  };

  const handleSaveNotifications = async () => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      toast.success('Notification preferences updated!');
    } catch (_error) {
      toast.error('Failed to update notifications');
    }
  };

  const handleSaveSecurity = async () => {
    if (securitySettings.newPassword !== securitySettings.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      toast.success('Security settings updated!');
      setSecuritySettings({
        ...securitySettings,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (_error) {
      toast.error('Failed to update security settings');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Toaster position="top-right" />
      
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">My Profile</h1>
        <p className="text-gray-600">Manage your account settings and preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-center">
              <div className="w-20 h-20 bg-[#0061A8] rounded-full flex items-center justify-center mx-auto mb-4">
                <User size={32} className="text-white" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">{user.name}</h2>
              <p className="text-gray-600">{user.email}</p>
              <span className="inline-block mt-2 px-3 py-1 bg-[#00A859] text-white text-sm rounded-full">
                {user.role}
              </span>
            </div>

            <div className="mt-6 space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-gray-200">
                <span className="text-sm text-gray-600">Member Since</span>
                <span className="text-sm font-medium">{user.joinDate}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-200">
                <span className="text-sm text-gray-600">Account Status</span>
                <span className="text-sm font-medium text-green-600">Active</span>
              </div>
            </div>
          </div>
        </div>

        {/* Settings Tabs */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-md">
            <div className="border-b border-gray-200">
              <div className="flex">
                <button
                  onClick={() => setActiveTab('account')}
                  className={`px-6 py-3 text-sm font-medium transition-colors ${
                    activeTab === 'account'
                      ? 'text-[#0061A8] border-b-2 border-[#0061A8]'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Account Settings
                </button>
                <button
                  onClick={() => setActiveTab('notifications')}
                  className={`px-6 py-3 text-sm font-medium transition-colors ${
                    activeTab === 'notifications'
                      ? 'text-[#0061A8] border-b-2 border-[#0061A8]'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Notifications
                </button>
                <button
                  onClick={() => setActiveTab('security')}
                  className={`px-6 py-3 text-sm font-medium transition-colors ${
                    activeTab === 'security'
                      ? 'text-[#0061A8] border-b-2 border-[#0061A8]'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Security
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* Account Settings Tab */}
              {activeTab === 'account' && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={user.name}
                      onChange={(e) => setUser({ ...user, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0061A8] focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={user.email}
                      onChange={(e) => setUser({ ...user, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0061A8] focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={user.phone}
                      onChange={(e) => setUser({ ...user, phone: e.target.value })}
                      placeholder="+966 50 123 4567"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0061A8] focus:border-transparent"
                    />
                  </div>

                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => setUser({
                        name: 'Admin User',
                        email: 'admin@fixzit.co',
                        phone: '',
                        role: 'Administrator',
                        joinDate: 'January 2024'
                      })}
                      className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveAccount}
                      className="px-4 py-2 bg-[#0061A8] text-white rounded-lg hover:bg-[#0061A8]/90"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              )}

              {/* Notifications Tab */}
              {activeTab === 'notifications' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Notification Channels</h3>
                    <div className="space-y-3">
                      <label className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                        <span className="text-sm font-medium text-gray-700">Email Notifications</span>
                        <input
                          type="checkbox"
                          checked={notificationSettings.emailNotifications}
                          onChange={(e) => setNotificationSettings({
                            ...notificationSettings,
                            emailNotifications: e.target.checked
                          })}
                          className="w-4 h-4 text-[#0061A8] focus:ring-[#0061A8] rounded"
                        />
                      </label>
                      <label className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                        <span className="text-sm font-medium text-gray-700">Push Notifications</span>
                        <input
                          type="checkbox"
                          checked={notificationSettings.pushNotifications}
                          onChange={(e) => setNotificationSettings({
                            ...notificationSettings,
                            pushNotifications: e.target.checked
                          })}
                          className="w-4 h-4 text-[#0061A8] focus:ring-[#0061A8] rounded"
                        />
                      </label>
                      <label className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                        <span className="text-sm font-medium text-gray-700">SMS Notifications</span>
                        <input
                          type="checkbox"
                          checked={notificationSettings.smsNotifications}
                          onChange={(e) => setNotificationSettings({
                            ...notificationSettings,
                            smsNotifications: e.target.checked
                          })}
                          className="w-4 h-4 text-[#0061A8] focus:ring-[#0061A8] rounded"
                        />
                      </label>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Event Notifications</h3>
                    <div className="space-y-3">
                      <label className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                        <span className="text-sm font-medium text-gray-700">Work Order Updates</span>
                        <input
                          type="checkbox"
                          checked={notificationSettings.workOrderUpdates}
                          onChange={(e) => setNotificationSettings({
                            ...notificationSettings,
                            workOrderUpdates: e.target.checked
                          })}
                          className="w-4 h-4 text-[#0061A8] focus:ring-[#0061A8] rounded"
                        />
                      </label>
                      <label className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                        <span className="text-sm font-medium text-gray-700">Maintenance Alerts</span>
                        <input
                          type="checkbox"
                          checked={notificationSettings.maintenanceAlerts}
                          onChange={(e) => setNotificationSettings({
                            ...notificationSettings,
                            maintenanceAlerts: e.target.checked
                          })}
                          className="w-4 h-4 text-[#0061A8] focus:ring-[#0061A8] rounded"
                        />
                      </label>
                      <label className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                        <span className="text-sm font-medium text-gray-700">Invoice Reminders</span>
                        <input
                          type="checkbox"
                          checked={notificationSettings.invoiceReminders}
                          onChange={(e) => setNotificationSettings({
                            ...notificationSettings,
                            invoiceReminders: e.target.checked
                          })}
                          className="w-4 h-4 text-[#0061A8] focus:ring-[#0061A8] rounded"
                        />
                      </label>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={handleSaveNotifications}
                      className="px-4 py-2 bg-[#0061A8] text-white rounded-lg hover:bg-[#0061A8]/90"
                    >
                      Save Preferences
                    </button>
                  </div>
                </div>
              )}

              {/* Security Tab */}
              {activeTab === 'security' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Change Password</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Current Password
                        </label>
                        <input
                          type="password"
                          value={securitySettings.currentPassword}
                          onChange={(e) => setSecuritySettings({
                            ...securitySettings,
                            currentPassword: e.target.value
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0061A8] focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          New Password
                        </label>
                        <input
                          type="password"
                          value={securitySettings.newPassword}
                          onChange={(e) => setSecuritySettings({
                            ...securitySettings,
                            newPassword: e.target.value
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0061A8] focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Confirm New Password
                        </label>
                        <input
                          type="password"
                          value={securitySettings.confirmPassword}
                          onChange={(e) => setSecuritySettings({
                            ...securitySettings,
                            confirmPassword: e.target.value
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0061A8] focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Two-Factor Authentication</h3>
                    <label className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                      <div>
                        <span className="text-sm font-medium text-gray-700 block">Enable 2FA</span>
                        <span className="text-xs text-gray-500">Add an extra layer of security to your account</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={securitySettings.twoFactorEnabled}
                        onChange={(e) => setSecuritySettings({
                          ...securitySettings,
                          twoFactorEnabled: e.target.checked
                        })}
                        className="w-4 h-4 text-[#0061A8] focus:ring-[#0061A8] rounded"
                      />
                    </label>
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={handleSaveSecurity}
                      className="px-4 py-2 bg-[#0061A8] text-white rounded-lg hover:bg-[#0061A8]/90"
                    >
                      Update Security
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
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/settings" className="bg-white p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow">
            <Settings className="h-6 w-6 text-[#0061A8] mb-2" />
            <h3 className="font-medium text-gray-900">System Settings</h3>
            <p className="text-sm text-gray-600">Configure application preferences</p>
          </Link>

          <Link href="/notifications" className="bg-white p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow">
            <Bell className="h-6 w-6 text-[#00A859] mb-2" />
            <h3 className="font-medium text-gray-900">Notification Settings</h3>
            <p className="text-sm text-gray-600">Manage alerts and notifications</p>
          </Link>

          <Link href="/security" className="bg-white p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow">
            <Shield className="h-6 w-6 text-[#FFB400] mb-2" />
            <h3 className="font-medium text-gray-900">Security Settings</h3>
            <p className="text-sm text-gray-600">Password and access management</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
