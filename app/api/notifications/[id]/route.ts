import { NextRequest, NextResponse } from "next/server";

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

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const notification = mockNotifications.find(n => n.id === params.id);

  if (!notification) {
    return NextResponse.json({ error: "Notification not found" }, { status: 404 });
  }

  return NextResponse.json(notification);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const notificationIndex = mockNotifications.findIndex(n => n.id === params.id);

  if (notificationIndex === -1) {
    return NextResponse.json({ error: "Notification not found" }, { status: 404 });
  }

  const body = await req.json();
  const { read, archived } = body;

  if (read !== undefined) {
    mockNotifications[notificationIndex].read = read;
  }

  if (archived !== undefined) {
    mockNotifications[notificationIndex] = {
      ...mockNotifications[notificationIndex],
      archived
    };
  }

  return NextResponse.json(mockNotifications[notificationIndex]);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const notificationIndex = mockNotifications.findIndex(n => n.id === params.id);

  if (notificationIndex === -1) {
    return NextResponse.json({ error: "Notification not found" }, { status: 404 });
  }

  mockNotifications.splice(notificationIndex, 1);

  return NextResponse.json({ success: true });
}
