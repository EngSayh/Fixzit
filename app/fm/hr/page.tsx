import ModuleViewTabs from '@/components/fm/ModuleViewTabs';

export default function HRPage() {
  return (
    <div className="space-y-6">
      <ModuleViewTabs moduleId="hr" />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Human Resources</h1>
          <p className="text-muted-foreground">Employee management and HR operations</p>
        </div>
      </div>

      <div className="bg-card rounded-2xl shadow-md border border-border p-8 text-center">
        <h2 className="text-lg font-semibold text-foreground mb-2">HR Management</h2>
        <p className="text-muted-foreground mb-4">Human resources interface loads here.</p>
        <p className="text-sm text-muted-foreground">Connected to HR API endpoints.</p>
      </div>
    </div>
  );
}
