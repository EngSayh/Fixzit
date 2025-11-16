'use client';

import ModuleViewTabs from '@/components/fm/ModuleViewTabs';
import { WorkOrdersView } from '@/components/fm/WorkOrdersView';

export default function WorkOrdersPage() {
  return (
    <div className="space-y-6 p-6">
      <ModuleViewTabs moduleId="work_orders" />
      <WorkOrdersView />
    </div>
  );
}

