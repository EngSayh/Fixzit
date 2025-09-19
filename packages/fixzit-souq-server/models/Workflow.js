const mongoose = require('mongoose');

const workflowSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  type: {
    type: String,
    enum: ['approval', 'task', 'notification', 'automation', 'escalation'],
    required: true
  },
  category: {
    type: String,
    enum: ['workorder', 'purchase', 'maintenance', 'compliance', 'finance', 'hr'],
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'active', 'inactive', 'archived'],
    default: 'draft'
  },
  trigger: {
    type: {
      type: String,
      enum: ['manual', 'automatic', 'scheduled', 'event'],
      required: true
    },
    conditions: [{
      field: String,
      operator: String, // equals, greater_than, less_than, contains, etc.
      value: mongoose.Schema.Types.Mixed
    }],
    schedule: {
      cron: String,
      timezone: String
    },
    event: {
      name: String,
      source: String
    }
  },
  steps: [{
    _id: { type: mongoose.Schema.Types.ObjectId, default: mongoose.Types.ObjectId },
    name: { type: String, required: true },
    type: {
      type: String,
      enum: ['approval', 'action', 'condition', 'notification', 'wait'],
      required: true
    },
    order: { type: Number, required: true },
    config: {
      approvers: [{
        type: {
          type: String,
          enum: ['user', 'role', 'department', 'dynamic']
        },
        value: String, // userId, roleId, departmentId, or field reference
        level: Number // For multi-level approvals
      }],
      approvalType: {
        type: String,
        enum: ['any', 'all', 'sequence', 'threshold'],
        default: 'any'
      },
      threshold: Number, // For threshold approval type
      action: {
        type: String, // create_task, update_field, send_email, etc.
        parameters: mongoose.Schema.Types.Mixed
      },
      condition: {
        field: String,
        operator: String,
        value: mongoose.Schema.Types.Mixed
      },
      notification: {
        template: String,
        recipients: [mongoose.Schema.Types.Mixed]
      },
      waitTime: Number, // in minutes
      timeout: Number, // in hours
      escalation: {
        enabled: Boolean,
        after: Number, // hours
        to: mongoose.Schema.Types.Mixed
      }
    },
    nextSteps: [{
      stepId: mongoose.Schema.Types.ObjectId,
      condition: {
        result: String, // approved, rejected, timeout, etc.
        expression: String
      }
    }]
  }],
  variables: [{
    name: String,
    type: String,
    defaultValue: mongoose.Schema.Types.Mixed
  }],
  permissions: {
    create: [String], // roles that can create instances
    view: [String],
    edit: [String],
    delete: [String]
  },
  metrics: {
    totalInstances: { type: Number, default: 0 },
    activeInstances: { type: Number, default: 0 },
    completedInstances: { type: Number, default: 0 },
    avgCompletionTime: Number, // in hours
    successRate: Number // percentage
  },
  createdBy: {
    userId: mongoose.Schema.Types.ObjectId,
    name: String
  },
  updatedBy: {
    userId: mongoose.Schema.Types.ObjectId,
    name: String
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Workflow Instance Schema
const workflowInstanceSchema = new mongoose.Schema({
  workflowId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workflow', required: true },
  workflowName: String,
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'failed', 'cancelled', 'timeout'],
    default: 'pending'
  },
  currentStep: {
    stepId: mongoose.Schema.Types.ObjectId,
    name: String,
    startedAt: Date,
    status: String
  },
  context: {
    entityType: String,
    entityId: mongoose.Schema.Types.ObjectId,
    initiator: {
      userId: mongoose.Schema.Types.ObjectId,
      name: String,
      role: String
    },
    data: mongoose.Schema.Types.Mixed
  },
  variables: mongoose.Schema.Types.Mixed,
  history: [{
    stepId: mongoose.Schema.Types.ObjectId,
    stepName: String,
    action: String,
    actor: {
      userId: mongoose.Schema.Types.ObjectId,
      name: String,
      role: String
    },
    result: String,
    comments: String,
    timestamp: { type: Date, default: Date.now },
    duration: Number // in minutes
  }],
  approvals: [{
    stepId: mongoose.Schema.Types.ObjectId,
    approver: {
      userId: mongoose.Schema.Types.ObjectId,
      name: String,
      role: String
    },
    decision: {
      type: String,
      enum: ['approved', 'rejected', 'delegated']
    },
    comments: String,
    delegatedTo: {
      userId: mongoose.Schema.Types.ObjectId,
      name: String
    },
    timestamp: Date
  }],
  notifications: [{
    type: String,
    recipient: mongoose.Schema.Types.ObjectId,
    sentAt: Date,
    delivered: Boolean
  }],
  startedAt: { type: Date, default: Date.now },
  completedAt: Date,
  dueDate: Date,
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  tags: [String],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Indexes
workflowSchema.index({ category: 1, status: 1 });
workflowSchema.index({ 'trigger.type': 1, status: 1 });
workflowInstanceSchema.index({ workflowId: 1, status: 1 });
workflowInstanceSchema.index({ 'context.entityType': 1, 'context.entityId': 1 });
workflowInstanceSchema.index({ status: 1, dueDate: 1 });

// Methods
workflowInstanceSchema.methods.moveToNextStep = async function(currentStepResult) {
  const workflow = await mongoose.model('Workflow').findById(this.workflowId);
  const currentStep = workflow.steps.find(s => s._id.equals(this.currentStep.stepId));
  
  if (!currentStep) {
    throw new Error('Current step not found');
  }
  
  // Find next step based on result
  const nextStepConfig = currentStep.nextSteps.find(ns => 
    ns.condition.result === currentStepResult
  );
  
  if (!nextStepConfig) {
    // No more steps, workflow complete
    this.status = 'completed';
    this.completedAt = new Date();
    return this.save();
  }
  
  const nextStep = workflow.steps.find(s => s._id.equals(nextStepConfig.stepId));
  if (!nextStep) {
    throw new Error('Next step not found');
  }
  
  // Update current step
  this.currentStep = {
    stepId: nextStep._id,
    name: nextStep.name,
    startedAt: new Date(),
    status: 'pending'
  };
  
  return this.save();
};

const Workflow = mongoose.model('Workflow', workflowSchema);
const WorkflowInstance = mongoose.model('WorkflowInstance', workflowInstanceSchema);

module.exports = { Workflow, WorkflowInstance };