'use client';

import { useTranslation } from '@/contexts/TranslationContext';

const PAGE_LABELS = {
  workOrders: {
    titleKey: 'pageLabels.workOrders.title',
    subtitleKey: 'pageLabels.workOrders.subtitle',
    titleFallback: 'Work Orders',
    subtitleFallback: 'Dispatch, preventive programs, and SLA tracking',
  },
  properties: {
    titleKey: 'pageLabels.properties.title',
    subtitleKey: 'pageLabels.properties.subtitle',
    titleFallback: 'Properties',
    subtitleFallback: 'Full building, unit, and tenant records',
  },
  assets: {
    titleKey: 'pageLabels.assets.title',
    subtitleKey: 'pageLabels.assets.subtitle',
    titleFallback: 'Assets',
    subtitleFallback: 'Asset registry with lifecycle and maintenance data',
  },
  tenants: {
    titleKey: 'pageLabels.tenants.title',
    subtitleKey: 'pageLabels.tenants.subtitle',
    titleFallback: 'Tenants',
    subtitleFallback: 'Lease management, communications, and collections',
  },
  vendors: {
    titleKey: 'pageLabels.vendors.title',
    subtitleKey: 'pageLabels.vendors.subtitle',
    titleFallback: 'Vendors',
    subtitleFallback: 'Preferred suppliers, compliance, and performance',
  },
  projects: {
    titleKey: 'pageLabels.projects.title',
    subtitleKey: 'pageLabels.projects.subtitle',
    titleFallback: 'Projects',
    subtitleFallback: 'Capital planning and execution tracking',
  },
  rfqs: {
    titleKey: 'pageLabels.rfqs.title',
    subtitleKey: 'pageLabels.rfqs.subtitle',
    titleFallback: 'RFQs',
    subtitleFallback: 'Request for quotations and bidding workflows',
  },
  invoices: {
    titleKey: 'pageLabels.invoices.title',
    subtitleKey: 'pageLabels.invoices.subtitle',
    titleFallback: 'Invoices',
    subtitleFallback: 'Billing pipeline, approvals, and collections',
  },
  finance: {
    titleKey: 'pageLabels.finance.title',
    subtitleKey: 'pageLabels.finance.subtitle',
    titleFallback: 'Finance',
    subtitleFallback: 'Expenses, budgets, ledgers, and financial reporting',
  },
  hr: {
    titleKey: 'pageLabels.hr.title',
    subtitleKey: 'pageLabels.hr.subtitle',
    titleFallback: 'Human Resources',
    subtitleFallback: 'People operations, payroll, and attendance',
  },
  administration: {
    titleKey: 'pageLabels.administration.title',
    subtitleKey: 'pageLabels.administration.subtitle',
    titleFallback: 'Administration',
    subtitleFallback: 'Governance, policies, and asset oversight',
  },
  crm: {
    titleKey: 'pageLabels.crm.title',
    subtitleKey: 'pageLabels.crm.subtitle',
    titleFallback: 'CRM',
    subtitleFallback: 'Customer relationships, leads, and contracts',
  },
  marketplace: {
    titleKey: 'pageLabels.marketplace.title',
    subtitleKey: 'pageLabels.marketplace.subtitle',
    titleFallback: 'Marketplace',
    subtitleFallback: 'Souq vendor catalogues and procurement requests',
  },
  support: {
    titleKey: 'pageLabels.support.title',
    subtitleKey: 'pageLabels.support.subtitle',
    titleFallback: 'Support',
    subtitleFallback: 'Ticketing, SLAs, and omni-channel care',
  },
  compliance: {
    titleKey: 'pageLabels.compliance.title',
    subtitleKey: 'pageLabels.compliance.subtitle',
    titleFallback: 'Compliance',
    subtitleFallback: 'Contracts, disputes, audits, and risk tracking',
  },
  reports: {
    titleKey: 'pageLabels.reports.title',
    subtitleKey: 'pageLabels.reports.subtitle',
    titleFallback: 'Reports',
    subtitleFallback: 'Operational and financial analytics dashboards',
  },
  system: {
    titleKey: 'pageLabels.system.title',
    subtitleKey: 'pageLabels.system.subtitle',
    titleFallback: 'System',
    subtitleFallback: 'User access, integrations, and billing controls',
  },
  settings: {
    titleKey: 'pageLabels.settings.title',
    subtitleKey: 'pageLabels.settings.subtitle',
    titleFallback: 'Settings',
    subtitleFallback: 'Account preferences and personalization',
  },
} as const;

export type PageLabelKey = keyof typeof PAGE_LABELS;
export const PAGE_LABEL_KEYS = Object.keys(PAGE_LABELS) as PageLabelKey[];

export function usePageLabels(pageKey: PageLabelKey) {
  const { t } = useTranslation();
  const config = PAGE_LABELS[pageKey];
  const title = t(config.titleKey, config.titleFallback);
  const subtitle = t(config.subtitleKey, config.subtitleFallback);
  return { title, subtitle };
}
