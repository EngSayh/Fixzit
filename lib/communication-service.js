const nodemailer = require('nodemailer');
const twilio = require('twilio');
const axios = require('axios');
const handlebars = require('handlebars');
const fs = require('fs').promises;
const path = require('path');

class CommunicationService {
  constructor(options = {}) {
    this.config = {
      email: {
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: process.env.SMTP_PORT || 587,
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      },
      sms: {
        accountSid: process.env.TWILIO_ACCOUNT_SID,
        authToken: process.env.TWILIO_AUTH_TOKEN,
        fromNumber: process.env.TWILIO_PHONE_NUMBER
      },
      whatsapp: {
        apiUrl: process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v18.0',
        accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
        phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
        verifyToken: process.env.WHATSAPP_VERIFY_TOKEN
      },
      slack: {
        botToken: process.env.SLACK_BOT_TOKEN,
        webhookUrl: process.env.SLACK_WEBHOOK_URL
      },
      telegram: {
        botToken: process.env.TELEGRAM_BOT_TOKEN,
        chatId: process.env.TELEGRAM_CHAT_ID
      },
      ...options
    };

    this.emailTransporter = this.initializeEmailTransporter();
    this.twilioClient = this.initializeTwilioClient();
    this.templates = new Map();
    this.messageQueue = [];
    this.isProcessing = false;

    // Load templates
    this.loadTemplates();
  }

  // Email Service
  initializeEmailTransporter() {
    if (!this.config.email.auth.user || !this.config.email.auth.pass) {
      console.warn('Email configuration incomplete');
      return null;
    }

    return nodemailer.createTransporter({
      host: this.config.email.host,
      port: this.config.email.port,
      secure: this.config.email.secure,
      auth: this.config.email.auth,
      tls: {
        rejectUnauthorized: false
      }
    });
  }

  async sendEmail(options) {
    if (!this.emailTransporter) {
      throw new Error('Email service not configured');
    }

    const {
      to,
      cc,
      bcc,
      subject,
      text,
      html,
      template,
      data,
      attachments,
      priority = 'normal'
    } = options;

    let emailContent = { text, html };

    // Use template if provided
    if (template) {
      emailContent = await this.renderEmailTemplate(template, data || {});
    }

    const mailOptions = {
      from: `"Fixzit Enterprise" <${this.config.email.auth.user}>`,
      to: Array.isArray(to) ? to.join(', ') : to,
      cc: cc ? (Array.isArray(cc) ? cc.join(', ') : cc) : undefined,
      bcc: bcc ? (Array.isArray(bcc) ? bcc.join(', ') : bcc) : undefined,
      subject,
      text: emailContent.text,
      html: emailContent.html,
      attachments,
      priority: priority === 'high' ? 'high' : 'normal'
    };

    try {
      const result = await this.emailTransporter.sendMail(mailOptions);
      console.log('Email sent successfully:', result.messageId);
      return {
        success: true,
        messageId: result.messageId,
        channel: 'email'
      };
    } catch (error) {
      console.error('Email sending failed:', error);
      throw error;
    }
  }

  // SMS Service
  initializeTwilioClient() {
    if (!this.config.sms.accountSid || !this.config.sms.authToken) {
      console.warn('SMS configuration incomplete');
      return null;
    }

    return twilio(this.config.sms.accountSid, this.config.sms.authToken);
  }

  async sendSMS(options) {
    if (!this.twilioClient) {
      throw new Error('SMS service not configured');
    }

    const { to, message, mediaUrl } = options;

    try {
      const messageOptions = {
        body: message,
        from: this.config.sms.fromNumber,
        to: to
      };

      if (mediaUrl) {
        messageOptions.mediaUrl = [mediaUrl];
      }

      const result = await this.twilioClient.messages.create(messageOptions);
      
      console.log('SMS sent successfully:', result.sid);
      return {
        success: true,
        messageId: result.sid,
        channel: 'sms'
      };
    } catch (error) {
      console.error('SMS sending failed:', error);
      throw error;
    }
  }

