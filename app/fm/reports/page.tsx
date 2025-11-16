import ModuleViewTabs from '@/components/fm/ModuleViewTabs';

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <ModuleViewTabs moduleId="reports" />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reports</h1>
          <p className="text-muted-foreground">Analytics and reporting dashboard</p>
        </div>
      </div>

      <div className="bg-card rounded-2xl shadow-md border border-border p-8 text-center">
        <h2 className="text-lg font-semibold text-foreground mb-2">Reports & Analytics</h2>
        <p className="text-muted-foreground mb-4">Reports interface loads here.</p>
        <p className="text-sm text-muted-foreground">Connected to Reports API endpoints.</p>
      </div>
    </div>
  );
}
