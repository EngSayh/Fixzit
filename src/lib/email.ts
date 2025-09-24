import { config } from '@/src/config/environment';

interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

interface EmailTemplate {
  name: string;
  subject: string;
  html: string;
  text?: string;
}

export class EmailService {
  private from: string;
  private apiKey: string;

  constructor() {
    this.from = config.email.from;
    this.apiKey = config.email.sendgridApiKey;
  }

  /**
   * Send email using SendGrid
   */
  async send(options: EmailOptions): Promise<boolean> {
    if (!this.apiKey) {
      console.warn('Email service not configured - skipping email send');
      return false;
    }

    const recipients = Array.isArray(options.to) ? options.to : [options.to];

    const payload: any = {
      personalizations: [{
        to: recipients.map(email => ({ email }))
      }],
      from: { email: options.from || this.from },
      subject: options.subject,
      content: [
        { type: 'text/plain', value: options.text || this.htmlToText(options.html) },
        { type: 'text/html', value: options.html }
      ]
    };

    if (options.replyTo) {
      // SendGrid expects 'reply_to' field
      (payload as any).reply_to = { email: options.replyTo };
    }

    try {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`SendGrid error: ${response.status} - ${error}`);
      }

      return true;
    } catch (error) {
      console.error('Email send error:', error);
      return false;
    }
  }

  /**
   * Send templated email
   */
  async sendTemplate(template: string, to: string, data: Record<string, any>): Promise<boolean> {
    const emailTemplate = this.getTemplate(template, data);
    
    return this.send({
      to,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
      text: emailTemplate.text
    });
  }

  /**
   * Get email template
   */
  private getTemplate(name: string, data: Record<string, any>): EmailTemplate {
    const templates: Record<string, (data: any) => EmailTemplate> = {
      welcome: (data) => ({
        name: 'welcome',
        subject: `Welcome to Fixzit Enterprise, ${data.name}!`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #0061A8; color: white; padding: 20px; text-align: center; }
              .content { padding: 20px; background: #f4f4f4; }
              .button { display: inline-block; padding: 10px 20px; background: #00A859; color: white; text-decoration: none; border-radius: 5px; }
              .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Welcome to Fixzit Enterprise</h1>
              </div>
              <div class="content">
                <p>Hi ${data.name},</p>
                <p>Thank you for joining Fixzit Enterprise! We're excited to have you on board.</p>
                <p>Your account has been created with the following details:</p>
                <ul>
                  <li>Email: ${data.email}</li>
                  <li>Role: ${data.role}</li>
                  ${data.tenantName ? `<li>Organization: ${data.tenantName}</li>` : ''}
                </ul>
                <p>To get started, please click the button below:</p>
                <p style="text-align: center;">
                  <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" class="button">Go to Dashboard</a>
                </p>
                <p>If you have any questions, feel free to contact our support team.</p>
                <p>Best regards,<br>The Fixzit Team</p>
              </div>
              <div class="footer">
                <p>© 2025 Fixzit Enterprise. All rights reserved.</p>
                <p>This email was sent to ${data.email}</p>
              </div>
            </div>
          </body>
          </html>
        `,
        text: `Welcome to Fixzit Enterprise, ${data.name}!\n\nThank you for joining us. Your account has been created.\n\nEmail: ${data.email}\nRole: ${data.role}\n\nVisit ${process.env.NEXT_PUBLIC_APP_URL}/dashboard to get started.\n\nBest regards,\nThe Fixzit Team`
      }),

      workOrderAssigned: (data) => ({
        name: 'workOrderAssigned',
        subject: `Work Order Assigned: ${data.workOrderCode}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #0061A8; color: white; padding: 20px; text-align: center; }
              .content { padding: 20px; background: #f4f4f4; }
              .work-order { background: white; padding: 15px; border-radius: 5px; margin: 10px 0; }
              .priority-high { color: #e74c3c; font-weight: bold; }
              .priority-urgent { color: #c0392b; font-weight: bold; }
              .button { display: inline-block; padding: 10px 20px; background: #00A859; color: white; text-decoration: none; border-radius: 5px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Work Order Assignment</h1>
              </div>
              <div class="content">
                <p>Hi ${data.technicianName},</p>
                <p>A new work order has been assigned to you:</p>
                <div class="work-order">
                  <h3>${data.workOrderCode}: ${data.title}</h3>
                  <p><strong>Priority:</strong> <span class="priority-${data.priority.toLowerCase()}">${data.priority}</span></p>
                  <p><strong>Property:</strong> ${data.propertyName}</p>
                  <p><strong>Unit:</strong> ${data.unitNumber}</p>
                  <p><strong>Category:</strong> ${data.category}</p>
                  <p><strong>Description:</strong><br>${data.description}</p>
                  ${data.dueDate ? `<p><strong>Due Date:</strong> ${new Date(data.dueDate).toLocaleDateString()}</p>` : ''}
                </div>
                <p style="text-align: center;">
                  <a href="${process.env.NEXT_PUBLIC_APP_URL}/work-orders/${data.workOrderId}" class="button">View Work Order</a>
                </p>
                <p>Please review and update the status as you progress.</p>
                <p>Best regards,<br>Fixzit Maintenance Team</p>
              </div>
            </div>
          </body>
          </html>
        `,
        text: `Work Order Assignment\n\nHi ${data.technicianName},\n\nA new work order has been assigned to you:\n\n${data.workOrderCode}: ${data.title}\nPriority: ${data.priority}\nProperty: ${data.propertyName}\nUnit: ${data.unitNumber}\n\nDescription: ${data.description}\n\nView at: ${process.env.NEXT_PUBLIC_APP_URL}/work-orders/${data.workOrderId}`
      }),

      invoiceGenerated: (data) => ({
        name: 'invoiceGenerated',
        subject: `Invoice ${data.invoiceNumber} - ${data.amount} ${data.currency}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #0061A8; color: white; padding: 20px; text-align: center; }
              .content { padding: 20px; background: #f4f4f4; }
              .invoice-details { background: white; padding: 15px; border-radius: 5px; margin: 10px 0; }
              .amount { font-size: 24px; color: #0061A8; font-weight: bold; }
              .button { display: inline-block; padding: 10px 20px; background: #00A859; color: white; text-decoration: none; border-radius: 5px; }
              .qr-code { text-align: center; margin: 20px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Invoice Generated</h1>
              </div>
              <div class="content">
                <p>Dear ${data.customerName},</p>
                <p>Your invoice has been generated:</p>
                <div class="invoice-details">
                  <h3>Invoice #${data.invoiceNumber}</h3>
                  <p><strong>Date:</strong> ${new Date(data.date).toLocaleDateString()}</p>
                  <p><strong>Due Date:</strong> ${new Date(data.dueDate).toLocaleDateString()}</p>
                  <p class="amount">${data.currency} ${data.amount}</p>
                  ${data.description ? `<p><strong>Description:</strong> ${data.description}</p>` : ''}
                </div>
                ${data.qrCode ? `
                <div class="qr-code">
                  <p>Scan for ZATCA compliance:</p>
                  <img src="${data.qrCode}" alt="ZATCA QR Code" style="width: 200px; height: 200px;">
                </div>
                ` : ''}
                <p style="text-align: center;">
                  <a href="${process.env.NEXT_PUBLIC_APP_URL}/invoices/${data.invoiceId}" class="button">View Invoice</a>
                  ${data.paymentUrl ? `<a href="${data.paymentUrl}" class="button" style="margin-left: 10px;">Pay Now</a>` : ''}
                </p>
                <p>Thank you for your business!</p>
                <p>Best regards,<br>Fixzit Finance Team</p>
              </div>
            </div>
          </body>
          </html>
        `,
        text: `Invoice Generated\n\nDear ${data.customerName},\n\nInvoice #${data.invoiceNumber}\nAmount: ${data.currency} ${data.amount}\nDue Date: ${new Date(data.dueDate).toLocaleDateString()}\n\nView at: ${process.env.NEXT_PUBLIC_APP_URL}/invoices/${data.invoiceId}`
      })
    };

    const templateFn = templates[name];
    if (!templateFn) {
      throw new Error(`Email template '${name}' not found`);
    }

    return templateFn(data);
  }

  /**
   * Convert HTML to plain text
   */
  private htmlToText(html: string): string {
    return html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();
  }

  /**
   * Send bulk emails
   */
  async sendBulk(emails: EmailOptions[]): Promise<number> {
    let successCount = 0;
    
    for (const email of emails) {
      const success = await this.send(email);
      if (success) successCount++;
      
      // Rate limiting - SendGrid allows 100 emails/second
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    return successCount;
  }
}

// Export singleton instance
export const emailService = new EmailService();
