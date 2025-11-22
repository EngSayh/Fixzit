import { TutorialLayout, type TutorialContent } from '../_components/TutorialLayout';

const content: TutorialContent = {
  title: 'Creating Your First Work Order',
  summary: 'Draft, assign, and track a work order from start to finish using Fixzit workflows.',
  category: 'Work Orders',
  difficulty: 'Beginner',
  duration: '10 min',
  outcomes: [
    'Create a standardized work order with the right priority and SLA',
    'Assign the task to a technician or vendor and set due dates',
    'Track status, notes, and attachments in one place'
  ],
  steps: [
    {
      title: 'Open Work Orders and start a new request',
      highlight: 'Use consistent titles and priorities so routing rules work correctly.',
      items: [
        'Go to Work Orders → New Work Order.',
        'Select property/site and category (Maintenance, HVAC, Electrical, etc.).',
        'Set priority, due date, and SLA target if applicable.'
      ]
    },
    {
      title: 'Add details and scope',
      items: [
        'Describe the issue clearly; add photos or videos for context.',
        'Choose required skills/tools if your org uses skill routing.',
        'Attach related assets, past work orders, or manuals.'
      ]
    },
    {
      title: 'Assign and notify',
      items: [
        'Assign to an internal technician or approved vendor.',
        'Set notification preferences (assignee + requester).',
        'If using vendor assignment, ensure rates and terms are visible.'
      ]
    },
    {
      title: 'Track progress',
      items: [
        'Monitor status changes (Open → In Progress → Completed).',
        'Add technician notes, time logs, and parts used.',
        'Upload completion photos and obtain requester sign-off if needed.'
      ]
    },
    {
      title: 'Close and review',
      items: [
        'Verify resolution, close the work order, and record final time/cost.',
        'Trigger follow-up tasks or preventive actions if patterns emerge.'
      ]
    }
  ],
  nextActions: [
    'Set up default priorities and SLA targets in Work Orders → Settings.',
    'Create templates for recurring issues (e.g., AC filter change, lighting).',
    'Enable vendor notifications so assignees get updates instantly.'
  ]
};

export const metadata = {
  title: `${content.title} | Fixzit Help`
};

export default function Page() {
  return <TutorialLayout content={content} />;
}
