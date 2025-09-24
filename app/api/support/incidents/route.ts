// app/api/support/incidents/route.ts - Fire-and-forget incident reporting endpoint
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/lib/mongo';
import { z } from 'zod';
import { ErrorEvent, ErrorOccurrence } from '@/src/server/models/ErrorEvent';
import { SupportTicket } from '@/src/server/models/SupportTicket';
import { getSessionUser } from '@/src/server/middleware/withAuthRbac';

// Incident schema
const incidentSchema = z.object({
  incidentId: z.string(),
  code: z.string(),
  message: z.string(),
  details: z.string().optional(),
  severity: z.string(),
  category: z.string(),
  module: z.string(),
  userContext: z.object({
    userId: z.string().optional(),
    email: z.string().optional(),
    role: z.string().optional(),
    orgId: z.string().optional(),
    tenant: z.string().optional(),
    name: z.string().optional()
  }).optional(),
  clientContext: z.any(),
  problemDetails: z.any().optional(),
  stack: z.string().optional(),
  errors: z.array(z.object({
    path: z.string().optional(),
    message: z.string()
  })).optional(),
  timestamp: z.string(),
  autoTicket: z.boolean().default(true),
  additionalContext: z.any().optional()
});

export async function POST(req: NextRequest) {
  try {
    await db;
    
    // Parse request body
    const body = await req.json();
    const data = incidentSchema.parse(body);
    
    // Get session user if available
    const sessionUser = await getSessionUser(req);
    
    // Merge user contexts (session takes precedence)
    const userContext = {
      ...data.userContext,
      ...(sessionUser ? {
        userId: sessionUser.id,
        email: (sessionUser as any).email,
        role: sessionUser.role,
        orgId: (sessionUser as any).orgId,
        tenant: (sessionUser as any).tenantId
      } : {})
    };
    
    // Extract guest info if provided
    const guestInfo = data.additionalContext?.guestInfo;
    
    // Create or update error event
    const errorEvent = await ErrorEvent.findOneAndUpdate(
      { incidentId: data.incidentId },
      {
        $setOnInsert: {
          incidentId: data.incidentId,
          code: data.code,
          title: data.message,
          category: data.category,
          severity: data.severity,
          module: data.module,
          firstSeenAt: new Date(data.timestamp),
          orgId: userContext.orgId || null,
          user: userContext,
          route: data.clientContext?.url?.pathname,
          url: data.clientContext?.url,
          locale: data.clientContext?.locale,
          rtl: data.clientContext?.rtl || false,
          http: data.problemDetails ? {
            status: data.problemDetails.status,
            method: data.problemDetails.instance?.split(' ')[0],
            path: data.problemDetails.instance?.split(' ')[1]
          } : null,
          device: data.clientContext?.device,
          problem: data.problemDetails,
          errorItems: data.errors,
          stack: data.stack,
          clientContext: data.clientContext
        },
        $set: {
          lastSeenAt: new Date(data.timestamp)
        },
        $inc: {
          occurrences: 1
        }
      },
      { upsert: true, new: true }
    );
    
    // Create error occurrence record
    await ErrorOccurrence.create({
      incidentId: data.incidentId,
      details: data.details,
      stack: data.stack,
      http: data.problemDetails,
      clientContext: data.clientContext,
      createdAt: new Date(data.timestamp)
    });
    
    // Auto-create support ticket if requested
    let ticketId = null;
    if (data.autoTicket && data.severity !== 'P3') {
      // Generate ticket code
      const ticketCount = await SupportTicket.countDocuments();
      const ticketCode = `SUP-${new Date().getFullYear()}-${String(ticketCount + 1).padStart(6, '0')}`;
      
      // Create ticket
      const ticket = await SupportTicket.create({
        tenantId: userContext.tenant || userContext.orgId,
        code: ticketCode,
        subject: `[${data.code}] ${data.message}`,
        module: mapModuleToTicketModule(data.module),
        type: 'Bug',
        priority: mapSeverityToPriority(data.severity),
        category: 'Technical',
        subCategory: 'Bug Report',
        status: 'New',
        createdByUserId: userContext.userId || null,
        requester: !userContext.userId && guestInfo ? {
          name: guestInfo.name || 'Guest User',
          email: guestInfo.email || 'noreply@fixzit.com',
          phone: guestInfo.phone || ''
        } : undefined,
        messages: [{
          byUserId: null,
          byRole: 'SYSTEM',
          at: new Date(),
          text: formatTicketMessage(data),
          attachments: []
        }],
        metadata: {
          incidentId: data.incidentId,
          errorCode: data.code,
          severity: data.severity,
          url: data.clientContext?.url,
          userAgent: data.clientContext?.userAgent
        }
      });
      
      ticketId = ticket.code;
      
      // Update error event with ticket reference
      await ErrorEvent.updateOne(
        { incidentId: data.incidentId },
        { $set: { ticketId: ticket._id } }
      );
    }
    
    // Return 202 Accepted (fire-and-forget pattern)
    return new NextResponse(
      JSON.stringify({ 
        ok: true, 
        incidentId: data.incidentId,
        ticketId 
      }),
      { 
        status: 202,
        headers: { 'Content-Type': 'application/json' }
      }
    );
    
  } catch (error) {
    console.error('Error processing incident report:', error);
    
    // Still return 202 to not block the client
    return new NextResponse(null, { status: 202 });
  }
}

