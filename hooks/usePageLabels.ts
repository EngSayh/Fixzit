'use client';

import { useTranslation } from '@/contexts/TranslationContext';

const PAGE_LABEL_FALLBACKS = {
  workOrders: {
    title: 'Work Orders',
    subtitle: 'Dispatch, preventive programs, and SLA tracking',
  },
  properties: {
    title: 'Properties',
    subtitle: 'Full building, unit, and tenant records',
  },
  assets: {
    title: 'Assets',
    subtitle: 'Asset registry with lifecycle and maintenance data',
  },
  tenants: {
    title: 'Tenants',
    subtitle: 'Lease management, communications, and collections',
  },
  vendors: {
    title: 'Vendors',
    subtitle: 'Preferred suppliers, compliance, and performance',
  },
  projects: {
    title: 'Projects',
    subtitle: 'Capital planning and execution tracking',
  },
  rfqs: {
    title: 'RFQs',
    subtitle: 'Request for quotations and bidding workflows',
  },
  invoices: {
    title: 'Invoices',
    subtitle: 'Billing pipeline, approvals, and collections',
  },
  finance: {
    title: 'Finance',
    subtitle: 'Expenses, budgets, ledgers, and financial reporting',
  },
  hr: {
    title: 'Human Resources',
    subtitle: 'People operations, payroll, and attendance',
  },
  administration: {
    title: 'Administration',
    subtitle: 'Governance, policies, and asset oversight',
  },
  crm: {
    title: 'CRM',
    subtitle: 'Customer relationships, leads, and contracts',
  },
  marketplace: {
    title: 'Marketplace',
    subtitle: 'Souq vendor catalogues and procurement requests',
  },
  support: {
    title: 'Support',
    subtitle: 'Ticketing, SLAs, and omni-channel care',
  },
  compliance: {
    title: 'Compliance',
    subtitle: 'Contracts, disputes, audits, and risk tracking',
  },
  reports: {
    title: 'Reports',
    subtitle: 'Operational and financial analytics dashboards',
  },
  system: {
    title: 'System',
    subtitle: 'User access, integrations, and billing controls',
  },
  settings: {
    title: 'Settings',
    subtitle: 'Account preferences and personalization',
  },
} as const;

export type PageLabelKey = keyof typeof PAGE_LABEL_FALLBACKS;

export function usePageLabels(pageKey: PageLabelKey) {
  const { t } = useTranslation();
  const fallback = PAGE_LABEL_FALLBACKS[pageKey];
  const title = t(`pageLabels.${pageKey}.title`, fallback.title);
  const subtitle = t(`pageLabels.${pageKey}.subtitle`, fallback.subtitle);
  return { title, subtitle };
}

