'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useTranslation } from '@/contexts/TranslationContext';
import { useFmOrgGuard } from '@/components/fm/useFmOrgGuard';
import {
  Users, Shield, FileText, Settings, BarChart3, Database,
  Bell, Mail, FileCode, Lock, Activity, Zap
} from 'lucide-react';

export default function AdministrationPage() {
  const { hasOrgContext, guard, orgId, supportOrg, supportBanner } = useFmOrgGuard({ moduleId: 'administration' });
  const { data: session, status } = useSession();
  const router = useRouter();
  const { t } = useTranslation();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login?callbackUrl=/fm/administration');
    }
    if (status === 'authenticated' && session?.user?.role !== 'SUPER_ADMIN') {
      router.push('/fm/dashboard');
    }
  }, [status, session, router]);

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">{t('common.loading', 'Loading...')}</p>
        </div>
      </div>
    );
  }

  if (session?.user?.role !== 'SUPER_ADMIN') {
    return null;
  }

  if (!orgId) {
    return (
      <div className="p-6 space-y-6">
        {supportBanner}
        {guard}
      </div>
    );
  }

  const adminModules = [
    {
      id: 'users',
      name: t('admin.users.title', 'User Management'),
      description: t('admin.users.description', 'Manage users, roles, and permissions'),
      icon: Users,
      href: '/admin',
      color: 'bg-blue-500',
      stats: { label: t('admin.users.totalUsers', 'Total Users'), value: '---' }
    },
    {
      id: 'roles',
      name: t('admin.roles.title', 'Roles & Permissions'),
      description: t('admin.roles.description', 'Configure RBAC policies and permissions'),
      icon: Shield,
      href: '/admin',
      color: 'bg-purple-500',
      stats: { label: t('admin.roles.totalRoles', 'Total Roles'), value: '---' }
    },
    {
      id: 'audit',
      name: t('admin.audit.title', 'Audit Logs'),
      description: t('admin.audit.description', 'View system activity and compliance logs'),
      icon: FileText,
      href: '/admin/audit-logs',
      color: 'bg-green-500',
      stats: { label: t('admin.audit.recentEvents', 'Recent Events'), value: '---' }
    },
    {
      id: 'cms',
      name: t('admin.cms.title', 'Content Management'),
      description: t('admin.cms.description', 'Manage CMS content, pages, and media'),
      icon: FileCode,
      href: '/admin/cms',
      color: 'bg-orange-500',
      stats: { label: t('admin.cms.totalPages', 'Total Pages'), value: '---' }
    },
    {
      id: 'settings',
      name: t('admin.settings.title', 'System Settings'),
      description: t('admin.settings.description', 'Configure system-wide settings and preferences'),
      icon: Settings,
      href: '/settings',
      color: 'bg-gray-500',
      stats: { label: t('admin.settings.categories', 'Categories'), value: '10+' }
    },
    {
      id: 'features',
      name: t('admin.features.title', 'Feature Flags'),
      description: t('admin.features.description', 'Enable/disable features dynamically'),
      icon: Zap,
      href: '/admin/feature-settings',
      color: 'bg-yellow-500',
      stats: { label: t('admin.features.active', 'Active Features'), value: '---' }
    },
    {
      id: 'database',
      name: t('admin.database.title', 'Database Management'),
      description: t('admin.database.description', 'Monitor database health and performance'),
      icon: Database,
      href: '/fm/system',
      color: 'bg-red-500',
      stats: { label: t('admin.database.status', 'Status'), value: 'Healthy' }
    },
    {
      id: 'notifications',
      name: t('admin.notifications.title', 'Notifications'),
      description: t('admin.notifications.description', 'Manage system notifications and alerts'),
      icon: Bell,
      href: '/notifications',
      color: 'bg-indigo-500',
      stats: { label: t('admin.notifications.pending', 'Pending'), value: '---' }
    },
    {
      id: 'email',
      name: t('admin.email.title', 'Email Configuration'),
      description: t('admin.email.description', 'Configure SMTP settings and email templates'),
      icon: Mail,
      href: '/settings',
      color: 'bg-teal-500',
      stats: { label: t('admin.email.templates', 'Templates'), value: '12' }
    },
    {
      id: 'security',
      name: t('admin.security.title', 'Security'),
      description: t('admin.security.description', 'Manage security policies and 2FA'),
      icon: Lock,
      href: '/settings',
      color: 'bg-pink-500',
      stats: { label: t('admin.security.policies', 'Active Policies'), value: '5' }
    },
    {
      id: 'monitoring',
      name: t('admin.monitoring.title', 'System Monitoring'),
      description: t('admin.monitoring.description', 'Real-time system health and metrics'),
      icon: Activity,
      href: '/fm/system',
      color: 'bg-cyan-500',
      stats: { label: t('admin.monitoring.uptime', 'Uptime'), value: '99.9%' }
    },
    {
      id: 'reports',
      name: t('admin.reports.title', 'Admin Reports'),
      description: t('admin.reports.description', 'Generate admin-level reports and analytics'),
      icon: BarChart3,
      href: '/fm/reports',
      color: 'bg-emerald-500',
      stats: { label: t('admin.reports.generated', 'Generated'), value: '---' }
    }
  ];

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl space-y-4">
      {supportBanner}
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">
          {t('admin.administration.title', 'System Administration')}
        </h1>
        <p className="text-muted-foreground text-lg">
          {t('admin.administration.subtitle', 'Manage all aspects of the Fixzit platform')}
        </p>
        <div className="mt-4 flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            <span className="font-medium">
              {t('sidebar.role', 'Role')}: <span className="text-primary">SUPER ADMIN</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-success" />
            <span className="font-medium">
              {t('admin.system.status', 'System')}: <span className="text-success">{t('admin.system.operational', 'Operational')}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Admin Modules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {adminModules.map((module) => {
          const Icon = module.icon;
          return (
            <div
              key={module.id}
              onClick={() => router.push(module.href)}
              className="bg-card border border-border rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer group"
            >
              {/* Icon */}
              <div className={`${module.color} w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <Icon className="h-6 w-6 text-white" />
              </div>

              {/* Title & Description */}
              <h3 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors">
                {module.name}
              </h3>
              <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                {module.description}
              </p>

              {/* Stats */}
              <div className="pt-4 border-t border-border">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">{module.stats.label}</span>
                  <span className="font-semibold">{module.stats.value}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="mt-12 bg-card border border-border rounded-lg p-6">
        <h2 className="text-2xl font-semibold mb-4">
          {t('dashboard.quickActions', 'Quick Actions')}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            onClick={() => router.push('/admin')}
            className="bg-primary text-primary-foreground px-4 py-3 rounded-lg hover:bg-primary/90 transition-colors font-medium"
          >
            {t('admin.users.createUser', 'Create User')}
          </button>
          <button
            onClick={() => router.push('/admin')}
            className="bg-secondary text-secondary-foreground px-4 py-3 rounded-lg hover:bg-secondary/90 transition-colors font-medium"
          >
            {t('admin.roles.createRole', 'Create Role')}
          </button>
          <button
            onClick={() => router.push('/admin/audit-logs')}
            className="bg-secondary text-secondary-foreground px-4 py-3 rounded-lg hover:bg-secondary/90 transition-colors font-medium"
          >
            {t('admin.audit.viewLogs', 'View Audit Logs')}
          </button>
          <button
            onClick={() => router.push('/fm/system')}
            className="bg-secondary text-secondary-foreground px-4 py-3 rounded-lg hover:bg-secondary/90 transition-colors font-medium"
          >
            {t('admin.system.monitor', 'System Monitor')}
          </button>
        </div>
      </div>

      {/* System Info */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center gap-3 mb-2">
            <Database className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">{t('admin.database.title', 'Database')}</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-2">{t('admin.database.status', 'Status')}</p>
          <p className="text-2xl font-bold text-success">{t('admin.database.healthy', 'Healthy')}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center gap-3 mb-2">
            <Activity className="h-5 w-5 text-success" />
            <h3 className="font-semibold">{t('admin.monitoring.title', 'System Monitoring')}</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-2">{t('admin.monitoring.uptime', 'Uptime')}</p>
          <p className="text-2xl font-bold">99.9%</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center gap-3 mb-2">
            <Users className="h-5 w-5 text-purple-500" />
            <h3 className="font-semibold">{t('admin.users.active', 'Active Users')}</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-2">{t('admin.users.online', 'Online Now')}</p>
          <p className="text-2xl font-bold">---</p>
        </div>
      </div>
    </div>
  );
}