// Helper functions
function mapModuleToTicketModule(module: string): string {
  const moduleMap: Record<string, string> = {
    'Dashboard': 'FM',
    'Work Orders': 'FM',
    'Properties': 'FM',
    'Finance': 'FM',
    'HR': 'FM',
    'Administration': 'FM',
    'CRM': 'FM',
    'Marketplace': 'Souq',
    'Support': 'Other',
    'Compliance': 'FM',
    'Reports': 'FM',
    'System': 'Other',
    'Authentication': 'Account',
    'UI': 'Other',
    'Network': 'Other'
  };
  return moduleMap[module] || 'Other';
}

function mapSeverityToPriority(severity: string): string {
  switch (severity) {
    case 'P0': return 'Urgent';
    case 'P1': return 'High';
    case 'P2': return 'Medium';
    case 'P3': return 'Low';
    default: return 'Medium';
  }
}

function formatTicketMessage(data: any): string {
  const sections = [
    `🚨 **Automated Error Report**`,
    '',
    `**Incident ID:** \`${data.incidentId}\``,
    `**Error Code:** \`${data.code}\``,
    `**Module:** ${data.module}`,
    `**Severity:** ${data.severity}`,
    `**Category:** ${data.category}`,
    `**Timestamp:** ${data.timestamp}`,
    '',
    `**Error Message:**`,
    data.message,
  ];

  if (data.details) {
    sections.push('', `**Details:**`, data.details);
  }

  if (data.errors && data.errors.length > 0) {
    sections.push('', `**Error Items:**`);
    data.errors.forEach((err: any, i: number) => {
      sections.push(`${i + 1}. ${err.path ? `[${err.path}] ` : ''}${err.message}`);
    });
  }

  if (data.clientContext) {
    sections.push(
      '',
      `**Client Context:**`,
      `- URL: ${data.clientContext.url || 'N/A'}`,
      `- Locale: ${data.clientContext.locale || 'N/A'}`,
      `- Network: ${data.clientContext.network || 'N/A'}`,
      `- User Agent: ${data.clientContext.userAgent || 'N/A'}`
    );
  }

  if (data.problemDetails) {
    sections.push(
      '',
      `**HTTP Details:**`,
      `- Status: ${data.problemDetails.status || 'N/A'}`,
      `- Type: ${data.problemDetails.type || 'N/A'}`,
      `- Instance: ${data.problemDetails.instance || 'N/A'}`
    );
  }

  if (data.stack) {
    sections.push(
      '',
      `**Stack Trace:**`,
      '```',
      data.stack.slice(0, 1000), // Limit stack trace length
      '```'
    );
  }

  sections.push(
    '',
    '---',
    '',
    '*This ticket was automatically created from an error report.*'
  );

  return sections.join('\n');
}
