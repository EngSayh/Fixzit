// src/lib/ai/tools.ts - AI Assistant tool definitions and execution

import { z } from 'zod';

// Tool schemas
export const CreateWorkOrderSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(10).max(1000),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  category: z.enum(['maintenance', 'repair', 'inspection', 'emergency']).default('maintenance'),
  propertyId: z.string().optional(),
  unitId: z.string().optional()
});

export const ListWorkOrdersSchema = z.object({
  status: z.enum(['all', 'new', 'in_progress', 'completed', 'cancelled']).default('all'),
  limit: z.number().min(1).max(20).default(5),
  mine: z.boolean().default(true)
});

export const ApproveQuotationSchema = z.object({
  workOrderId: z.string(),
  action: z.enum(['approve', 'reject']).default('approve'),
  comments: z.string().optional()
});

export const OwnerStatementsSchema = z.object({
  ownerId: z.string().optional(),
  period: z.enum(['YTD', 'MTD', 'last_month', 'last_quarter']).default('YTD')
});

export const ScheduleMaintenanceSchema = z.object({
  propertyId: z.string(),
  type: z.enum(['preventive', 'routine', 'inspection']),
  frequency: z.enum(['weekly', 'monthly', 'quarterly', 'yearly']),
  startDate: z.string().optional()
});

export const DispatchTechnicianSchema = z.object({
  workOrderId: z.string(),
  technicianId: z.string().optional(),
  scheduledDate: z.string().optional(),
  notes: z.string().optional()
});

export const UploadAttachmentSchema = z.object({
  workOrderId: z.string(),
  fileUrl: z.string().url().optional(),
  dataUrl: z.string().optional(),
  caption: z.string().optional()
});

// Tool definitions
export const AI_TOOLS = [
  {
    name: 'create_work_order',
    description: 'Create a new maintenance work order',
    schema: CreateWorkOrderSchema,
    requiredRoles: ['TENANT', 'TECHNICIAN', 'PROPERTY_OWNER', 'MANAGEMENT', 'CORP_ADMIN', 'SUPER_ADMIN'],
    endpoint: '/api/ai/tools/create-ticket',
    examples: {
      en: [
        'Create a work order for AC not working',
        'Report a water leak in apartment 203',
        'Request maintenance for broken door lock'
      ],
      ar: [
        'إنشاء طلب صيانة لتكييف لا يعمل',
        'الإبلاغ عن تسرب مياه في الشقة 203',
        'طلب صيانة لقفل باب مكسور'
      ]
    }
  },
  
  {
    name: 'list_work_orders',
    description: 'List work orders based on filters',
    schema: ListWorkOrdersSchema,
    requiredRoles: ['ALL'],
    endpoint: '/api/ai/tools/list-tickets',
    examples: {
      en: [
        'Show my open tickets',
        'List all work orders',
        'What maintenance requests are pending?'
      ],
      ar: [
        'عرض تذاكري المفتوحة',
        'قائمة جميع أوامر العمل',
        'ما هي طلبات الصيانة المعلقة؟'
      ]
    }
  },
  
  {
    name: 'approve_quotation',
    description: 'Approve or reject a work order quotation',
    schema: ApproveQuotationSchema,
    requiredRoles: ['PROPERTY_OWNER', 'MANAGEMENT', 'FINANCE', 'CORP_ADMIN', 'SUPER_ADMIN'],
    endpoint: '/api/ai/tools/approve-quote',
    examples: {
      en: [
        'Approve quote for work order WO-123',
        'Reject quotation 456 - too expensive',
        'Approve the AC repair quote'
      ],
      ar: [
        'الموافقة على عرض السعر لأمر العمل WO-123',
        'رفض عرض السعر 456 - مكلف جداً',
        'الموافقة على عرض إصلاح التكييف'
      ]
    }
  },
  
  {
    name: 'owner_statements',
    description: 'Get financial statements for property owners',
    schema: OwnerStatementsSchema,
    requiredRoles: ['PROPERTY_OWNER', 'FINANCE', 'MANAGEMENT', 'CORP_ADMIN', 'SUPER_ADMIN'],
    endpoint: '/api/ai/tools/owner-statements',
    examples: {
      en: [
        'Show my YTD statements',
        'Get financial summary for this month',
        'View owner statements'
      ],
      ar: [
        'عرض كشوفاتي منذ بداية العام',
        'الحصول على الملخص المالي لهذا الشهر',
        'عرض كشوفات المالك'
      ]
    }
  },
  
  {
    name: 'schedule_maintenance',
    description: 'Schedule preventive or routine maintenance',
    schema: ScheduleMaintenanceSchema,
    requiredRoles: ['TECHNICIAN', 'MANAGEMENT', 'CORP_ADMIN', 'SUPER_ADMIN'],
    endpoint: '/api/ai/tools/schedule-maintenance',
    examples: {
      en: [
        'Schedule monthly AC maintenance',
        'Set up quarterly property inspection',
        'Create preventive maintenance plan'
      ],
      ar: [
        'جدولة صيانة شهرية للتكييف',
        'إعداد فحص ربع سنوي للعقار',
        'إنشاء خطة صيانة وقائية'
      ]
    }
  },
  
  {
    name: 'dispatch_technician',
    description: 'Assign and dispatch technician to work order',
    schema: DispatchTechnicianSchema,
    requiredRoles: ['TECHNICIAN', 'MANAGEMENT', 'CORP_ADMIN', 'SUPER_ADMIN'],
    endpoint: '/api/ai/tools/dispatch',
    examples: {
      en: [
        'Assign technician to WO-123',
        'Dispatch someone for the plumbing issue',
        'Schedule technician visit for tomorrow'
      ],
      ar: [
        'تعيين فني لأمر العمل WO-123',
        'إرسال شخص لمشكلة السباكة',
        'جدولة زيارة الفني ليوم غد'
      ]
    }
  },
  {
    name: 'upload_attachment',
    description: 'Upload a photo or file to a work order',
    schema: UploadAttachmentSchema,
    requiredRoles: ['TENANT', 'TECHNICIAN', 'PROPERTY_OWNER', 'MANAGEMENT', 'CORP_ADMIN', 'SUPER_ADMIN'],
    endpoint: '/api/ai/tools/upload-attachment',
    examples: {
      en: [
        'Upload photo to ticket #64f3a...',
        'Add image to WO-1234',
        'Attach file to my work order'
      ],
      ar: [
        'ارفع صورة على أمر العمل',
        'إضافة مرفق لأمر العمل',
        'أرفق صورة للتذكرة'
      ]
    }
  }
];

