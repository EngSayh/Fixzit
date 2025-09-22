// app/api/ai/chat/route.ts - AI chat endpoint with privacy and RBAC enforcement
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/src/lib/auth/session';
import { canPerformAction, Role, ModuleKey } from '@/src/lib/rbac';
import { MongoClient, ObjectId } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fixzit';
const MONGODB_DB = process.env.MONGODB_DB || 'fixzit';

// Mock knowledge base - in production, this would be a vector database
const KNOWLEDGE_BASE = {
  'work orders': {
    en: 'Work orders are requests for maintenance or repair services. You can create them through the Work Orders module.',
    ar: 'أوامر العمل هي طلبات لخدمات الصيانة أو الإصلاح. يمكنك إنشاؤها من خلال وحدة أوامر العمل.'
  },
  'properties': {
    en: 'Properties include apartments, villas, offices, and commercial spaces. You can view and manage properties based on your role.',
    ar: 'العقارات تشمل الشقق والفلل والمكاتب والمساحات التجارية. يمكنك عرض وإدارة العقارات بناءً على دورك.'
  },
  'tickets': {
    en: 'Tickets are maintenance requests. You can create tickets for your properties and track their status.',
    ar: 'التذاكر هي طلبات الصيانة. يمكنك إنشاء تذاكر لعقاراتك وتتبع حالتها.'
  },
  'marketplace': {
    en: 'The marketplace allows browsing properties and materials. You can search and filter listings without signing in.',
    ar: 'السوق يسمح بتصفح العقارات والمواد. يمكنك البحث وتصفية القوائم دون تسجيل الدخول.'
  }
};

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
    const userIntent = analyzeIntent(lastMessage.content, locale);

    // Check if user has permission for requested action
    if (userIntent.action && !canPerformAction(user.role as Role, userIntent.module as ModuleKey, 'read')) {
      return NextResponse.json({
        reply: locale === 'ar'
          ? `عذراً، ليس لديك صلاحية للوصول إلى ${userIntent.module}`
          : `Sorry, you don't have permission to access ${userIntent.module}`,
        actions: []
      });
    }

    // Execute actions if any
    let actions: any[] = [];
    if (userIntent.action) {
      actions = await executeAction(userIntent, user, session);
    }

    // Generate response
    const response = await generateResponse(userIntent, user, locale, session);

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
    }
  };

  for (const intent of Object.values(intents)) {
    if (intent.patterns.some(pattern => lowerMessage.includes(pattern))) {
      return intent;
    }
  }

  return { action: null, module: 'dashboard' };
}

async function executeAction(intent: any, user: any, session: any) {
  const actions: any[] = [];

  try {
    switch (intent.action) {
      case 'create_ticket':
        // Create a work order ticket
        const client = new MongoClient(MONGODB_URI);
        await client.connect();
        const db = client.db(MONGODB_DB);

        const workOrder = {
          title: 'Maintenance Request from AI Assistant',
          description: 'Created via AI chat assistant',
          priority: 'medium',
          status: 'new',
          createdBy: user.id,
          orgId: user.orgId,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        const result = await db.collection('work_orders').insertOne(workOrder);

        actions.push({
          type: 'create_ticket',
          data: {
            id: result.insertedId,
            message: session.locale === 'ar'
              ? 'تم إنشاء تذكرة الصيانة بنجاح. رقم التذكرة: ' + result.insertedId
              : 'Maintenance ticket created successfully. Ticket ID: ' + result.insertedId
          }
        });

        await client.close();
        break;

      case 'list_tickets':
        // List user's tickets
        const client2 = new MongoClient(MONGODB_URI);
        await client2.connect();
        const db2 = client2.db(MONGODB_DB);

        const tickets = await db2.collection('work_orders')
          .find({ createdBy: user.id })
          .sort({ createdAt: -1 })
          .limit(5)
          .toArray();

        await client2.close();

        actions.push({
          type: 'list_tickets',
          data: {
            tickets: tickets.map(t => ({
              id: t._id,
              title: t.title,
              status: t.status,
              createdAt: t.createdAt
            })),
            message: session.locale === 'ar'
              ? `تم العثور على ${tickets.length} تذكرة:`
              : `Found ${tickets.length} tickets:`
          }
        });
        break;

      case 'help':
        actions.push({
          type: 'help',
          data: {
            message: session.locale === 'ar'
              ? 'دليل المساعدة: يمكنك استخدام الأوامر التالية:\n• /new-ticket - إنشاء تذكرة صيانة\n• /my-tickets - عرض تذاكرك\n• /help - عرض هذا الدليل'
              : 'Help Guide: You can use these commands:\n• /new-ticket - Create maintenance ticket\n• /my-tickets - View your tickets\n• /help - Show this guide'
          }
        });
        break;
    }
  } catch (error) {
    console.error('Action execution error:', error);
    actions.push({
      type: 'error',
      data: {
        message: session.locale === 'ar'
          ? 'حدث خطأ أثناء تنفيذ الطلب. يرجى المحاولة مرة أخرى.'
          : 'An error occurred while executing the request. Please try again.'
      }
    });
  }

  return actions;
}

async function generateResponse(intent: any, user: any, locale: string, session: any): Promise<string> {
  // Get relevant knowledge from knowledge base
  let knowledge = '';
  for (const [key, value] of Object.entries(KNOWLEDGE_BASE)) {
    if (intent.module === 'work_orders' && key === 'work orders') {
      knowledge = value[locale as keyof typeof value];
      break;
    } else if (intent.module === 'properties' && key === 'properties') {
      knowledge = value[locale as keyof typeof value];
      break;
    } else if (intent.module === 'dashboard' && key === 'help') {
      knowledge = value[locale as keyof typeof value];
      break;
    }
  }

  const responses = {
    en: {
      create_ticket: 'I can help you create a maintenance ticket. Please provide the details of the issue.',
      list_tickets: 'I can show you your recent maintenance tickets.',
      property_info: 'I can provide information about properties based on your permissions.',
      help: 'I can help you with various tasks in the Fixzit system. What would you like to do?',
      default: 'I\'m here to help you with the Fixzit system. You can ask me about work orders, properties, or general questions.'
    },
    ar: {
      create_ticket: 'يمكنني مساعدتك في إنشاء تذكرة صيانة. يرجى تقديم تفاصيل المشكلة.',
      list_tickets: 'يمكنني عرض تذاكر الصيانة الحديثة الخاصة بك.',
      property_info: 'يمكنني تقديم معلومات عن العقارات بناءً على صلاحياتك.',
      help: 'يمكنني مساعدتك في مختلف المهام في نظام Fixzit. ماذا تريد أن تفعل؟',
      default: 'أنا هنا لمساعدتك في نظام Fixzit. يمكنك سؤالي عن أوامر العمل أو العقارات أو الأسئلة العامة.'
    }
  };

  const responseSet = responses[locale as keyof typeof responses];
  return responseSet[intent.action as keyof typeof responseSet] || responseSet.default;
}

async function logConversation(user: any, messages: any[], response: string, actions: any[]) {
  try {
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db(MONGODB_DB);

    await db.collection('ai_conversations').insertOne({
      userId: user.id,
      orgId: user.orgId,
      role: user.role,
      messages: messages,
      response: response,
      actions: actions,
      timestamp: new Date(),
      locale: user.locale || 'en'
    });

    await client.close();
  } catch (error) {
    console.error('Failed to log conversation:', error);
    // Don't fail the request if logging fails
  }
}
