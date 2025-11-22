import { TutorialLayout, type TutorialContent } from '../_components/TutorialLayout';

const content: TutorialContent = {
  title: 'Financial Reporting & Invoicing',
  summary: 'Set up invoicing, approvals, and reporting so costs and revenue stay transparent.',
  category: 'Finance',
  difficulty: 'Intermediate',
  duration: '25 min',
  outcomes: [
    'Configure invoice templates and approval thresholds',
    'Connect work orders and vendor bills to financial tracking',
    'Publish finance dashboards for stakeholders'
  ],
  steps: [
    {
      title: 'Set up invoicing and approvals',
      highlight: 'Keep approvals simple: clear thresholds and backups to avoid bottlenecks.',
      items: [
        'Create invoice templates (branding, tax, payment terms).',
        'Configure approval rules by amount and category.',
        'Add payment methods and expected settlement timelines.'
      ]
    },
    {
      title: 'Map work orders to costs',
      items: [
        'Ensure work orders capture labor, parts, and vendor charges.',
        'Attach receipts, quotes, and completion evidence for auditability.',
        'Use cost centers or properties to tag spend correctly.'
      ]
    },
    {
      title: 'Issue and send invoices',
      items: [
        'Generate invoices from completed work orders or contracts.',
        'Send digitally with payment links or bank details.',
        'Track due dates and reminders; auto-flag overdue invoices.'
      ]
    },
    {
      title: 'Monitor performance',
      items: [
        'Use dashboards for collections, aging, and cost vs. budget.',
        'Export CSV/PDF for finance teams or auditors.',
        'Review monthly trends to adjust pricing or SLAs.'
      ]
    }
  ],
  nextActions: [
    'Align approval thresholds with finance and operations leads.',
    'Backfill recent invoices so reporting is complete.',
    'Schedule weekly aging reports to stakeholders.'
  ]
};

export const metadata = {
  title: `${content.title} | Fixzit Help`
};

export default function Page() {
  return <TutorialLayout content={content} />;
}
