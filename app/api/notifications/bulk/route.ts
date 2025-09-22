import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// Mock notifications data (same as in the main route)
const mockNotifications = [
  {
    id: 'notif-1',
    type: 'work-order',
    title: 'WO-1234 Overdue',
    message: 'AC repair in Tower A has exceeded SLA by 2 hours',
    timestamp: '2025-01-22T10:30:00Z',
    read: false,
    priority: 'high',
    category: 'maintenance',
    tenantId: 't-001',
    archived: false
  },
  {
    id: 'notif-2',
    type: 'vendor',
    title: 'New Vendor Registration',
    message: 'Al-Faisal Maintenance submitted registration for approval',
    timestamp: '2025-01-22T09:15:00Z',
    read: false,
    priority: 'medium',
    category: 'vendor',
    tenantId: 't-001',
    archived: false
  },
  {
    id: 'notif-3',
    type: 'payment',
    title: 'Invoice Overdue',
    message: 'Invoice INV-5678 for Tower B is 5 days overdue',
    timestamp: '2025-01-22T08:45:00Z',
    read: true,
    priority: 'high',
    category: 'finance',
    tenantId: 't-001',
    archived: false
  }
];

const bulkActionSchema = z.object({
  action: z.enum(["mark-read", "mark-unread", "archive", "delete"]),
  notificationIds: z.array(z.string())
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action, notificationIds } = bulkActionSchema.parse(body);

  const results = [];
  let successCount = 0;

  for (const id of notificationIds) {
    const notificationIndex = mockNotifications.findIndex(n => n.id === id);

    if (notificationIndex === -1) {
      results.push({ id, success: false, error: "Notification not found" });
      continue;
    }

    try {
      switch (action) {
        case "mark-read":
          mockNotifications[notificationIndex].read = true;
          break;
        case "mark-unread":
          mockNotifications[notificationIndex].read = false;
          break;
        case "archive":
          mockNotifications[notificationIndex] = {
            ...mockNotifications[notificationIndex],
            archived: true
          };
          break;
        case "delete":
          mockNotifications.splice(notificationIndex, 1);
          break;
      }

      results.push({ id, success: true });
      successCount++;
    } catch (error) {
      results.push({ id, success: false, error: "Operation failed" });
    }
  }

  return NextResponse.json({
    success: successCount === notificationIds.length,
    total: notificationIds.length,
    successful: successCount,
    failed: notificationIds.length - successCount,
    results
  });
}
