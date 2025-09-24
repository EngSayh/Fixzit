import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/lib/mongo';
import { ErrorReport } from '@/src/lib/errors/types';
import { getErrorInfo } from '@/src/lib/errors/registry';

export async function POST(req: NextRequest) {
  try {
    await db;
    const errorReport: ErrorReport = await req.json();

    // Validate required fields
    if (!errorReport.incidentId || !errorReport.items || errorReport.items.length === 0) {
      return NextResponse.json(
        { error: 'Invalid error report format' },
        { status: 400 }
      );
    }

    // Get error info for categorization
    const firstError = errorReport.items[0];
    const errorInfo = getErrorInfo(firstError.code);

    // Create error event document
    const errorEvent = {
      incidentId: errorReport.incidentId,
      correlationId: errorReport.correlationId,
      orgId: errorReport.orgId,
      userId: errorReport.userId,
      userRole: errorReport.userRole,
      locale: errorReport.locale,
      rtl: errorReport.rtl,
      route: errorReport.route,
      module: errorReport.module,
      severity: errorReport.severity,
      items: errorReport.items,
      device: errorReport.device,
      network: errorReport.network,
      payloadHash: errorReport.payloadHash,
      tags: errorReport.tags,
      createdAt: new Date(errorReport.createdAt),
      // Additional fields for better categorization
      errorCode: firstError.code,
      category: errorInfo.category,
      autoTicket: errorInfo.autoTicket,
      userFacing: errorInfo.userFacing
    };

    // Store in error_events collection
    const dbInstance = await db;
    const collection = dbInstance.collection('error_events');
    await collection.insertOne(errorEvent);

    // Auto-create support ticket if configured
    let ticketId: string | null = null;
    if (errorInfo.autoTicket) {
      try {
        const ticketResponse = await fetch(`${req.nextUrl.origin}/api/support/tickets`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(errorReport.userId ? { 'x-user': JSON.stringify({ id: errorReport.userId }) } : {})
          },
          body: JSON.stringify({
            subject: `[${firstError.code}] ${errorInfo.title_en}`,
            module: errorReport.module || 'System',
            type: 'Bug',
            priority: errorReport.severity === 'CRITICAL' ? 'Urgent' : 
                     errorReport.severity === 'ERROR' ? 'High' : 'Medium',
            category: 'Bug Report',
            subCategory: errorInfo.category === 'API' ? 'API Error' : 
                        errorInfo.category === 'UI' ? 'UI Error' : 'Critical Bug',
            text: `**Automated Error Report**

**Incident ID:** ${errorReport.incidentId}
**Error Code:** ${firstError.code}
**Module:** ${errorReport.module}
**Severity:** ${errorReport.severity}
**Route:** ${errorReport.route}
**Timestamp:** ${errorReport.createdAt}

**Error Details:**
${errorReport.items.map((item, i) => `${i + 1}. ${item.message} (${item.code})`).join('\n')}

**System Information:**
- User Agent: ${errorReport.device?.ua || 'N/A'}
- Platform: ${errorReport.device?.platform || 'N/A'}
- Online: ${errorReport.device?.online ? 'Yes' : 'No'}
- Viewport: ${errorReport.device?.width}x${errorReport.device?.height}

**User Context:**
- User ID: ${errorReport.userId || 'Guest'}
- Role: ${errorReport.userRole || 'N/A'}
- Organization: ${errorReport.orgId || 'N/A'}

**Stack Trace:**
\`\`\`
${firstError.stack || 'No stack trace available'}
\`\`\`

---
*This ticket was automatically created from an error report.*`,
            requester: errorReport.userId ? undefined : {
              name: 'Error Reporter',
              email: 'error-report@fixzit.com',
              phone: 'N/A'
            }
          })
        });

        if (ticketResponse.ok) {
          const ticketResult = await ticketResponse.json();
          ticketId = ticketResult.code;
          
          // Update error event with ticket ID
          await collection.updateOne(
            { incidentId: errorReport.incidentId },
            { $set: { ticketId } }
          );
        }
      } catch (ticketError) {
        console.error('Failed to create auto-ticket:', ticketError);
      }
    }

    return NextResponse.json({
      success: true,
      incidentId: errorReport.incidentId,
      ticketId,
      message: 'Error reported successfully'
    });

  } catch (error) {
    console.error('Error reporting failed:', error);
    return NextResponse.json(
      { error: 'Failed to report error' },
      { status: 500 }
    );
  }
}