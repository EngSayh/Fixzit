// app/api/ai/chat/route.ts - AI chat endpoint with privacy and RBAC enforcement
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/src/lib/auth/session';
import { canPerformAction, Role, ModuleKey } from '@/src/lib/rbac';
import { detectToolIntent } from '@/src/lib/ai/tools';
import { dbConnect } from '@/src/db/mongoose';
import mongoose from 'mongoose';

// No direct DB access from chat route; tools/endpoints handle data ops

// Helper: call KB answer endpoint for RAG answer
async function getKbAnswer(req: NextRequest, params: { question: string; orgId: string; lang: 'ar'|'en'; role: string; route?: string }): Promise<string> {
  try {
    const url = new URL('/api/kb/answer', req.url);
    const res = await fetch(url.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: params.question, orgId: params.orgId, lang: params.lang, role: params.role, route: params.route })
    });
    if (!res.ok) return '';
    const json = await res.json();
    return json.answer || '';
  } catch {
    return '';
  }
}

export async function POST(req: NextRequest) {
  try {
    // Get user session
    const user = await getCurrentUser(req);

    if (!user) {
      return NextResponse.json({
        reply: 'Please sign in to use the AI assistant.',
        actions: []
      });
    }

    const { messages, session, locale } = await req.json();

    // Enforce privacy and security
    const privacyCheck = await enforcePrivacy(user, messages);
    if (!privacyCheck.allowed) {
      return NextResponse.json({
        reply: privacyCheck.message,
        actions: []
      });
    }

    // Process the conversation
    const lastMessage = messages[messages.length - 1];
    // Prefer structured tool intent detection
    const detected = detectToolIntent(lastMessage.content || '', locale || user.locale || 'en');
    const userIntent = detected.tool ? { action: detected.tool, module: mapToolToModule(detected.tool) } : analyzeIntent(lastMessage.content, locale);

    // Check if user has permission for requested action
    if (userIntent.action && !canPerformAction(user.role as Role, userIntent.module as ModuleKey, 'read')) {
      return NextResponse.json({
        reply: locale === 'ar'
          ? `عذراً، ليس لديك صلاحية للوصول إلى ${userIntent.module}`
          : `Sorry, you don't have permission to access ${userIntent.module}`,
        actions: []
      });
    }

    // Build tool action descriptors (client will execute endpoints)
    let actions: any[] = [];
    if (userIntent.action) {
      actions = buildActionDescriptors(userIntent, detected.params || {}, user);
    }

    // Generate response: for general Q&A use KB RAG, for tool intents provide short guidance
    let response = '';
    if (!userIntent.action) {
      const kb = await getKbAnswer(req, { question: lastMessage.content || '', orgId: user.orgId, lang: (locale || user.locale || 'en') as 'ar'|'en', role: user.role });
      response = kb || (locale === 'ar'
        ? 'لا أملك إجابة وافية الآن. جرّب إعادة الصياغة أو اطلب مساعدة محددة.'
        : 'I do not have a precise answer. Try rephrasing or ask for a specific action.');
    } else {
      response = locale === 'ar'
        ? 'سأنفّذ الإجراء المطلوب ضمن صلاحياتك ونطاق المستأجر.'
        : 'I will perform the requested action within your role and tenant scope.';
    }

    // Log the conversation for audit
    await logConversation(user, messages, response, actions);

    return NextResponse.json({
      reply: response,
      actions: actions
    });

  } catch (error) {
    console.error('AI Chat API error:', error);
    return NextResponse.json({
      reply: 'An error occurred while processing your request. Please try again.',
      actions: []
    }, { status: 500 });
  }
}

async function enforcePrivacy(user: any, messages: any[]) {
  // Check for cross-tenant data requests
  const lastMessage = messages[messages.length - 1]?.content.toLowerCase();

  if (lastMessage?.includes('other tenant') ||
      lastMessage?.includes('different company') ||
      lastMessage?.includes('مستأجر آخر') ||
      lastMessage?.includes('شركة مختلفة')) {
    return {
      allowed: false,
      message: user.locale === 'ar'
        ? 'لا يمكنني مشاركة معلومات مستأجرين آخرين لحماية خصوصية البيانات.'
        : 'I cannot share information about other tenants to protect data privacy.'
    };
  }

  // Check for sensitive data requests
  if (lastMessage?.includes('financial') && !canPerformAction(user.role as Role, 'finance' as ModuleKey, 'read')) {
    return {
      allowed: false,
      message: user.locale === 'ar'
        ? 'ليس لديك صلاحية للوصول إلى المعلومات المالية.'
        : 'You do not have permission to access financial information.'
    };
  }

  if (lastMessage?.includes('hr') && !canPerformAction(user.role as Role, 'hr' as ModuleKey, 'read')) {
    return {
      allowed: false,
      message: user.locale === 'ar'
        ? 'ليس لديك صلاحية للوصول إلى معلومات الموارد البشرية.'
        : 'You do not have permission to access HR information.'
    };
  }

  return { allowed: true };
}

function analyzeIntent(message: string, locale: string) {
  const lowerMessage = message.toLowerCase();

  // Intent patterns
  const intents = {
    create_ticket: {
      patterns: locale === 'ar'
        ? ['إنشاء تذكرة', 'تذكرة جديدة', 'طلب صيانة', 'مشكلة']
        : ['create ticket', 'new ticket', 'maintenance request', 'issue', 'problem'],
      action: 'create_ticket',
      module: 'work_orders'
    },
    list_tickets: {
      patterns: locale === 'ar'
        ? ['تذاكري', 'قائمة التذاكر', 'التذاكر الخاصة بي', 'عرض التذاكر']
        : ['my tickets', 'list tickets', 'show tickets', 'view tickets'],
      action: 'list_tickets',
      module: 'work_orders'
    },
    property_info: {
      patterns: locale === 'ar'
        ? ['عقار', 'عقارات', 'ملكية', 'شقة', 'فيلا']
        : ['property', 'properties', 'apartment', 'villa', 'office'],
      action: 'property_info',
      module: 'properties'
    },
    help: {
      patterns: locale === 'ar'
        ? ['مساعدة', 'كيف', 'طريقة', 'دليل']
        : ['help', 'how', 'guide', 'tutorial'],
      action: 'help',
      module: 'dashboard'
    },
    schedule_maintenance: {
      patterns: locale === 'ar'
        ? ['جدولة صيانة', 'صيانة وقائية', 'فحص دوري']
        : ['schedule maintenance', 'preventive maintenance', 'routine inspection'],
      action: 'schedule_maintenance',
      module: 'work_orders'
    },
    dispatch_technician: {
      patterns: locale === 'ar'
        ? ['إرسال فني', 'تعيين فني', 'جدولة فني']
        : ['dispatch technician', 'assign technician', 'schedule technician'],
      action: 'dispatch_technician',
      module: 'work_orders'
    }
  };

  for (const intent of Object.values(intents)) {
    if (intent.patterns.some(pattern => lowerMessage.includes(pattern))) {
      return intent;
    }
  }

  return { action: null, module: 'dashboard' };
}

function buildActionDescriptors(intent: any, params: any, user: any) {
  const actions: any[] = [];
  switch (intent.action) {
    case 'create_ticket':
    case 'create_work_order':
      actions.push({
        type: 'tool',
        name: 'create_work_order',
        endpoint: '/api/ai/tools/create-ticket',
        method: 'POST',
        payload: { ...params },
      });
      break;
    case 'list_tickets':
    case 'list_work_orders':
      actions.push({
        type: 'tool',
        name: 'list_work_orders',
        endpoint: `/api/ai/tools/list-tickets?limit=${params.limit || 5}${params.status ? `&status=${params.status}` : ''}`,
        method: 'GET'
      });
      break;
    case 'owner_statements':
      actions.push({
        type: 'tool',
        name: 'owner_statements',
        endpoint: '/api/ai/tools/owner-statements',
        method: 'POST',
        payload: { ownerId: params.ownerId || user.id, period: params.period || 'YTD' }
      });
      break;
    case 'approve_quotation':
      actions.push({
        type: 'tool',
        name: 'approve_quotation',
        endpoint: '/api/ai/tools/approve-quote',
        method: 'POST',
        payload: { workOrderId: params.workOrderId, action: params.action || 'approve', comments: params.comments }
      });
      break;
    case 'schedule_maintenance':
      actions.push({
        type: 'tool',
        name: 'schedule_maintenance',
        endpoint: '/api/ai/tools/schedule-maintenance',
        method: 'POST',
        payload: { ...params }
      });
      break;
    case 'dispatch_technician':
      actions.push({
        type: 'tool',
        name: 'dispatch_technician',
        endpoint: '/api/ai/tools/dispatch',
        method: 'POST',
        payload: { ...params }
      });
      break;
    case 'upload_attachment':
      actions.push({
        type: 'tool',
        name: 'upload_attachment',
        endpoint: '/api/ai/tools/upload-attachment',
        method: 'POST',
        payload: { ...params }
      });
      break;
    case 'help':
      actions.push({ type: 'info', message: 'help' });
      break;
  }
  return actions;
}

function mapToolToModule(tool: string): string {
  switch (tool) {
    case 'create_work_order':
    case 'list_work_orders':
    case 'approve_quotation':
    case 'schedule_maintenance':
    case 'dispatch_technician':
      return 'work_orders';
    case 'owner_statements':
      return 'finance';
    default:
      return 'dashboard';
  }
}

// generateResponse removed in favor of KB RAG + short guidance

async function logConversation(user: any, messages: any[], response: string, actions: any[]) {
  try {
    await dbConnect();
    const native = (mongoose.connection as any).db;
    await native.collection('ai_conversations').insertOne({
      userId: user.id,
      orgId: user.orgId,
      role: user.role,
      messages: messages,
      response: response,
      actions: actions,
      timestamp: new Date(),
      locale: user.locale || 'en'
    });
  } catch (error) {
    console.error('Failed to log conversation:', error);
    // Don't fail the request if logging fails
  }
}
