'use client';

import ModuleViewTabs from '@/components/fm/ModuleViewTabs';

export default function SystemPage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">System Management</h1>
          <p className="text-muted-foreground">Configure system settings and preferences</p>
        </div>
      </div>
      <ModuleViewTabs moduleId="system" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card rounded-2xl shadow-md border border-border p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">General Settings</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Organization Name</label>
              <input type="text" value="Fixzit Enterprise" className="w-full px-3 py-2 border border-border rounded-2xl" readOnly />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Default Language</label>
              <select className="w-full px-3 py-2 border border-border rounded-2xl">
                <option>English</option>
                <option>Arabic</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-2xl shadow-md border border-border p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">System Info</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Version</span>
              <span className="text-sm font-medium text-foreground">2.0.26</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Last Update</span>
              <span className="text-sm font-medium text-foreground">Jan 12, 2025</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Database Status</span>
              <span className="text-sm font-medium text-success">Connected</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
