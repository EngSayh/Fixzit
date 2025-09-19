const nodemailer = require('nodemailer');
const twilio = require('twilio');
const axios = require('axios');

class NotificationService {
  constructor(socketServer) {
    this.socketServer = socketServer;
    this.emailTransporter = this.setupEmailTransporter();
    this.twilioClient = this.setupTwilioClient();
    this.whatsappConfig = this.setupWhatsAppConfig();
  }

  setupEmailTransporter() {
    return nodemailer.createTransporter({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  setupTwilioClient() {
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      return twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    }
    return null;
  }

  setupWhatsAppConfig() {
    return {
      apiUrl: process.env.WHATSAPP_API_URL,
      token: process.env.WHATSAPP_API_TOKEN,
      phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID
    };
  }

  // Universal Notification Method
  async sendNotification(notification) {
    const {
      userId,
      type,
      title,
      message,
      channels = ['realtime'],
      data = {},
      priority = 'medium',
      template = null
    } = notification;

    const user = await this.getUserDetails(userId);
    if (!user) {
      console.error(`User ${userId} not found for notification`);
      return;
    }

    const results = {};

    // Real-time notification (Socket.IO)
    if (channels.includes('realtime')) {
      results.realtime = await this.sendRealtimeNotification(user, {
        type, title, message, data, priority
      });
    }

    // Email notification
    if (channels.includes('email') && user.email) {
      results.email = await this.sendEmailNotification(user, {
        type, title, message, data, template
      });
    }

    // SMS notification
    if (channels.includes('sms') && user.phone) {
      results.sms = await this.sendSMSNotification(user, {
        type, title, message, data
      });
    }

    // WhatsApp notification
    if (channels.includes('whatsapp') && user.whatsapp) {
      results.whatsapp = await this.sendWhatsAppNotification(user, {
        type, title, message, data, template
      });
    }

    // Push notification (for mobile apps)
    if (channels.includes('push') && user.pushTokens) {
      results.push = await this.sendPushNotification(user, {
        type, title, message, data
      });
    }

    // Store notification in database
    await this.storeNotification(userId, notification, results);

    return results;
  }

  // Real-time Notifications
  async sendRealtimeNotification(user, notification) {
    try {
      await this.socketServer.sendNotification(user.id, {
        id: this.generateNotificationId(),
        ...notification,
        timestamp: new Date().toISOString()
      });
      return { success: true, channel: 'realtime' };
    } catch (error) {
      console.error('Real-time notification failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Email Notifications
  async sendEmailNotification(user, notification) {
    try {
      const { type, title, message, data, template } = notification;
      
      let htmlContent;
      if (template) {
        htmlContent = await this.renderEmailTemplate(template, { user, data, title, message });
      } else {
        htmlContent = this.getDefaultEmailTemplate(title, message, user);
      }

      const mailOptions = {
        from: process.env.FROM_EMAIL || 'noreply@fixzit.com',
        to: user.email,
        subject: title,
        html: htmlContent,
        text: message // Fallback plain text
      };

      await this.emailTransporter.sendMail(mailOptions);
      return { success: true, channel: 'email' };
    } catch (error) {
      console.error('Email notification failed:', error);
      return { success: false, error: error.message };
    }
  }

  // SMS Notifications
  async sendSMSNotification(user, notification) {
    if (!this.twilioClient) {
      return { success: false, error: 'SMS service not configured' };
    }

    try {
      const { title, message } = notification;
      const smsBody = `${title}\n\n${message}`;

      await this.twilioClient.messages.create({
        body: smsBody,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: user.phone
      });

      return { success: true, channel: 'sms' };
    } catch (error) {
      console.error('SMS notification failed:', error);
      return { success: false, error: error.message };
    }
  }

  // WhatsApp Notifications
  async sendWhatsAppNotification(user, notification) {
    if (!this.whatsappConfig.apiUrl) {
      return { success: false, error: 'WhatsApp service not configured' };
    }

    try {
      const { title, message, template } = notification;
      
      let payload;
      if (template) {
        payload = await this.buildWhatsAppTemplate(template, user, notification);
      } else {
        payload = {
          messaging_product: 'whatsapp',
          to: user.whatsapp.replace('+', ''),
          type: 'text',
          text: {
            body: `*${title}*\n\n${message}`
          }
        };
      }

      const response = await axios.post(
        `${this.whatsappConfig.apiUrl}/${this.whatsappConfig.phoneNumberId}/messages`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${this.whatsappConfig.token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return { success: true, channel: 'whatsapp', messageId: response.data.messages[0].id };
    } catch (error) {
      console.error('WhatsApp notification failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Push Notifications (for mobile apps)
  async sendPushNotification(user, notification) {
    try {
      const { title, message, data } = notification;
      
      // Using Firebase Cloud Messaging (FCM)
      const fcmPayload = {
        registration_ids: user.pushTokens,
        notification: {
          title,
          body: message,
          icon: '/icons/icon-192x192.png',
          badge: '/icons/badge-icon.png',
          sound: 'default'
        },
        data: {
          ...data,
          click_action: this.getNotificationAction(notification.type)
        }
      };

      const response = await axios.post(
        'https://fcm.googleapis.com/fcm/send',
        fcmPayload,
        {
          headers: {
            'Authorization': `key=${process.env.FCM_SERVER_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return { success: true, channel: 'push', response: response.data };
    } catch (error) {
      console.error('Push notification failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Notification Templates
  getDefaultEmailTemplate(title, message, user) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #0078D4 0%, #00BCF2 100%); color: white; padding: 30px; text-align: center; }
          .content { padding: 30px; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 14px; color: #666; }
          .button { display: inline-block; padding: 12px 24px; background: #0078D4; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Fixzit Enterprise</h1>
            <h2>${title}</h2>
          </div>
          <div class="content">
            <p>Hello ${user.name || 'User'},</p>
            <p>${message}</p>
            <a href="${process.env.FRONTEND_URL}/dashboard" class="button">View Dashboard</a>
          </div>
          <div class="footer">
            <p>© 2025 Fixzit Enterprise. All rights reserved.</p>
            <p>This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  async renderEmailTemplate(templateName, data) {
    // Implement template rendering based on your template engine
    const templates = {
      'work_order_assigned': this.getWorkOrderAssignedTemplate(data),
      'payment_received': this.getPaymentReceivedTemplate(data),
      'maintenance_reminder': this.getMaintenanceReminderTemplate(data),
      'lease_expiry': this.getLeaseExpiryTemplate(data)
    };

    return templates[templateName] || this.getDefaultEmailTemplate(data.title, data.message, data.user);
  }

  getWorkOrderAssignedTemplate(data) {
    const { user, workOrder } = data;
    return `
      <div class="work-order-notification">
        <h2>New Work Order Assigned</h2>
        <p>Hello ${user.name},</p>
        <p>A new work order has been assigned to you:</p>
        <div class="work-order-details">
          <p><strong>Work Order ID:</strong> #${workOrder.id}</p>
          <p><strong>Property:</strong> ${workOrder.property}</p>
          <p><strong>Priority:</strong> ${workOrder.priority}</p>
          <p><strong>Description:</strong> ${workOrder.description}</p>
          <p><strong>Due Date:</strong> ${workOrder.dueDate}</p>
        </div>
        <a href="${process.env.FRONTEND_URL}/work-orders/${workOrder.id}" class="button">View Work Order</a>
      </div>
    `;
  }

  async buildWhatsAppTemplate(templateName, user, notification) {
    // WhatsApp Business API templates
    const templates = {
      'work_order_update': {
        messaging_product: 'whatsapp',
        to: user.whatsapp.replace('+', ''),
        type: 'template',
        template: {
          name: 'work_order_update',
          language: { code: 'en_US' },
          components: [
            {
              type: 'body',
              parameters: [
                { type: 'text', text: notification.data.workOrderId },
                { type: 'text', text: notification.data.status }
              ]
            }
          ]
        }
      }
    };

    return templates[templateName];
  }

  getNotificationAction(type) {
    const actions = {
      'work_order_update': '/work-orders',
      'payment_received': '/finance',
      'maintenance_reminder': '/properties',
      'lease_expiry': '/tenants',
      'system_alert': '/dashboard'
    };

    return actions[type] || '/dashboard';
  }

  // Bulk Notifications
  async sendBulkNotification(userIds, notification) {
    const results = [];
    
    for (const userId of userIds) {
      try {
        const result = await this.sendNotification({
          userId,
          ...notification
        });
        results.push({ userId, ...result });
      } catch (error) {
        results.push({ userId, success: false, error: error.message });
      }
    }

    return results;
  }

  // Scheduled Notifications
  async scheduleNotification(notification, sendAt) {
    // Store in database with scheduled time
    await this.storeScheduledNotification(notification, sendAt);
    
    // Set up timer if within reasonable time frame (e.g., next 24 hours)
    const delay = new Date(sendAt).getTime() - Date.now();
    if (delay > 0 && delay < 24 * 60 * 60 * 1000) {
      setTimeout(() => {
        this.sendNotification(notification);
      }, delay);
    }
  }

  // Notification Preferences
  async getUserNotificationPreferences(userId) {
    // Get from database
    return {
      email: true,
      sms: false,
      whatsapp: true,
      push: true,
      realtime: true,
      workOrders: true,
      payments: true,
      maintenance: true,
      marketing: false
    };
  }

  async updateUserNotificationPreferences(userId, preferences) {
    // Update in database
    console.log(`Updating notification preferences for user ${userId}:`, preferences);
  }

  // Utility Methods
  generateNotificationId() {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async getUserDetails(userId) {
    // Implement user lookup from your database
    return {
      id: userId,
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+966501234567',
      whatsapp: '+966501234567',
      pushTokens: ['fcm_token_1', 'fcm_token_2']
    };
  }

  async storeNotification(userId, notification, results) {
    // Store notification and delivery results in database
    console.log('Storing notification:', { userId, notification, results });
  }

  async storeScheduledNotification(notification, sendAt) {
    // Store scheduled notification in database
    console.log('Storing scheduled notification:', { notification, sendAt });
  }
}

module.exports = NotificationService;