// Tool execution
export async function executeTool(
  toolName: string,
  params: any,
  session: any,
  baseUrl: string = ''
): Promise<any> {
  const tool = AI_TOOLS.find(t => t.name === toolName);
  
  if (!tool) {
    throw new Error(`Unknown tool: ${toolName}`);
  }
  
  // Check role permissions
  if (tool.requiredRoles[0] !== 'ALL' && !tool.requiredRoles.includes(session.role)) {
    throw new Error(`Insufficient permissions for tool: ${toolName}`);
  }
  
  // Validate parameters
  const validated = tool.schema.parse(params);
  
  // Execute tool
  const response = await fetch(`${baseUrl}${tool.endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.token}`,
      'X-User-Id': session.userId,
      'X-Org-Id': session.orgId,
      'X-Role': session.role
    },
    body: JSON.stringify(validated)
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `Tool execution failed: ${response.status}`);
  }
  
  return response.json();
}

// Tool intent detection
export function detectToolIntent(message: string, locale: string = 'en'): { tool: string | null; params: any } {
  const lowerMessage = message.toLowerCase();
  
  for (const tool of AI_TOOLS) {
    const examples = tool.examples[locale as keyof typeof tool.examples] || tool.examples.en;
    
    for (const example of examples) {
      if (lowerMessage.includes(example.toLowerCase().slice(0, 10))) {
        // Extract parameters based on tool
        const params = extractToolParams(message, tool.name, locale);
        return { tool: tool.name, params };
      }
    }
  }
  
  // Check for slash commands
  if (lowerMessage.startsWith('/')) {
    const command = lowerMessage.split(' ')[0].slice(1);
    const toolMap: Record<string, string> = {
      'new-ticket': 'create_work_order',
      'my-tickets': 'list_work_orders',
      'approve': 'approve_quotation',
      'statements': 'owner_statements',
      'schedule': 'schedule_maintenance',
      'dispatch': 'dispatch_technician'
    };
    
    if (toolMap[command]) {
      const params = extractToolParams(message, toolMap[command], locale);
      return { tool: toolMap[command], params };
    }
  }
  
  return { tool: null, params: {} };
}

