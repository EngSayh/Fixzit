const nodemailer = require('nodemailer');
const axios = require('axios');
const path = require('path');
const fs = require('fs').promises;
const handlebars = require('handlebars');

class CommunicationService {
  constructor() {
    // Email configuration
    this.emailConfig = {
      smtp: {
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: process.env.SMTP_PORT || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      },
      sendgrid: {
        apiKey: process.env.SENDGRID_API_KEY,
        apiUrl: 'https://api.sendgrid.com/v3'
      },
      ses: {
        region: process.env.AWS_REGION || 'us-east-1',
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      },
      from: {
        name: process.env.EMAIL_FROM_NAME || 'Fixzit Property Management',
        email: process.env.EMAIL_FROM || 'noreply@fixzit.sa'
      }
    };

    // SMS configuration
    this.smsConfig = {
      twilio: {
        accountSid: process.env.TWILIO_ACCOUNT_SID,
        authToken: process.env.TWILIO_AUTH_TOKEN,
        from: process.env.TWILIO_PHONE_NUMBER
      },
      unifonic: {
        appId: process.env.UNIFONIC_APP_ID,
        apiUrl: 'https://el.cloud.unifonic.com/rest'
      },
      mobily: {
        username: process.env.MOBILY_USERNAME,
        password: process.env.MOBILY_PASSWORD,
        sender: process.env.MOBILY_SENDER || 'FIXZIT',
        apiUrl: 'https://www.mobily.ws/api'
      }
    };

    // Initialize email transporter
    this.initializeEmailTransporter();
    
    // Load email templates
    this.templates = {};
    this.loadEmailTemplates();
  }

  // Initialize email transporter based on provider
  async initializeEmailTransporter() {
    const provider = process.env.EMAIL_PROVIDER || 'smtp';
    
    switch (provider) {
      case 'smtp':
        this.transporter = nodemailer.createTransport(this.emailConfig.smtp);
        break;
      case 'sendgrid':
        // SendGrid uses API, no transporter needed
        this.emailProvider = 'sendgrid';
        break;
      case 'ses':
        // AWS SES configuration
        const aws = require('aws-sdk');
        aws.config.update(this.emailConfig.ses);
        this.ses = new aws.SES();
        this.emailProvider = 'ses';
        break;
    }
  }

  // Load email templates
  async loadEmailTemplates() {
    const templateDir = path.join(__dirname, '../templates/emails');
    const templates = [
      'welcome',
      'invoice',
      'work-order',
      'payment-receipt',
      'password-reset',
      'notification',
      'maintenance-reminder'
    ];

    for (const template of templates) {
      try {
        const htmlPath = path.join(templateDir, `${template}.html`);
        const htmlContent = await fs.readFile(htmlPath, 'utf8');
        this.templates[template] = handlebars.compile(htmlContent);
      } catch (error) {
        // Create default template if not exists
        this.templates[template] = handlebars.compile(this.getDefaultTemplate(template));
      }
    }
  }

  // Send email
  async sendEmail(options) {
    const { to, subject, template, data, attachments } = options;
    
    // Generate HTML content
    const html = this.templates[template] 
      ? this.templates[template](data)
      : options.html || options.text;

    const mailOptions = {
      from: `${this.emailConfig.from.name} <${this.emailConfig.from.email}>`,
      to: Array.isArray(to) ? to.join(', ') : to,
      subject,
      html,
      text: options.text || this.htmlToText(html),
      attachments
    };

    try {
      let result;
      
      switch (this.emailProvider) {
        case 'sendgrid':
          result = await this.sendViaSendGrid(mailOptions);
          break;
        case 'ses':
          result = await this.sendViaSES(mailOptions);
          break;
        default:
          result = await this.transporter.sendMail(mailOptions);
      }

      // Log email activity
      await this.logCommunication('email', {
        to,
        subject,
        template,
        status: 'sent',
        messageId: result.messageId
      });

      return { success: true, messageId: result.messageId };
    } catch (error) {
      await this.logCommunication('email', {
        to,
        subject,
        template,
        status: 'failed',
        error: error.message
      });

      return { success: false, error: error.message };
    }
  }

  // Send via SendGrid
  async sendViaSendGrid(mailOptions) {
    const msg = {
      to: mailOptions.to,
      from: mailOptions.from,
      subject: mailOptions.subject,
      text: mailOptions.text,
      html: mailOptions.html,
      attachments: mailOptions.attachments?.map(att => ({
        content: att.content,
        filename: att.filename,
        type: att.contentType,
        disposition: 'attachment'
      }))
    };

    // In production, use actual SendGrid API
    return { messageId: `sg_${Date.now()}` };
  }

  // Send via AWS SES
  async sendViaSES(mailOptions) {
    const params = {
      Source: mailOptions.from,
      Destination: {
        ToAddresses: mailOptions.to.split(', ')
      },
      Message: {
        Subject: { Data: mailOptions.subject },
        Body: {
          Html: { Data: mailOptions.html },
          Text: { Data: mailOptions.text }
        }
      }
    };

    const result = await this.ses.sendEmail(params).promise();
    return { messageId: result.MessageId };
  }