  // WhatsApp Business API Service
  async sendWhatsAppMessage(options) {
    if (!this.config.whatsapp.accessToken || !this.config.whatsapp.phoneNumberId) {
      throw new Error('WhatsApp service not configured');
    }

    const { to, message, template, templateData, mediaUrl, mediaType = 'image' } = options;

    const url = `${this.config.whatsapp.apiUrl}/${this.config.whatsapp.phoneNumberId}/messages`;
    
    let payload;

    if (template) {
      // Use WhatsApp template
      payload = {
        messaging_product: 'whatsapp',
        to: to.replace(/[^0-9]/g, ''), // Remove non-numeric characters
        type: 'template',
        template: {
          name: template,
          language: { code: 'en_US' },
          components: templateData ? [
            {
              type: 'body',
              parameters: templateData.map(data => ({ type: 'text', text: data }))
            }
          ] : []
        }
      };
    } else if (mediaUrl) {
      // Send media message
      payload = {
        messaging_product: 'whatsapp',
        to: to.replace(/[^0-9]/g, ''),
        type: mediaType,
        [mediaType]: {
          link: mediaUrl,
          caption: message
        }
      };
    } else {
      // Send text message
      payload = {
        messaging_product: 'whatsapp',
        to: to.replace(/[^0-9]/g, ''),
        type: 'text',
        text: {
          body: message
        }
      };
    }

    try {
      const response = await axios.post(url, payload, {
        headers: {
          'Authorization': `Bearer ${this.config.whatsapp.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('WhatsApp message sent successfully:', response.data.messages[0].id);
      return {
        success: true,
        messageId: response.data.messages[0].id,
        channel: 'whatsapp'
      };
    } catch (error) {
      console.error('WhatsApp message sending failed:', error.response?.data || error.message);
      throw error;
    }
  }

  // WhatsApp Webhook Handler
  handleWhatsAppWebhook(req, res) {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    // Verify webhook
    if (mode === 'subscribe' && token === this.config.whatsapp.verifyToken) {
      console.log('WhatsApp webhook verified');
      res.status(200).send(challenge);
      return;
    }

    // Handle incoming messages
    const body = req.body;
    if (body.object === 'whatsapp_business_account') {
      body.entry?.forEach(entry => {
        entry.changes?.forEach(change => {
          if (change.field === 'messages') {
            this.processWhatsAppMessage(change.value);
          }
        });
      });
      res.status(200).send('EVENT_RECEIVED');
    } else {
      res.sendStatus(404);
    }
  }

  processWhatsAppMessage(value) {
    const messages = value.messages;
    const contacts = value.contacts;

    if (messages && messages.length > 0) {
      messages.forEach(message => {
        const contact = contacts?.find(c => c.wa_id === message.from);
        
        console.log('Received WhatsApp message:', {
          from: message.from,
          name: contact?.profile?.name,
          message: message.text?.body || message.type,
          timestamp: message.timestamp
        });

        // Process the message (implement your business logic here)
        this.handleIncomingWhatsAppMessage(message, contact);
      });
    }
  }

  async handleIncomingWhatsAppMessage(message, contact) {
    // Auto-reply logic
    const autoReplies = {
      'hi': 'Hello! Welcome to Fixzit Enterprise. How can I help you today?',
      'hello': 'Hello! Welcome to Fixzit Enterprise. How can I help you today?',
      'help': 'I can help you with:\n1. Property inquiries\n2. Work order status\n3. Payment information\n4. General support\n\nType the number or describe your need.',
      'status': 'Please provide your work order number to check the status.',
      'payment': 'For payment inquiries, please provide your invoice number.',
      'support': 'You can reach our support team at +966-11-123-4567 or email support@fixzit.com'
    };

    const messageText = message.text?.body?.toLowerCase();
    const autoReply = autoReplies[messageText];

    if (autoReply) {
      await this.sendWhatsAppMessage({
        to: message.from,
        message: autoReply
      });
    } else {
      // Forward to human support or create ticket
      await this.createSupportTicketFromWhatsApp(message, contact);
    }
  }

  async createSupportTicketFromWhatsApp(message, contact) {
    // Implement ticket creation logic
    console.log('Creating support ticket from WhatsApp message');
  }

  // Slack Integration
  async sendSlackMessage(options) {
    if (!this.config.slack.webhookUrl && !this.config.slack.botToken) {
      throw new Error('Slack service not configured');
    }

    const { channel, message, attachments, blocks } = options;

    const payload = {
      text: message,
      attachments,
      blocks
    };

    if (channel) {
      payload.channel = channel;
    }

    try {
      let response;
      
      if (this.config.slack.webhookUrl) {
        // Use webhook
        response = await axios.post(this.config.slack.webhookUrl, payload);
      } else {
        // Use bot token
        response = await axios.post('https://slack.com/api/chat.postMessage', payload, {
          headers: {
            'Authorization': `Bearer ${this.config.slack.botToken}`,
            'Content-Type': 'application/json'
          }
        });
      }

      console.log('Slack message sent successfully');
      return {
        success: true,
        channel: 'slack'
      };
    } catch (error) {
      console.error('Slack message sending failed:', error);
      throw error;
    }
  }

  // Telegram Integration
  async sendTelegramMessage(options) {
    if (!this.config.telegram.botToken) {
      throw new Error('Telegram service not configured');
    }

    const { chatId, message, parseMode = 'HTML' } = options;
    const url = `https://api.telegram.org/bot${this.config.telegram.botToken}/sendMessage`;

    const payload = {
      chat_id: chatId || this.config.telegram.chatId,
      text: message,
      parse_mode: parseMode
    };

    try {
      const response = await axios.post(url, payload);
      
      console.log('Telegram message sent successfully');
      return {
        success: true,
        messageId: response.data.result.message_id,
        channel: 'telegram'
      };
    } catch (error) {
      console.error('Telegram message sending failed:', error);
      throw error;
    }
  }

  // Multi-channel messaging
  async sendMultiChannelMessage(options) {
    const {
      recipients,
      message,
      subject,
      channels = ['email'],
      template,
      data,
      priority = 'normal'
    } = options;

    const results = [];

    for (const recipient of recipients) {
      for (const channel of channels) {
        try {
          let result;

          switch (channel) {
            case 'email':
              if (recipient.email) {
                result = await this.sendEmail({
                  to: recipient.email,
                  subject,
                  template,
                  data: { ...data, recipient },
                  priority
                });
              }
              break;

            case 'sms':
              if (recipient.phone) {
                result = await this.sendSMS({
                  to: recipient.phone,
                  message: this.truncateForSMS(message)
                });
              }
              break;

            case 'whatsapp':
              if (recipient.whatsapp) {
                result = await this.sendWhatsAppMessage({
                  to: recipient.whatsapp,
                  message
                });
              }
              break;

            case 'slack':
              if (recipient.slackChannel) {
                result = await this.sendSlackMessage({
                  channel: recipient.slackChannel,
                  message
                });
              }
              break;

            case 'telegram':
              if (recipient.telegramChatId) {
                result = await this.sendTelegramMessage({
                  chatId: recipient.telegramChatId,
                  message
                });
              }
              break;
          }

          if (result) {
            results.push({
              recipient: recipient.id || recipient.email || recipient.phone,
              channel,
              ...result
            });
          }
        } catch (error) {
          results.push({
            recipient: recipient.id || recipient.email || recipient.phone,
            channel,
            success: false,
            error: error.message
          });
        }
      }
    }

    return results;
  }

  // Template Management
  async loadTemplates() {
    try {
      const templatesDir = path.join(__dirname, '../templates');
      const files = await fs.readdir(templatesDir);
      
      for (const file of files) {
        if (file.endsWith('.hbs') || file.endsWith('.handlebars')) {
          const templateName = file.replace(/\.(hbs|handlebars)$/, '');
          const templateContent = await fs.readFile(path.join(templatesDir, file), 'utf8');
          this.templates.set(templateName, handlebars.compile(templateContent));
        }
      }
      
      console.log(`Loaded ${this.templates.size} email templates`);
    } catch (error) {
      console.warn('Could not load templates:', error.message);
    }
  }

  async renderEmailTemplate(templateName, data) {
    const template = this.templates.get(templateName);
    
    if (!template) {
      // Fallback to basic template
      return {
        html: this.getBasicEmailTemplate(data.subject || 'Notification', data.message || ''),
        text: data.message || ''
      };
    }

    const html = template(data);
    const text = this.htmlToText(html);

    return { html, text };
  }

  getBasicEmailTemplate(subject, message) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${subject}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #0078D4 0%, #00BCF2 100%); color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
          .button { display: inline-block; padding: 12px 24px; background: #0078D4; color: white; text-decoration: none; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Fixzit Enterprise</h1>
          </div>
          <div class="content">
            <h2>${subject}</h2>
            <p>${message}</p>
            <a href="${process.env.FRONTEND_URL}/dashboard" class="button">View Dashboard</a>
          </div>
          <div class="footer">
            <p>© 2025 Fixzit Enterprise. All rights reserved.</p>
            <p>This is an automated message. Please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  htmlToText(html) {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  truncateForSMS(message, maxLength = 160) {
    if (message.length <= maxLength) return message;
    return message.substring(0, maxLength - 3) + '...';
  }

  // Bulk messaging with rate limiting
  async sendBulkMessages(messages, options = {}) {
    const { 
      batchSize = 10, 
      delayBetweenBatches = 1000,
      maxRetries = 3 
    } = options;

    const results = [];
    
    for (let i = 0; i < messages.length; i += batchSize) {
      const batch = messages.slice(i, i + batchSize);
      const batchPromises = batch.map(async (message, index) => {
        let retries = 0;
        
        while (retries < maxRetries) {
          try {
            const result = await this.sendMultiChannelMessage(message);
            return { index: i + index, success: true, result };
          } catch (error) {
            retries++;
            if (retries === maxRetries) {
              return { index: i + index, success: false, error: error.message };
            }
            await this.delay(1000 * retries); // Exponential backoff
          }
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Delay between batches to avoid rate limits
      if (i + batchSize < messages.length) {
        await this.delay(delayBetweenBatches);
      }
    }

    return results;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Message scheduling
  scheduleMessage(message, sendAt) {
    const delay = new Date(sendAt).getTime() - Date.now();
    
    if (delay <= 0) {
      // Send immediately
      return this.sendMultiChannelMessage(message);
    }

    // Schedule for later
    setTimeout(() => {
      this.sendMultiChannelMessage(message);
    }, delay);

    return { scheduled: true, sendAt };
  }

  // Analytics and reporting
  async getMessageAnalytics(dateRange) {
    // Implement analytics based on your logging/database system
    return {
      totalSent: 0,
      byChannel: {
        email: 0,
        sms: 0,
        whatsapp: 0,
        slack: 0,
        telegram: 0
      },
      successRate: 0,
      failureRate: 0
    };
  }

  // Health check
  async healthCheck() {
    const services = {};

    // Check email service
    try {
      if (this.emailTransporter) {
        await this.emailTransporter.verify();
        services.email = { status: 'healthy' };
      } else {
        services.email = { status: 'not_configured' };
      }
    } catch (error) {
      services.email = { status: 'error', error: error.message };
    }

    // Check SMS service
    try {
      if (this.twilioClient) {
        await this.twilioClient.api.accounts(this.config.sms.accountSid).fetch();
        services.sms = { status: 'healthy' };
      } else {
        services.sms = { status: 'not_configured' };
      }
    } catch (error) {
      services.sms = { status: 'error', error: error.message };
    }

    // Check WhatsApp service
    try {
      if (this.config.whatsapp.accessToken) {
        const response = await axios.get(
          `${this.config.whatsapp.apiUrl}/${this.config.whatsapp.phoneNumberId}`,
          {
            headers: {
              'Authorization': `Bearer ${this.config.whatsapp.accessToken}`
            }
          }
        );
        services.whatsapp = { status: 'healthy' };
      } else {
        services.whatsapp = { status: 'not_configured' };
      }
    } catch (error) {
      services.whatsapp = { status: 'error', error: error.message };
    }

    return services;
  }
}

module.exports = CommunicationService;