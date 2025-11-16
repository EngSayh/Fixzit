import ModuleViewTabs from '@/components/fm/ModuleViewTabs';

export default function CompliancePage() {
  return (
    <div className="space-y-6">
      <ModuleViewTabs moduleId="compliance" />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Compliance</h1>
          <p className="text-muted-foreground">Regulatory compliance and legal management</p>
        </div>
      </div>

      <div className="bg-card rounded-2xl shadow-md border border-border p-8 text-center">
        <h2 className="text-lg font-semibold text-foreground mb-2">Compliance Dashboard</h2>
        <p className="text-muted-foreground mb-4">Compliance interface loads here.</p>
        <p className="text-sm text-muted-foreground">Connected to Compliance API endpoints.</p>
      </div>
    </div>
  );
}
