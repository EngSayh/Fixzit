import ModuleViewTabs from '@/components/fm/ModuleViewTabs';

export default function CRMPage() {
  return (
    <div className="space-y-6">
      <ModuleViewTabs moduleId="crm" />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">CRM</h1>
          <p className="text-muted-foreground">Customer relationship management</p>
        </div>
      </div>

      <div className="bg-card rounded-2xl shadow-md border border-border p-8 text-center">
        <h2 className="text-lg font-semibold text-foreground mb-2">Customer Management</h2>
        <p className="text-muted-foreground mb-4">CRM interface loads here.</p>
        <p className="text-sm text-muted-foreground">Connected to CRM API endpoints.</p>
      </div>
    </div>
  );
}
