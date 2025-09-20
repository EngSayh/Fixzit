'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../../contexts/I18nContext';
import { 
  Settings as SettingsIcon, Bell, Shield, Palette, Globe, 
  Monitor, Database, Key, Mail, Smartphone, Volume2,
  Check, X, Save, RefreshCw, Download, Upload, User, Phone, Building, MapPin, Camera, Edit3
} from 'lucide-react';

export default function SettingsPage() {
  const { t, isRTL, locale, switchLanguage } = useTranslation();
  const [activeTab, setActiveTab] = useState('general');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState({
    name: 'Admin User',
    email: 'admin@fixzit.com',
    phone: '+966 12 345 6789',
    company: 'FIXZIT SOUQ Enterprise',
    location: 'Riyadh, Saudi Arabia',
    role: 'System Administrator',
    joinDate: '2024-01-15'
  });
  const [settings, setSettings] = useState({
    notifications: {
      email: true,
      push: true,
      desktop: false,
      workOrders: true,
      maintenance: true,
      system: false
    },
    appearance: {
      theme: 'light',
      language: locale,
      compact: false,
      animations: true
    },
    security: {
      twoFactor: true,
      sessionTimeout: '30',
      loginNotifications: true,
      apiAccess: false
    },
    system: {
      autoSave: true,
      syncInterval: '5',
      backupEnabled: true,
      debugMode: false
    }
  });

  // Initialize theme on component mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldUseDark = savedTheme === 'dark' || (!savedTheme && prefersDark);
    setIsDarkMode(shouldUseDark);
  }, []);

  const handleThemeToggle = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
    
    setSettings(prev => ({
      ...prev,
      appearance: { ...prev.appearance, theme: newDarkMode ? 'dark' : 'light' }
    }));
  };

  const handleSaveSettings = async () => {
    // Save settings to backend
    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ settings })
      });
      
      if (response.ok) {
        console.log('Settings saved successfully');
        alert('Settings saved successfully!');
      } else {
        console.error('Failed to save settings');
        alert('Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Error saving settings');
    }
    // Show success message
  };

  const handleSaveProfile = async () => {
    // Save profile to backend
    try {
      const response = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ 
          name: profile.name,
          email: profile.email,
          phone: profile.phone,
          language: profile.language
        })
      });
      
      if (response.ok) {
        console.log('Profile saved successfully');
        alert('Profile saved successfully!');
        setIsEditingProfile(false);
      } else {
        console.error('Failed to save profile');
        alert('Failed to save profile');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Error saving profile');
    }
  };

  const handleCancelProfile = () => {
    setIsEditingProfile(false);
    // Reset profile data if needed
  };

  const tabs = [
    { id: 'profile', labelKey: 'settings.profile', icon: User },
    { id: 'general', labelKey: 'settings.general', icon: SettingsIcon },
    { id: 'notifications', labelKey: 'settings.notifications', icon: Bell },
    { id: 'appearance', labelKey: 'settings.appearance', icon: Palette },
    { id: 'security', labelKey: 'settings.security', icon: Shield },
    { id: 'system', labelKey: 'settings.system', icon: Database },
  ];

  const renderGeneralSettings = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Language Settings */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className={`font-medium text-gray-900 mb-3 flex items-center gap-2 ${
            isRTL ? 'flex-row-reverse' : ''
          }`}>
            <Globe className="w-4 h-4" />
            {t("settings.language", "Language")}
          </h3>
          <div className="space-y-2">
            <label className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <input
                type="radio"
                name="language"
                checked={locale === 'en'}
                onChange={() => switchLanguage('en')}
                className="text-primary-600"
              />
              <span>English</span>
            </label>
            <label className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <input
                type="radio"
                name="language"
                checked={locale === 'ar'}
                onChange={() => switchLanguage('ar')}
                className="text-primary-600"
              />
              <span>العربية</span>
            </label>
          </div>
        </div>

        {/* Time Zone */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className={`font-medium text-gray-900 mb-3 flex items-center gap-2 ${
            isRTL ? 'flex-row-reverse' : ''
          }`}>
            <Monitor className="w-4 h-4" />
            {t("settings.timezone", "Time Zone")}
          </h3>
          <select className="w-full px-3 py-2 border border-gray-300 rounded-md">
            <option>Asia/Riyadh (UTC+3)</option>
            <option>UTC (UTC+0)</option>
            <option>America/New_York (UTC-5)</option>
          </select>
        </div>
      </div>
    </div>
  );

  const renderNotificationSettings = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Email Notifications */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className={`font-medium text-gray-900 mb-3 flex items-center gap-2 ${
            isRTL ? 'flex-row-reverse' : ''
          }`}>
            <Mail className="w-4 h-4" />
            {t("settings.emailNotifications", "Email Notifications")}
          </h3>
          <div className="space-y-3">
            {[
              { key: 'workOrders', label: 'Work Orders' },
              { key: 'maintenance', label: 'Maintenance Alerts' },
              { key: 'system', label: 'System Updates' },
            ].map(item => (
              <label key={item.key} className={`flex items-center justify-between ${
                isRTL ? 'flex-row-reverse' : ''
              }`}>
                <span className="text-sm text-gray-700">{item.label}</span>
                <input
                  type="checkbox"
                  checked={settings.notifications[item.key]}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    notifications: {
                      ...prev.notifications,
                      [item.key]: e.target.checked
                    }
                  }))}
                  className="text-primary-600"
                />
              </label>
            ))}
          </div>
        </div>

        {/* Push Notifications */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className={`font-medium text-gray-900 mb-3 flex items-center gap-2 ${
            isRTL ? 'flex-row-reverse' : ''
          }`}>
            <Smartphone className="w-4 h-4" />
            {t("settings.pushNotifications", "Push Notifications")}
          </h3>
          <div className="space-y-3">
            <label className={`flex items-center justify-between ${
              isRTL ? 'flex-row-reverse' : ''
            }`}>
              <span className="text-sm text-gray-700">{t("settings.enablePush", "Enable Push")}</span>
              <input
                type="checkbox"
                checked={settings.notifications.push}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  notifications: { ...prev.notifications, push: e.target.checked }
                }))}
                className="text-primary-600"
              />
            </label>
            <label className={`flex items-center justify-between ${
              isRTL ? 'flex-row-reverse' : ''
            }`}>
              <span className="text-sm text-gray-700">{t("settings.desktopNotify", "Desktop Notifications")}</span>
              <input
                type="checkbox"
                checked={settings.notifications.desktop}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  notifications: { ...prev.notifications, desktop: e.target.checked }
                }))}
                className="text-primary-600"
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAppearanceSettings = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Theme Settings */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className={`font-medium text-gray-900 mb-3 flex items-center gap-2 ${
            isRTL ? 'flex-row-reverse' : ''
          }`}>
            <Palette className="w-4 h-4" />
            {t("settings.theme", "Theme")}
          </h3>
          <div className="space-y-3">
            <button
              onClick={handleThemeToggle}
              className={`w-full flex items-center justify-between p-3 bg-white rounded-lg border hover:bg-gray-50 transition-colors ${
                isRTL ? 'flex-row-reverse' : ''
              }`}
            >
              <span className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                {isDarkMode ? (
                  <>
                    <div className="w-4 h-4 bg-gray-800 rounded-full"></div>
                    <span>{t("settings.darkMode", "Dark Mode")}</span>
                  </>
                ) : (
                  <>
                    <div className="w-4 h-4 bg-yellow-400 rounded-full"></div>
                    <span>{t("settings.lightMode", "Light Mode")}</span>
                  </>
                )}
              </span>
              <div className={`w-12 h-6 rounded-full transition-colors ${
                isDarkMode ? 'bg-primary-600' : 'bg-gray-300'
              } relative`}>
                <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${
                  isDarkMode ? 'translate-x-6' : 'translate-x-0.5'
                }`}></div>
              </div>
            </button>
          </div>
        </div>

        {/* Display Settings */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className={`font-medium text-gray-900 mb-3 flex items-center gap-2 ${
            isRTL ? 'flex-row-reverse' : ''
          }`}>
            <Monitor className="w-4 h-4" />
            {t("settings.display", "Display")}
          </h3>
          <div className="space-y-3">
            <label className={`flex items-center justify-between ${
              isRTL ? 'flex-row-reverse' : ''
            }`}>
              <span className="text-sm text-gray-700">{t("settings.compactMode", "Compact Mode")}</span>
              <input
                type="checkbox"
                checked={settings.appearance.compact}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  appearance: { ...prev.appearance, compact: e.target.checked }
                }))}
                className="text-primary-600"
              />
            </label>
            <label className={`flex items-center justify-between ${
              isRTL ? 'flex-row-reverse' : ''
            }`}>
              <span className="text-sm text-gray-700">{t("settings.animations", "Animations")}</span>
              <input
                type="checkbox"
                checked={settings.appearance.animations}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  appearance: { ...prev.appearance, animations: e.target.checked }
                }))}
                className="text-primary-600"
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSecuritySettings = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Authentication */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className={`font-medium text-gray-900 mb-3 flex items-center gap-2 ${
            isRTL ? 'flex-row-reverse' : ''
          }`}>
            <Key className="w-4 h-4" />
            {t("settings.authentication", "Authentication")}
          </h3>
          <div className="space-y-3">
            <label className={`flex items-center justify-between ${
              isRTL ? 'flex-row-reverse' : ''
            }`}>
              <span className="text-sm text-gray-700">{t("settings.twoFactor", "Two-Factor Authentication")}</span>
              <input
                type="checkbox"
                checked={settings.security.twoFactor}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  security: { ...prev.security, twoFactor: e.target.checked }
                }))}
                className="text-primary-600"
              />
            </label>
            <div className={`flex items-center justify-between ${
              isRTL ? 'flex-row-reverse' : ''
            }`}>
              <span className="text-sm text-gray-700">{t("settings.sessionTimeout", "Session Timeout (minutes)")}</span>
              <select 
                value={settings.security.sessionTimeout}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  security: { ...prev.security, sessionTimeout: e.target.value }
                }))}
                className="px-2 py-1 border border-gray-300 rounded text-sm"
              >
                <option value="15">15</option>
                <option value="30">30</option>
                <option value="60">60</option>
                <option value="120">120</option>
              </select>
            </div>
          </div>
        </div>

        {/* Security Notifications */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className={`font-medium text-gray-900 mb-3 flex items-center gap-2 ${
            isRTL ? 'flex-row-reverse' : ''
          }`}>
            <Shield className="w-4 h-4" />
            {t("settings.securityAlerts", "Security Alerts")}
          </h3>
          <div className="space-y-3">
            <label className={`flex items-center justify-between ${
              isRTL ? 'flex-row-reverse' : ''
            }`}>
              <span className="text-sm text-gray-700">{t("settings.loginAlerts", "Login Notifications")}</span>
              <input
                type="checkbox"
                checked={settings.security.loginNotifications}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  security: { ...prev.security, loginNotifications: e.target.checked }
                }))}
                className="text-primary-600"
              />
            </label>
            <label className={`flex items-center justify-between ${
              isRTL ? 'flex-row-reverse' : ''
            }`}>
              <span className="text-sm text-gray-700">{t("settings.apiAccess", "API Access Logging")}</span>
              <input
                type="checkbox"
                checked={settings.security.apiAccess}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  security: { ...prev.security, apiAccess: e.target.checked }
                }))}
                className="text-primary-600"
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSystemSettings = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Performance */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className={`font-medium text-gray-900 mb-3 flex items-center gap-2 ${
            isRTL ? 'flex-row-reverse' : ''
          }`}>
            <Monitor className="w-4 h-4" />
            {t("settings.performance", "Performance")}
          </h3>
          <div className="space-y-3">
            <label className={`flex items-center justify-between ${
              isRTL ? 'flex-row-reverse' : ''
            }`}>
              <span className="text-sm text-gray-700">{t("settings.autoSave", "Auto-Save")}</span>
              <input
                type="checkbox"
                checked={settings.system.autoSave}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  system: { ...prev.system, autoSave: e.target.checked }
                }))}
                className="text-primary-600"
              />
            </label>
            <div className={`flex items-center justify-between ${
              isRTL ? 'flex-row-reverse' : ''
            }`}>
              <span className="text-sm text-gray-700">{t("settings.syncInterval", "Sync Interval (minutes)")}</span>
              <select 
                value={settings.system.syncInterval}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  system: { ...prev.system, syncInterval: e.target.value }
                }))}
                className="px-2 py-1 border border-gray-300 rounded text-sm"
              >
                <option value="1">1</option>
                <option value="5">5</option>
                <option value="15">15</option>
                <option value="30">30</option>
              </select>
            </div>
          </div>
        </div>

        {/* Backup & Maintenance */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className={`font-medium text-gray-900 mb-3 flex items-center gap-2 ${
            isRTL ? 'flex-row-reverse' : ''
          }`}>
            <Database className="w-4 h-4" />
            {t("settings.backup", "Backup & Maintenance")}
          </h3>
          <div className="space-y-3">
            <label className={`flex items-center justify-between ${
              isRTL ? 'flex-row-reverse' : ''
            }`}>
              <span className="text-sm text-gray-700">{t("settings.backupEnabled", "Automatic Backup")}</span>
              <input
                type="checkbox"
                checked={settings.system.backupEnabled}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  system: { ...prev.system, backupEnabled: e.target.checked }
                }))}
                className="text-primary-600"
              />
            </label>
            <button className={`w-full flex items-center justify-center gap-2 p-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors ${
              isRTL ? 'flex-row-reverse' : ''
            }`}>
              <Download className="w-4 h-4" />
              <span className="text-sm">{t("settings.exportData", "Export Data")}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderProfileSettings = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className={`flex items-start gap-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
          {/* Profile Picture */}
          <div className="relative">
            <div className="w-24 h-24 bg-primary-100 rounded-full flex items-center justify-center">
              <User className="w-12 h-12 text-primary-600" />
            </div>
            <button className="absolute -bottom-2 -right-2 w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center hover:bg-primary-700 transition-colors">
              <Camera className="w-4 h-4" />
            </button>
          </div>

          {/* Profile Info */}
          <div className="flex-1 min-w-0">
            <div className={`flex items-center justify-between mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{profileData.name}</h1>
                <p className="text-gray-600">{profileData.role}</p>
              </div>
              {!isEditingProfile ? (
                <button
                  onClick={() => setIsEditingProfile(true)}
                  className={`flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors ${
                    isRTL ? 'flex-row-reverse' : ''
                  }`}
                >
                  <Edit3 className="w-4 h-4" />
                  <span>{t("common.edit", "Edit")}</span>
                </button>
              ) : (
                <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <button
                    onClick={handleSaveProfile}
                    className={`flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors ${
                      isRTL ? 'flex-row-reverse' : ''
                    }`}
                  >
                    <Save className="w-4 h-4" />
                    <span>{t("common.save", "Save")}</span>
                  </button>
                  <button
                    onClick={handleCancelProfile}
                    className={`flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors ${
                      isRTL ? 'flex-row-reverse' : ''
                    }`}
                  >
                    <X className="w-4 h-4" />
                    <span>{t("common.cancel", "Cancel")}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Profile Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <Mail className="w-5 h-5 text-gray-400" />
                {isEditingProfile ? (
                  <input
                    type="email"
                    value={profileData.email}
                    onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                    className="flex-1 px-3 py-1 border border-gray-300 rounded-md"
                  />
                ) : (
                  <span className="text-gray-700">{profileData.email}</span>
                )}
              </div>

              <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <Phone className="w-5 h-5 text-gray-400" />
                {isEditingProfile ? (
                  <input
                    type="tel"
                    value={profileData.phone}
                    onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                    className="flex-1 px-3 py-1 border border-gray-300 rounded-md"
                  />
                ) : (
                  <span className="text-gray-700">{profileData.phone}</span>
                )}
              </div>

              <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <Building className="w-5 h-5 text-gray-400" />
                <span className="text-gray-700">{profileData.company}</span>
              </div>

              <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <MapPin className="w-5 h-5 text-gray-400" />
                <span className="text-gray-700">{profileData.location}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile': return renderProfileSettings();
      case 'general': return renderGeneralSettings();
      case 'notifications': return renderNotificationSettings();
      case 'appearance': return renderAppearanceSettings();
      case 'security': return renderSecuritySettings();
      case 'system': return renderSystemSettings();
      default: return renderProfileSettings();
    }
  };

  return (
    <div className={`max-w-6xl mx-auto space-y-6 ${isRTL ? 'text-right' : 'text-left'}`}>
      {/* Settings Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
              <SettingsIcon className="w-4 h-4 text-primary-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{t("settings.title", "Settings")}</h1>
              <p className="text-gray-600">{t("settings.subtitle", "Manage your account preferences and system configuration")}</p>
            </div>
          </div>
          <button
            onClick={handleSaveSettings}
            className={`flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors ${
              isRTL ? 'flex-row-reverse' : ''
            }`}
          >
            <Save className="w-4 h-4" />
            <span>{t("common.save", "Save Changes")}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Settings Navigation */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <nav className="space-y-1">
            {tabs.map((tab) => {
              const IconComponent = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                    activeTab === tab.id
                      ? 'bg-primary-50 text-primary-700 border-r-2 border-primary-600'
                      : 'text-gray-700 hover:bg-gray-50'
                  } ${isRTL ? 'flex-row-reverse text-right border-l-2 border-r-0' : ''}`}
                >
                  <IconComponent className="w-4 h-4" />
                  <span className="text-sm font-medium">{t(tab.labelKey, tab.labelKey.split('.')[1])}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Settings Content */}
        <div className="lg:col-span-3 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 capitalize">
              {t(`settings.${activeTab}`, activeTab)}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {t(`settings.${activeTab}Description`, `Configure your ${activeTab} preferences`)}
            </p>
          </div>
          
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
}