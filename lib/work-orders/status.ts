type Translator = (key: string, fallback?: string) => string;

const WORK_ORDER_STATUS_LABELS: Record<string, { key: string; fallback: string }> = {
  SUBMITTED: { key: 'status.submitted', fallback: 'Submitted' },
  DISPATCHED: { key: 'status.dispatched', fallback: 'Dispatched' },
  IN_PROGRESS: { key: 'status.inProgress', fallback: 'In Progress' },
  ON_HOLD: { key: 'status.onHold', fallback: 'On Hold' },
  COMPLETED: { key: 'status.completed', fallback: 'Completed' },
  VERIFIED: { key: 'status.verified', fallback: 'Verified' },
  CLOSED: { key: 'status.closed', fallback: 'Closed' },
  CANCELLED: { key: 'status.cancelled', fallback: 'Cancelled' },
  PENDING: { key: 'status.pending', fallback: 'Pending' },
  APPROVED: { key: 'status.approved', fallback: 'Approved' },
  REJECTED: { key: 'status.rejected', fallback: 'Rejected' },
  OPEN: { key: 'status.open', fallback: 'Open' },
  DRAFT: { key: 'status.draft', fallback: 'Draft' },
  SCHEDULED: { key: 'workOrders.status.scheduled', fallback: 'Scheduled' },
  DUE: { key: 'workOrders.status.due', fallback: 'Due soon' },
  OVERDUE: { key: 'workOrders.status.overdue', fallback: 'Overdue' },
  UNDER_REVIEW: { key: 'workOrders.status.underReview', fallback: 'Under review' },
  VERIFICATION: { key: 'status.verified', fallback: 'Verified' },
};

/**
 * Maps backend work-order statuses (case-insensitive, ignores dashes/spaces)
 * to translated labels.
 */
export function getWorkOrderStatusLabel(t: Translator, status?: string | null): string {
  if (!status) {
    return '';
  }

  const normalized = status.replace(/[\s-]+/g, '_').toUpperCase();
  const entry = WORK_ORDER_STATUS_LABELS[normalized];

  if (entry) {
    return t(entry.key, entry.fallback);
  }

  return status;
}
