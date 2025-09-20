'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../../contexts/I18nContext';

interface NotificationPreferences {
  id: string;
  userId: string;
  workOrderInApp: boolean;
  workOrderEmail: boolean;
  workOrderSms: boolean;
  paymentInApp: boolean;
  paymentEmail: boolean;
  paymentSms: boolean;
  propertyInApp: boolean;
  propertyEmail: boolean;
  propertySms: boolean;
  hrInApp: boolean;
  hrEmail: boolean;
  hrSms: boolean;
  marketplaceInApp: boolean;
  marketplaceEmail: boolean;
  marketplaceSms: boolean;
  crmInApp: boolean;
  crmEmail: boolean;
  crmSms: boolean;
  systemInApp: boolean;
  systemEmail: boolean;
  systemSms: boolean;
  doNotDisturb: boolean;
  doNotDisturbStart: string;
  doNotDisturbEnd: string;
  criticalAlways: boolean;
  weekendNotifications: boolean;
}

interface NotificationPreferencesProps {
  isOpen: boolean;
  onClose: () => void;
}

const NotificationPreferences: React.FC<NotificationPreferencesProps> = ({
  isOpen,
  onClose
}) => {
  const { isRTL } = useTranslation();
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchPreferences();
    }
  }, [isOpen]);

  const fetchPreferences = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/notifications/preferences');
      if (response.ok) {
        const data = await response.json();
        setPreferences(data.preferences);
      }
    } catch (error) {
      console.error('Error fetching preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    if (!preferences) return;

    setSaving(true);
    try {
      const response = await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(preferences),
      });

      if (response.ok) {
        // Show success message
        onClose();
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
    } finally {
      setSaving(false);
    }
  };

  const updatePreference = (key: keyof NotificationPreferences, value: boolean | string) => {
    if (!preferences) return;
    setPreferences({
      ...preferences,
      [key]: value
    });
  };

  const notificationTypes = [
    {
      key: 'workOrder',
      title: 'Work Orders',
      description: 'New assignments, status changes, completion notifications',
      icon: '🔧'
    },
    {
      key: 'payment',
      title: 'Payments',
      description: 'Payment due alerts, received payments, overdue notifications',
      icon: '💰'
    },
    {
      key: 'property',
      title: 'Property',
      description: 'Maintenance requests, lease renewals, tenant updates',
      icon: '🏢'
    },
    {
      key: 'hr',
      title: 'Human Resources',
      description: 'Employee updates, payroll notifications, leave requests',
      icon: '👥'
    },
    {
      key: 'marketplace',
      title: 'Marketplace',
      description: 'New RFQs, bid updates, order notifications',
      icon: '🛒'
    },
    {
      key: 'crm',
      title: 'CRM',
      description: 'New leads, deal updates, follow-up reminders',
      icon: '🤝'
    },
    {
      key: 'system',
      title: 'System',
      description: 'System updates, maintenance, security alerts',
      icon: '⚙️'
    }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className={`
        absolute inset-y-0 ${isRTL ? 'left-0' : 'right-0'}
        w-full max-w-2xl bg-white shadow-xl
        flex flex-col
      `}>
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
            <h2 className="text-xl font-semibold text-gray-900">
              Notification Preferences
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0061A8]"></div>
            </div>
          ) : preferences ? (
            <div className="space-y-8">
              {/* Global Settings */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Global Settings</h3>
                <div className="space-y-4">
                  <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div className={isRTL ? 'text-right' : ''}>
                      <label className="text-sm font-medium text-gray-700">
                        Do Not Disturb
                      </label>
                      <p className="text-xs text-gray-500">
                        Disable notifications during specified hours
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={preferences.doNotDisturb}
                      onChange={(e) => updatePreference('doNotDisturb', e.target.checked)}
                      className="w-4 h-4 text-[#0061A8] border-gray-300 rounded focus:ring-[#0061A8]"
                    />
                  </div>

                  {preferences.doNotDisturb && (
                    <div className={`grid grid-cols-2 gap-4 ml-6 ${isRTL ? 'mr-6 ml-0' : ''}`}>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Start Time
                        </label>
                        <input
                          type="time"
                          value={preferences.doNotDisturbStart}
                          onChange={(e) => updatePreference('doNotDisturbStart', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          End Time
                        </label>
                        <input
                          type="time"
                          value={preferences.doNotDisturbEnd}
                          onChange={(e) => updatePreference('doNotDisturbEnd', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                      </div>
                    </div>
                  )}

                  <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div className={isRTL ? 'text-right' : ''}>
                      <label className="text-sm font-medium text-gray-700">
                        Critical Notifications Always
                      </label>
                      <p className="text-xs text-gray-500">
                        Receive critical notifications even during Do Not Disturb
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={preferences.criticalAlways}
                      onChange={(e) => updatePreference('criticalAlways', e.target.checked)}
                      className="w-4 h-4 text-[#0061A8] border-gray-300 rounded focus:ring-[#0061A8]"
                    />
                  </div>

                  <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div className={isRTL ? 'text-right' : ''}>
                      <label className="text-sm font-medium text-gray-700">
                        Weekend Notifications
                      </label>
                      <p className="text-xs text-gray-500">
                        Receive notifications on weekends
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={preferences.weekendNotifications}
                      onChange={(e) => updatePreference('weekendNotifications', e.target.checked)}
                      className="w-4 h-4 text-[#0061A8] border-gray-300 rounded focus:ring-[#0061A8]"
                    />
                  </div>
                </div>
              </div>

              {/* Notification Types */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Notification Types</h3>
                <div className="space-y-6">
                  {notificationTypes.map((type) => (
                    <div key={type.key} className="border border-gray-200 rounded-lg p-4">
                      <div className={`flex items-center gap-3 mb-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <span className="text-2xl">{type.icon}</span>
                        <div className={isRTL ? 'text-right' : ''}>
                          <h4 className="font-medium text-gray-900">{type.title}</h4>
                          <p className="text-sm text-gray-500">{type.description}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <input
                            type="checkbox"
                            checked={preferences[`${type.key}InApp` as keyof NotificationPreferences] as boolean}
                            onChange={(e) => updatePreference(`${type.key}InApp` as keyof NotificationPreferences, e.target.checked)}
                            className="w-4 h-4 text-[#0061A8] border-gray-300 rounded focus:ring-[#0061A8]"
                          />
                          <label className="text-sm text-gray-700">In-App</label>
                        </div>

                        <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <input
                            type="checkbox"
                            checked={preferences[`${type.key}Email` as keyof NotificationPreferences] as boolean}
                            onChange={(e) => updatePreference(`${type.key}Email` as keyof NotificationPreferences, e.target.checked)}
                            className="w-4 h-4 text-[#0061A8] border-gray-300 rounded focus:ring-[#0061A8]"
                          />
                          <label className="text-sm text-gray-700">Email</label>
                        </div>

                        <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <input
                            type="checkbox"
                            checked={preferences[`${type.key}Sms` as keyof NotificationPreferences] as boolean}
                            onChange={(e) => updatePreference(`${type.key}Sms` as keyof NotificationPreferences, e.target.checked)}
                            className="w-4 h-4 text-[#0061A8] border-gray-300 rounded focus:ring-[#0061A8]"
                          />
                          <label className="text-sm text-gray-700">SMS</label>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">
              Failed to load preferences. Please try again.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200">
          <div className={`flex gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={savePreferences}
              disabled={saving || !preferences}
              className="px-4 py-2 bg-[#0061A8] text-white rounded-lg hover:bg-[#004A87] disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving...' : 'Save Preferences'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationPreferences;