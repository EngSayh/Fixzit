'use client';

import CopilotWidget from '@/src/components/CopilotWidget';
import { Bot } from 'lucide-react';

export default function CopilotPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto max-w-4xl space-y-8 px-4">
        <div className="rounded-3xl bg-white p-8 shadow-xl">
          <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0061A8] text-white">
              <Bot className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Fixzit Copilot</h1>
              <p className="text-sm text-gray-500">
                An enterprise-ready AI assistant with strict tenant privacy, RBAC controls, and self-service actions.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[2fr,1fr]">
            <div className="rounded-2xl border border-gray-100 bg-gray-50/80 p-4">
              <CopilotWidget embedded autoOpen />
            </div>
            <aside className="space-y-4 text-sm text-gray-600">
              <div className="rounded-2xl border border-[#0061A8]/20 bg-white p-4">
                <h2 className="text-sm font-semibold text-[#0061A8]">Capabilities</h2>
                <ul className="mt-3 space-y-2">
                  <li>• Create and track work orders within your tenant scope.</li>
                  <li>• Dispatch, schedule visits, and upload site photos with audit logging.</li>
                  <li>• Retrieve finance statements or portfolio metrics according to your role.</li>
                </ul>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white p-4">
                <h2 className="text-sm font-semibold text-gray-800">Privacy guardrails</h2>
                <ul className="mt-3 space-y-2">
                  <li>• Tenant isolation is enforced on every response and tool call.</li>
                  <li>• Data classes (finance, owner, HR) respect your RBAC permissions.</li>
                  <li>• Sensitive identifiers are redacted automatically in answers.</li>
                </ul>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
