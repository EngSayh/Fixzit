const express = require('express');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');

const router = express.Router();

// Get user notifications
router.get('/', async (req, res) => {
  try {
    const userId = req.user?.id || req.query.userId;
    if (!userId) {
      return res.status(400).json({ success: false, error: 'User ID required' });
    }

    const { status = 'unread', limit = 50, offset = 0 } = req.query;
    
    const query = { 'recipient.userId': userId };
    if (status !== 'all') {
      query.status = status;
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset));

    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({
      'recipient.userId': userId,
      status: 'unread'
    });

    res.json({
      success: true,
      data: {
        notifications,
        total,
        unreadCount,
        hasMore: total > offset + notifications.length
      }
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create notification
router.post('/', async (req, res) => {
  try {
    const notification = new Notification({
      ...req.body,
      sender: {
        userId: req.user?.id,
        name: req.user?.name || 'System',
        system: !req.user
      }
    });

    await notification.save();

    // Send through requested channels
    if (req.body.channels) {
      for (const channel of req.body.channels) {
        await notification.sendThroughChannel(channel);
      }
    }

    // Log action
    await AuditLog.logAction({
      action: 'create',
      category: 'system',
      entityType: 'Notification',
      entityId: notification._id,
      user: {
        userId: req.user?.id || 'system',
        name: req.user?.name || 'System',
        email: req.user?.email
      },
      result: 'success'
    });

    res.json({ success: true, data: notification });
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Mark notification as read
router.put('/:id/read', async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) {
      return res.status(404).json({ success: false, error: 'Notification not found' });
    }

    await notification.markAsRead();
    res.json({ success: true, data: notification });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Mark multiple notifications as read
router.put('/read-multiple', async (req, res) => {
  try {
    const { notificationIds } = req.body;
    if (!Array.isArray(notificationIds)) {
      return res.status(400).json({ success: false, error: 'notificationIds must be an array' });
    }

    const result = await Notification.updateMany(
      { _id: { $in: notificationIds } },
      { 
        $set: { 
          status: 'read',
          readAt: new Date()
        }
      }
    );

    res.json({ 
      success: true, 
      data: { 
        modified: result.modifiedCount 
      }
    });
  } catch (error) {
    console.error('Error marking notifications as read:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete notification
router.delete('/:id', async (req, res) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { status: 'deleted' },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ success: false, error: 'Notification not found' });
    }

    res.json({ success: true, data: notification });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get notification preferences
router.get('/preferences', async (req, res) => {
  try {
    // This would typically fetch from a UserPreferences model
    // For now, return default preferences
    const preferences = {
      email: {
        enabled: true,
        frequency: 'immediate',
        categories: ['critical', 'workorder', 'compliance']
      },
      sms: {
        enabled: false,
        categories: ['critical']
      },
      push: {
        enabled: true,
        categories: ['all']
      },
      inApp: {
        enabled: true,
        categories: ['all']
      }
    };

    res.json({ success: true, data: preferences });
  } catch (error) {
    console.error('Error fetching preferences:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update notification preferences
router.put('/preferences', async (req, res) => {
  try {
    // This would typically update a UserPreferences model
    // For now, just acknowledge the update
    res.json({ 
      success: true, 
      data: req.body,
      message: 'Preferences updated successfully'
    });
  } catch (error) {
    console.error('Error updating preferences:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Broadcast notification (admin only)
router.post('/broadcast', async (req, res) => {
  try {
    // Check admin permission
    if (req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const { recipients, ...notificationData } = req.body;
    const notifications = [];

    // Create notification for each recipient
    for (const recipient of recipients) {
      const notification = new Notification({
        ...notificationData,
        recipient,
        sender: {
          userId: req.user.id,
          name: req.user.name,
          system: false
        }
      });
      
      await notification.save();
      notifications.push(notification);
    }

    res.json({ 
      success: true, 
      data: {
        sent: notifications.length,
        notifications: notifications.slice(0, 10) // Return first 10 for preview
      }
    });
  } catch (error) {
    console.error('Error broadcasting notification:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;