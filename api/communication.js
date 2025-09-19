const express = require('express');
const CommunicationService = require('../lib/communication-service');

const router = express.Router();
const communicationService = new CommunicationService();

// Send email
router.post('/email', async (req, res) => {
  try {
    const {
      to,
      cc,
      bcc,
      subject,
      message,
      template,
      data,
      attachments,
      priority
    } = req.body;

    if (!to || (!subject && !template)) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: to, subject (or template)'
      });
    }

    const result = await communicationService.sendEmail({
      to,
      cc,
      bcc,
      subject,
      text: message,
      template,
      data,
      attachments,
      priority
    });

    res.json({
      success: true,
      result
    });
  } catch (error) {
    console.error('Email sending error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Send SMS
router.post('/sms', async (req, res) => {
  try {
    const { to, message, mediaUrl } = req.body;

    if (!to || !message) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: to, message'
      });
    }

    const result = await communicationService.sendSMS({
      to,
      message,
      mediaUrl
    });

    res.json({
      success: true,
      result
    });
  } catch (error) {
    console.error('SMS sending error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Send WhatsApp message
router.post('/whatsapp', async (req, res) => {
  try {
    const {
      to,
      message,
      template,
      templateData,
      mediaUrl,
      mediaType
    } = req.body;

    if (!to || (!message && !template)) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: to, message (or template)'
      });
    }

    const result = await communicationService.sendWhatsAppMessage({
      to,
      message,
      template,
      templateData,
      mediaUrl,
      mediaType
    });

    res.json({
      success: true,
      result
    });
  } catch (error) {
    console.error('WhatsApp sending error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// WhatsApp webhook
router.get('/whatsapp/webhook', (req, res) => {
  communicationService.handleWhatsAppWebhook(req, res);
});

router.post('/whatsapp/webhook', (req, res) => {
  communicationService.handleWhatsAppWebhook(req, res);
});

// Send Slack message
router.post('/slack', async (req, res) => {
  try {
    const { channel, message, attachments, blocks } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: message'
      });
    }

    const result = await communicationService.sendSlackMessage({
      channel,
      message,
      attachments,
      blocks
    });

    res.json({
      success: true,
      result
    });
  } catch (error) {
    console.error('Slack sending error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Send Telegram message
router.post('/telegram', async (req, res) => {
  try {
    const { chatId, message, parseMode } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: message'
      });
    }

    const result = await communicationService.sendTelegramMessage({
      chatId,
      message,
      parseMode
    });

    res.json({
      success: true,
      result
    });
  } catch (error) {
    console.error('Telegram sending error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Send multi-channel message
router.post('/multi-channel', async (req, res) => {
  try {
    const {
      recipients,
      message,
      subject,
      channels,
      template,
      data,
      priority
    } = req.body;

    if (!recipients || !recipients.length || !message) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: recipients, message'
      });
    }

    const results = await communicationService.sendMultiChannelMessage({
      recipients,
      message,
      subject,
      channels,
      template,
      data,
      priority
    });

    res.json({
      success: true,
      results
    });
  } catch (error) {
    console.error('Multi-channel sending error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Send bulk messages
router.post('/bulk', async (req, res) => {
  try {
    const { messages, options } = req.body;

    if (!messages || !messages.length) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: messages'
      });
    }

    const results = await communicationService.sendBulkMessages(messages, options);

    const summary = {
      total: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length
    };

    res.json({
      success: true,
      summary,
      results
    });
  } catch (error) {
    console.error('Bulk sending error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Schedule message
router.post('/schedule', async (req, res) => {
  try {
    const { message, sendAt } = req.body;

    if (!message || !sendAt) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: message, sendAt'
      });
    }

    const result = await communicationService.scheduleMessage(message, sendAt);

    res.json({
      success: true,
      result
    });
  } catch (error) {
    console.error('Message scheduling error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get analytics
router.get('/analytics', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const dateRange = {
      start: startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      end: endDate ? new Date(endDate) : new Date()
    };

    const analytics = await communicationService.getMessageAnalytics(dateRange);

    res.json({
      success: true,
      analytics,
      dateRange
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Health check
router.get('/health', async (req, res) => {
  try {
    const healthStatus = await communicationService.healthCheck();

    const overallHealthy = Object.values(healthStatus).every(
      service => service.status === 'healthy' || service.status === 'not_configured'
    );

    res.status(overallHealthy ? 200 : 503).json({
      success: overallHealthy,
      services: healthStatus,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Predefined message templates for common scenarios
router.get('/templates', (req, res) => {
  const templates = {
    work_order_assigned: {
      name: 'Work Order Assigned',
      description: 'Notification when a work order is assigned to a technician',
      channels: ['email', 'sms', 'whatsapp'],
      variables: ['assignee.name', 'workOrder.id', 'workOrder.title', 'workOrder.priority', 'workOrder.dueDate']
    },
    work_order_completed: {
      name: 'Work Order Completed',
      description: 'Notification when a work order is completed',
      channels: ['email', 'sms'],
      variables: ['customer.name', 'workOrder.id', 'workOrder.title', 'completionDate']
    },
    payment_received: {
      name: 'Payment Received',
      description: 'Confirmation when payment is received',
      channels: ['email', 'whatsapp'],
      variables: ['customer.name', 'payment.amount', 'invoice.number', 'payment.method']
    },
    payment_overdue: {
      name: 'Payment Overdue',
      description: 'Reminder for overdue payments',
      channels: ['email', 'sms', 'whatsapp'],
      variables: ['customer.name', 'invoice.number', 'invoice.amount', 'daysOverdue']
    },
    maintenance_reminder: {
      name: 'Maintenance Reminder',
      description: 'Scheduled maintenance reminders',
      channels: ['email', 'sms'],
      variables: ['property.name', 'maintenance.type', 'scheduledDate']
    },
    lease_expiry: {
      name: 'Lease Expiry Notice',
      description: 'Notification of upcoming lease expiry',
      channels: ['email', 'whatsapp'],
      variables: ['tenant.name', 'property.unit', 'lease.expiryDate', 'daysUntilExpiry']
    },
    emergency_alert: {
      name: 'Emergency Alert',
      description: 'Critical emergency notifications',
      channels: ['sms', 'whatsapp', 'slack'],
      variables: ['alert.type', 'property.name', 'alert.description', 'emergency.contact']
    },
    welcome_tenant: {
      name: 'Welcome New Tenant',
      description: 'Welcome message for new tenants',
      channels: ['email', 'whatsapp'],
      variables: ['tenant.name', 'property.name', 'property.unit', 'moveInDate', 'manager.contact']
    }
  };

  res.json({
    success: true,
    templates
  });
});

// Send predefined template message
router.post('/templates/:templateName', async (req, res) => {
  try {
    const { templateName } = req.params;
    const { recipients, data, channels } = req.body;

    if (!recipients || !recipients.length) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: recipients'
      });
    }

    // Map template names to actual templates
    const templateMap = {
      work_order_assigned: 'work-order-assigned',
      payment_received: 'payment-received',
      // Add more mappings as needed
    };

    const template = templateMap[templateName];
    if (!template) {
      return res.status(404).json({
        success: false,
        error: `Template ${templateName} not found`
      });
    }

    const results = await communicationService.sendMultiChannelMessage({
      recipients,
      template,
      data,
      channels: channels || ['email'],
      subject: data?.subject || `Notification from Fixzit Enterprise`
    });

    res.json({
      success: true,
      template: templateName,
      results
    });
  } catch (error) {
    console.error('Template sending error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;