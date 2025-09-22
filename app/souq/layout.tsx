import { ReactNode } from 'react';
import RoleSidebar from '@/src/components/navigation/RoleSidebar';
import { ModuleKey } from '@/src/lib/rbac';

export default function SouqLayout({ children }: { children: React.ReactNode }) {
  // Mock role and modules for marketplace context - in real app, get from auth
  const role: 'SUPER_ADMIN' | 'CORP_ADMIN' | 'MANAGEMENT' | 'FINANCE' | 'HR' | 'CORPORATE_EMPLOYEE' | 'PROPERTY_OWNER' | 'TECHNICIAN' | 'TENANT' | 'VENDOR' | 'GUEST' = 'GUEST';
  const userModules: ModuleKey[] = ['marketplace'];

  return (
    <div className="flex gap-6">
      <RoleSidebar role={role} userModules={userModules} />
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

