import ModuleViewTabs from '@/components/fm/ModuleViewTabs';
import { useAutoTranslator } from '@/i18n/useAutoTranslator';

export default function ReportsPage() {
  const auto = useAutoTranslator('fm.reports');

  return (
    <div className="space-y-6">
      <ModuleViewTabs moduleId="reports" />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {auto('Reports', 'header.title')}
          </h1>
          <p className="text-muted-foreground">
            {auto('Analytics and reporting dashboard', 'header.subtitle')}
          </p>
        </div>
      </div>

      <div className="bg-card rounded-2xl shadow-md border border-border p-8 text-center">
        <h2 className="text-lg font-semibold text-foreground mb-2">
          {auto('Reports & Analytics', 'card.title')}
        </h2>
        <p className="text-muted-foreground mb-4">
          {auto('Reports interface loads here.', 'card.description')}
        </p>
        <p className="text-sm text-muted-foreground">
          {auto('Connected to Reports API endpoints.', 'card.footer')}
        </p>
      </div>
    </div>
  );
}