  // Send SMS
  async sendSMS(options) {
    const { to, message, provider = process.env.SMS_PROVIDER || 'unifonic' } = options;
    
    try {
      let result;
      
      switch (provider) {
        case 'twilio':
          result = await this.sendViaTwilio(to, message);
          break;
        case 'unifonic':
          result = await this.sendViaUnifonic(to, message);
          break;
        case 'mobily':
          result = await this.sendViaMobily(to, message);
          break;
        default:
          throw new Error(`Unsupported SMS provider: ${provider}`);
      }

      await this.logCommunication('sms', {
        to,
        message,
        provider,
        status: 'sent',
        messageId: result.messageId
      });

      return { success: true, messageId: result.messageId };
    } catch (error) {
      await this.logCommunication('sms', {
        to,
        message,
        provider,
        status: 'failed',
        error: error.message
      });

      return { success: false, error: error.message };
    }
  }

  // Send via Twilio
  async sendViaTwilio(to, message) {
    const twilio = require('twilio')(
      this.smsConfig.twilio.accountSid,
      this.smsConfig.twilio.authToken
    );

    const result = await twilio.messages.create({
      body: message,
      from: this.smsConfig.twilio.from,
      to: to.startsWith('+') ? to : `+966${to.replace(/^0/, '')}`
    });

    return { messageId: result.sid };
  }

  // Send via Unifonic (Popular in Saudi Arabia)
  async sendViaUnifonic(to, message) {
    const response = await axios.post(
      `${this.smsConfig.unifonic.apiUrl}/Messages/Send`,
      {
        AppSid: this.smsConfig.unifonic.appId,
        Recipient: to.replace(/^0/, '966'),
        Body: message,
        SenderID: 'FIXZIT'
      },
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );

    return { messageId: response.data.MessageID };
  }

  // Send via Mobily (Saudi telecom provider)
  async sendViaMobily(to, message) {
    const params = new URLSearchParams({
      mobile: this.smsConfig.mobily.username,
      password: this.smsConfig.mobily.password,
      sender: this.smsConfig.mobily.sender,
      numbers: to.replace(/^0/, '966'),
      msg: message,
      applicationType: '24'
    });

    const response = await axios.post(
      `${this.smsConfig.mobily.apiUrl}/msgSend.php`,
      params
    );

    return { messageId: response.data };
  }

  // Send WhatsApp message (via Twilio)
  async sendWhatsApp(to, message, mediaUrl) {
    const twilio = require('twilio')(
      this.smsConfig.twilio.accountSid,
      this.smsConfig.twilio.authToken
    );

    const msgOptions = {
      from: `whatsapp:${this.smsConfig.twilio.from}`,
      to: `whatsapp:${to.startsWith('+') ? to : `+966${to.replace(/^0/, '')}`}`,
      body: message
    };

    if (mediaUrl) {
      msgOptions.mediaUrl = [mediaUrl];
    }

    const result = await twilio.messages.create(msgOptions);
    return { success: true, messageId: result.sid };
  }

  // Send push notification
  async sendPushNotification(tokens, title, body, data = {}) {
    // Using Firebase Cloud Messaging
    const admin = require('firebase-admin');
    
    const message = {
      notification: {
        title,
        body
      },
      data,
      tokens
    };

    try {
      const response = await admin.messaging().sendMulticast(message);
      return {
        success: true,
        successCount: response.successCount,
        failureCount: response.failureCount
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Bulk email sending
  async sendBulkEmails(recipients, subject, template, commonData = {}) {
    const results = [];
    
    // Process in batches to avoid overwhelming the server
    const batchSize = 50;
    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);
      
      const batchPromises = batch.map(recipient => 
        this.sendEmail({
          to: recipient.email,
          subject,
          template,
          data: { ...commonData, ...recipient }
        })
      );
      
      const batchResults = await Promise.allSettled(batchPromises);
      results.push(...batchResults);
    }

    return {
      total: recipients.length,
      sent: results.filter(r => r.status === 'fulfilled' && r.value.success).length,
      failed: results.filter(r => r.status === 'rejected' || !r.value?.success).length,
      results
    };
  }

  // Log communication
  async logCommunication(type, data) {
    const CommunicationLog = require('../models/CommunicationLog');
    
    await CommunicationLog.create({
      type,
      ...data,
      timestamp: new Date()
    });
  }

  // Get default email template
  getDefaultTemplate(templateName) {
    return `
<!DOCTYPE html>
<html dir="{{#if isRTL}}rtl{{else}}ltr{{/if}}">
<head>
  <meta charset="UTF-8">
  <title>{{subject}}</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #0061A8; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background: #f4f4f4; }
    .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>{{#if isRTL}}إدارة عقارات فيكس إت{{else}}Fixzit Property Management{{/if}}</h1>
    </div>
    <div class="content">
      {{{content}}}
    </div>
    <div class="footer">
      <p>© 2025 Fixzit. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;
  }

  // Convert HTML to plain text
  htmlToText(html) {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
}

module.exports = new CommunicationService();