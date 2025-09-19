const mongoose = require('mongoose');

const automationRuleSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  trigger: {
    type: {
      type: String,
      enum: ['sensor', 'time', 'event', 'manual'],
      required: true
    },
    sensorId: { type: String },
    condition: {
      type: String,
      enum: ['above', 'below', 'equals', 'between', 'changed'],
      required: true
    },
    value: { type: mongoose.Schema.Types.Mixed }, // Can be number or [min, max]
    schedule: {
      cron: String,
      timezone: String
    }
  },
  actions: [{
    type: {
      type: String,
      enum: ['notification', 'control', 'workflow', 'webhook', 'email'],
      required: true
    },
    target: String,
    parameters: { type: mongoose.Schema.Types.Mixed },
    delay: { type: Number, default: 0 } // Delay in seconds
  }],
  conditions: [{
    type: String,
    value: mongoose.Schema.Types.Mixed
  }],
  enabled: { type: Boolean, default: true },
  lastTriggered: { type: Date },
  triggerCount: { type: Number, default: 0 },
  cooldownPeriod: { type: Number, default: 0 }, // in seconds
  nextAllowedTrigger: { type: Date },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  tags: [String],
  owner: { type: String, required: true },
  logs: [{
    timestamp: Date,
    status: String,
    message: String,
    error: String
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Check if rule can be triggered based on cooldown
automationRuleSchema.methods.canTrigger = function() {
  if (!this.enabled) return false;
  if (!this.nextAllowedTrigger) return true;
  return new Date() >= this.nextAllowedTrigger;
};

// Execute the rule
automationRuleSchema.methods.execute = async function() {
  if (!this.canTrigger()) {
    return { success: false, reason: 'Cooldown period active' };
  }

  this.lastTriggered = new Date();
  this.triggerCount += 1;
  
  if (this.cooldownPeriod > 0) {
    this.nextAllowedTrigger = new Date(Date.now() + this.cooldownPeriod * 1000);
  }

  try {
    // Execute actions in sequence
    for (const action of this.actions) {
      if (action.delay > 0) {
        await new Promise(resolve => setTimeout(resolve, action.delay * 1000));
      }
      // Action execution would be implemented here
    }
    
    this.logs.push({
      timestamp: new Date(),
      status: 'success',
      message: 'Rule executed successfully'
    });
    
    await this.save();
    return { success: true };
  } catch (error) {
    this.logs.push({
      timestamp: new Date(),
      status: 'error',
      message: 'Rule execution failed',
      error: error.message
    });
    
    await this.save();
    return { success: false, error: error.message };
  }
};

module.exports = mongoose.model('AutomationRule', automationRuleSchema);