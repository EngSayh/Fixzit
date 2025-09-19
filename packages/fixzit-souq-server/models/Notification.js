const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['info', 'success', 'warning', 'error', 'alert', 'reminder'],
    default: 'info'
  },
  category: {
    type: String,
    enum: ['system', 'workorder', 'maintenance', 'compliance', 'iot', 'support', 'finance', 'general'],
    required: true
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  recipient: {
    userId: { type: mongoose.Schema.Types.ObjectId, required: true },
    name: String,
    email: String,
    role: String
  },
  sender: {
    userId: { type: mongoose.Schema.Types.ObjectId },
    name: { type: String, default: 'System' },
    system: { type: Boolean, default: true }
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['unread', 'read', 'archived', 'deleted'],
    default: 'unread'
  },
  actionRequired: { type: Boolean, default: false },
  actionUrl: String,
  actionText: String,
  metadata: {
    entityType: String, // 'workorder', 'property', 'ticket', etc.
    entityId: mongoose.Schema.Types.ObjectId,
    additionalData: mongoose.Schema.Types.Mixed
  },
  readAt: Date,
  expiresAt: Date,
  channels: [{
    type: String,
    enum: ['in-app', 'email', 'sms', 'push'],
    sentAt: Date,
    delivered: { type: Boolean, default: false },
    deliveredAt: Date,
    error: String
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Indexes
notificationSchema.index({ 'recipient.userId': 1, status: 1, createdAt: -1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Mark as read
notificationSchema.methods.markAsRead = function() {
  this.status = 'read';
  this.readAt = new Date();
  return this.save();
};

// Send through channel
notificationSchema.methods.sendThroughChannel = async function(channel) {
  const channelEntry = this.channels.find(c => c.type === channel);
  if (channelEntry) {
    channelEntry.sentAt = new Date();
    // Actual sending logic would go here
    channelEntry.delivered = true;
    channelEntry.deliveredAt = new Date();
  } else {
    this.channels.push({
      type: channel,
      sentAt: new Date(),
      delivered: true,
      deliveredAt: new Date()
    });
  }
  return this.save();
};

module.exports = mongoose.model('Notification', notificationSchema);