function extractToolParams(message: string, toolName: string, locale: string): any {
  const params: any = {};
  
  switch (toolName) {
    case 'create_work_order':
      // Extract title and description
      const titleMatch = message.match(/(?:title:|for |about |regarding )(.*?)(?:desc:|description:|$)/i);
      if (titleMatch) {
        params.title = titleMatch[1].trim();
      } else {
        params.title = message.slice(0, 50);
      }
      
      const descMatch = message.match(/(?:desc:|description:|details:)(.*)/i);
      params.description = descMatch ? descMatch[1].trim() : message;
      
      // Extract priority
      if (message.match(/urgent|emergency|asap/i)) {
        params.priority = 'urgent';
      } else if (message.match(/high|important/i)) {
        params.priority = 'high';
      } else if (message.match(/low|minor/i)) {
        params.priority = 'low';
      }
      break;
      
    case 'list_work_orders':
      // Extract status filter
      if (message.match(/open|pending|new/i)) {
        params.status = 'new';
      } else if (message.match(/progress|ongoing/i)) {
        params.status = 'in_progress';
      } else if (message.match(/completed|done|finished/i)) {
        params.status = 'completed';
      }
      
      // Extract ownership
      params.mine = message.match(/my|mine/i) !== null;
      break;
      
    case 'approve_quotation':
      // Extract work order ID
      const idMatch = message.match(/(?:WO-|work order |ticket |#)(\w+)/i);
      if (idMatch) {
        params.workOrderId = idMatch[1];
      }
      
      // Extract action
      if (message.match(/reject|deny|decline/i)) {
        params.action = 'reject';
      } else {
        params.action = 'approve';
      }
      
      // Extract comments
      const commentMatch = message.match(/(?:because|reason:|comment:)(.*)/i);
      if (commentMatch) {
        params.comments = commentMatch[1].trim();
      }
      break;
      
    case 'owner_statements':
      // Extract period
      if (message.match(/month|MTD|monthly/i)) {
        params.period = 'MTD';
      } else if (message.match(/quarter/i)) {
        params.period = 'last_quarter';
      } else if (message.match(/year|YTD|annual/i)) {
        params.period = 'YTD';
      }
      break;
    case 'upload_attachment':
      {
        // Capture a simple WO id pattern
        const idMatch = message.match(/(?:WO-|ticket |#)([a-zA-Z0-9]+)/i);
        if (idMatch) params.workOrderId = idMatch[1];
        const urlMatch = message.match(/https?:\/\/[\S]+/i);
        if (urlMatch) params.fileUrl = urlMatch[0];
      }
      break;
  }
  
  return params;
}

// Format tool response
export function formatToolResponse(toolName: string, result: any, locale: string = 'en'): string {
  const messages = {
    en: {
      create_work_order: `✅ Work order created successfully!\n📋 ID: ${result.data?.id}\n📍 Status: New`,
      list_work_orders: `📋 Found ${result.data?.tickets?.length || 0} work orders`,
      approve_quotation: `✅ ${result.data?.message || 'Quotation processed'}`,
      owner_statements: `💰 ${result.data?.message || 'Statements retrieved'}\n💵 Total Revenue: ${result.data?.summary?.totalRevenue || 0} SAR`,
      schedule_maintenance: `📅 Maintenance scheduled successfully`,
      dispatch_technician: `👷 Technician dispatched to work order`
    },
    ar: {
      create_work_order: `✅ تم إنشاء أمر العمل بنجاح!\n📋 المعرف: ${result.data?.id}\n📍 الحالة: جديد`,
      list_work_orders: `📋 تم العثور على ${result.data?.tickets?.length || 0} أمر عمل`,
      approve_quotation: `✅ ${result.data?.message || 'تمت معالجة عرض السعر'}`,
      owner_statements: `💰 ${result.data?.message || 'تم استرجاع الكشوفات'}\n💵 إجمالي الإيرادات: ${result.data?.summary?.totalRevenue || 0} ريال`,
      schedule_maintenance: `📅 تم جدولة الصيانة بنجاح`,
      dispatch_technician: `👷 تم إرسال الفني لأمر العمل`
    }
  };
  
  const langMessages = messages[locale as keyof typeof messages] || messages.en;
  return langMessages[toolName as keyof typeof langMessages] || JSON.stringify(result.data);
}
