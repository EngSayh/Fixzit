import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const notificationSchema = z.object({
  title: z.string().min(1),
  message: z.string().min(1),
  type: z.enum(["work-order", "vendor", "payment", "maintenance", "system"]),
  priority: z.enum(["low", "medium", "high"]),
  category: z.enum(["maintenance", "vendor", "finance", "system"]),
  tenantId: z.string().optional()
});

// Mock notifications data
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
    tenantId: 't-001'
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
    tenantId: 't-001'
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
    tenantId: 't-001'
  },
  {
    id: 'notif-4',
    type: 'maintenance',
    title: 'Scheduled Maintenance Due',
    message: 'Monthly elevator inspection for Tower A is due today',
    timestamp: '2025-01-22T07:00:00Z',
    read: true,
    priority: 'medium',
    category: 'maintenance',
    tenantId: 't-001'
  },
  {
    id: 'notif-5',
    type: 'system',
    title: 'System Update Available',
    message: 'New features available: Enhanced reporting and mobile app improvements',
    timestamp: '2025-01-21T16:30:00Z',
    read: true,
    priority: 'low',
    category: 'system',
    tenantId: 't-001'
  }
];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";
  const category = searchParams.get("category") || "";
  const priority = searchParams.get("priority") || "";
  const read = searchParams.get("read") || "";
  const page = Number(searchParams.get("page") || 1);
  const limit = Math.min(Number(searchParams.get("limit") || 20), 100);

  let filtered = mockNotifications;

  // Apply filters
  if (q) {
    filtered = filtered.filter(n =>
      n.title.toLowerCase().includes(q.toLowerCase()) ||
      n.message.toLowerCase().includes(q.toLowerCase())
    );
  }

  if (category && category !== 'all') {
    filtered = filtered.filter(n => n.category === category);
  }

  if (priority && priority !== 'all') {
    filtered = filtered.filter(n => n.priority === priority);
  }

  if (read !== '') {
    const readFilter = read === 'true';
    filtered = filtered.filter(n => n.read === readFilter);
  }

  // Sort by timestamp (most recent first)
  filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Apply pagination
  const start = (page - 1) * limit;
  const end = start + limit;
  const items = filtered.slice(start, end);

  return NextResponse.json({
    items,
    total: filtered.length,
    page,
    limit,
    hasMore: end < filtered.length
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const data = notificationSchema.parse(body);

  const newNotification = {
    id: `notif-${Date.now()}`,
    ...data,
    timestamp: new Date().toISOString(),
    read: false,
    tenantId: data.tenantId || 't-001'
  };

  // In a real implementation, this would be saved to the database
  mockNotifications.unshift(newNotification);

  return NextResponse.json(newNotification, { status: 201 });
}

