import ModuleViewTabs from '@/components/fm/ModuleViewTabs';

export default function FinancePage() {
  return (
    <div className="space-y-6">
      <ModuleViewTabs moduleId="finance" />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Finance</h1>
          <p className="text-muted-foreground">Financial management and billing</p>
        </div>
      </div>

      <div className="bg-card rounded-2xl shadow-md border border-border p-8 text-center">
        <h2 className="text-lg font-semibold text-foreground mb-2">Financial Dashboard</h2>
        <p className="text-muted-foreground mb-4">Finance management interface loads here.</p>
        <p className="text-sm text-muted-foreground">Connected to Finance API endpoints.</p>
      </div>
    </div>
  );
}
